// ---------------------------------------------------------------------------
// Meta Graph API HTTP client
//
// Responsibilities:
//   1. OAuth token exchange (short → long-lived)
//   2. Fetch user profile, ad accounts
//   3. Fetch ad insights with expanded fields and daily granularity
//   4. Adaptive rate-limit management based on response headers
//   5. Per-account request throttling via Bottleneck
// ---------------------------------------------------------------------------

import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import Bottleneck from 'bottleneck';
import createHttpError from 'http-errors';
import { env } from '../config/env';
import {
  MetaAdAccountsResponse,
  MetaAdInsightsResponse,
  MetaAdsResponse,
  MetaAdSetsResponse,
  MetaCampaignsResponse,
  MetaRateLimitInfo,
} from '../types/meta';
import { MetaApiError, type MetaErrorBody } from './metaErrors';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * All fields we request from the Insights API.
 * Adding a new metric? Append it here AND update MetaAdInsightRow in types/meta.ts.
 */
const INSIGHTS_FIELDS = [
  'campaign_id',
  'campaign_name',
  'adset_id',
  'adset_name',
  'ad_id',
  'ad_name',
  'impressions',
  'clicks',
  'spend',
  'ctr',
  'cpc',
  'cpm',
  'reach',
  'frequency',
  'unique_clicks',
  'actions',
  'action_values',
  'cost_per_action_type',
  'purchase_roas',
].join(',');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface MetaUserProfile {
  id: string;
  name: string;
}

export interface InsightsRequestOptions {
  /** 'campaign' | 'adset' | 'ad' — determines granularity of returned rows */
  level?: 'campaign' | 'adset' | 'ad';
  /** ISO date string YYYY-MM-DD. If provided, time_range is used instead of date_preset. */
  since?: string;
  /** ISO date string YYYY-MM-DD */
  until?: string;
  /** Shorthand date preset from Meta (e.g. 'last_30d'). Ignored when since/until are set. */
  datePreset?: string;
  /** Max rows per page (default 500) */
  limit?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Meta retryable error codes: rate-limit (4,17,32,613) + transient 5xx */
function isRetryableMetaError(error: AxiosError): boolean {
  const status = error.response?.status;
  const code = (error.response?.data as { error?: { code?: number } } | undefined)?.error?.code;
  return (
    status === 429 ||
    (status !== undefined && status >= 500) ||
    [4, 17, 32, 613].includes(code ?? -1)
  );
}

/**
 * Parse the x-business-use-case-usage header (JSON string) to extract the
 * highest usage percentages across all business accounts in the response.
 */
function parseRateLimitHeader(headers: Record<string, unknown>): MetaRateLimitInfo | null {
  const raw =
    (headers['x-business-use-case-usage'] as string) ||
    (headers['x-ad-account-usage'] as string);

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    // x-business-use-case-usage is keyed by BM id → array of usage objects
    // x-ad-account-usage is a single object with acc_id_util_pct
    if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      // Handle x-ad-account-usage (simpler format)
      if ('acc_id_util_pct' in parsed) {
        const pct = Number(parsed.acc_id_util_pct) || 0;
        return {
          callCountPercent: pct,
          totalCpuTimePercent: 0,
          totalTimePercent: 0,
          estimatedTimeToRegainAccess: 0,
        };
      }

      // Handle x-business-use-case-usage (complex format)
      let maxCallCount = 0;
      let maxCpuTime = 0;
      let maxTotalTime = 0;
      let maxEta = 0;

      for (const entries of Object.values(parsed) as Array<Array<Record<string, number>>>) {
        if (!Array.isArray(entries)) continue;
        for (const entry of entries) {
          maxCallCount = Math.max(maxCallCount, entry.call_count ?? 0);
          maxCpuTime = Math.max(maxCpuTime, entry.total_cputime ?? 0);
          maxTotalTime = Math.max(maxTotalTime, entry.total_time ?? 0);
          maxEta = Math.max(maxEta, entry.estimated_time_to_regain_access ?? 0);
        }
      }

      return {
        callCountPercent: maxCallCount,
        totalCpuTimePercent: maxCpuTime,
        totalTimePercent: maxTotalTime,
        estimatedTimeToRegainAccess: maxEta,
      };
    }
  } catch {
    // Malformed header — ignore silently
  }

  return null;
}

// ---------------------------------------------------------------------------
// MetaClient
// ---------------------------------------------------------------------------

export class MetaClient {
  private readonly http: AxiosInstance;

  /**
   * Per-account Bottleneck instances.
   * Each ad account gets its own rate-limiter so a slow/throttled account
   * does not block requests for other accounts.
   */
  private readonly accountLimiters = new Map<string, Bottleneck>();

  /** Global limiter for non-account-specific requests (login, profile, etc.) */
  private readonly globalLimiter = new Bottleneck({
    maxConcurrent: 4,
    minTime: 150,
  });

  /** Latest rate-limit info, keyed by ad account id */
  private readonly rateLimitState = new Map<string, MetaRateLimitInfo>();

  constructor(httpClient?: AxiosInstance) {
    this.http =
      httpClient ??
      axios.create({
        baseURL: `https://graph.facebook.com/${env.META_GRAPH_VERSION}`,
        timeout: 30_000,
      });
  }

  // -------------------------------------------------------------------------
  // OAuth helpers (unchanged)
  // -------------------------------------------------------------------------

  buildLoginUrl(state: string, redirectUri: string = env.META_REDIRECT_URI): string {
    const loginConfigId = env.META_LOGIN_CONFIG_ID?.trim();
    const params = new URLSearchParams({
      client_id: env.META_APP_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
    });

    if (loginConfigId) {
      params.set('config_id', loginConfigId);
    } else {
      params.set('scope', env.META_PERMISSIONS);
    }

    return `https://www.facebook.com/${env.META_GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
  }

  async exchangeCodeForShortToken(
    code: string,
    redirectUri: string = env.META_REDIRECT_URI,
  ): Promise<TokenResponse> {
    const { data } = await this.http.get<TokenResponse>('/oauth/access_token', {
      params: {
        client_id: env.META_APP_ID,
        client_secret: env.META_APP_SECRET,
        redirect_uri: redirectUri,
        code,
      },
    });
    return data;
  }

  async exchangeForLongLivedUserToken(shortToken: string): Promise<TokenResponse> {
    const { data } = await this.http.get<TokenResponse>('/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: env.META_APP_ID,
        client_secret: env.META_APP_SECRET,
        fb_exchange_token: shortToken,
      },
    });
    return data;
  }

  // -------------------------------------------------------------------------
  // User / account discovery
  // -------------------------------------------------------------------------

  async getUserProfile(userAccessToken: string): Promise<MetaUserProfile> {
    return this.get<MetaUserProfile>('/me', userAccessToken, { fields: 'id,name' });
  }

  async getUserAdAccounts(userAccessToken: string): Promise<MetaAdAccountsResponse> {
    return this.get<MetaAdAccountsResponse>('/me/adaccounts', userAccessToken, {
      fields: 'id,account_id,name,account_status,currency,timezone_name,business{id,name}',
      limit: 200,
    });
  }

  // -------------------------------------------------------------------------
  // Insights — the core analytics endpoint
  // -------------------------------------------------------------------------

  /**
   * Fetch insights for an ad account with full field list and daily granularity.
   *
   * Uses `time_increment=1` so Meta returns one row per entity per day,
   * which maps perfectly to the daily_ad_metrics table.
   */
  async getAdInsights(
    adAccountId: string,
    userAccessToken: string,
    options: InsightsRequestOptions = {},
  ): Promise<MetaAdInsightsResponse> {
    const normalizedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const endpoint = `/${normalizedId}/insights`;

    const {
      level = 'campaign',
      since,
      until,
      datePreset = 'last_30d',
      limit = 500,
    } = options;

    const params: Record<string, unknown> = {
      fields: INSIGHTS_FIELDS,
      level,
      time_increment: 1, // daily granularity — one row per entity per day
      limit,
    };

    // Prefer explicit date range over preset
    if (since && until) {
      params.time_range = JSON.stringify({ since, until });
    } else {
      params.date_preset = datePreset;
    }

    // Paginate through all results
    const mergedData: MetaAdInsightsResponse['data'] = [];
    let afterCursor: string | undefined;

    do {
      const response = await this.getWithHeaders<MetaAdInsightsResponse>(
        endpoint,
        userAccessToken,
        {
          ...params,
          ...(afterCursor ? { after: afterCursor } : {}),
        },
        normalizedId,
      );

      mergedData.push(...response.data.data);
      afterCursor = response.data.paging?.cursors?.after;
    } while (afterCursor);

    return { data: mergedData };
  }

  // -------------------------------------------------------------------------
  // Hierarchy Metadata (Campaigns, Ad Sets, Ads)
  // -------------------------------------------------------------------------

  async getCampaigns(
    adAccountId: string,
    userAccessToken: string,
  ): Promise<MetaCampaignsResponse> {
    const normalizedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const endpoint = `/${normalizedId}/campaigns`;

    const mergedData: MetaCampaignsResponse['data'] = [];
    let afterCursor: string | undefined;

    do {
      const response = await this.getWithHeaders<MetaCampaignsResponse>(
        endpoint,
        userAccessToken,
        {
          fields: 'id,name,objective,status,effective_status,daily_budget,lifetime_budget,start_time,stop_time',
          limit: 500,
          ...(afterCursor ? { after: afterCursor } : {}),
        },
        normalizedId,
      );

      mergedData.push(...response.data.data);
      afterCursor = response.data.paging?.cursors?.after;
    } while (afterCursor);

    return { data: mergedData };
  }

  async getAdSets(
    adAccountId: string,
    userAccessToken: string,
    campaignId?: string,
  ): Promise<MetaAdSetsResponse> {
    const normalizedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    // Fetch directly from campaign if provided, otherwise from ad account
    const parentId = campaignId || normalizedId;
    const endpoint = `/${parentId}/adsets`;

    const mergedData: MetaAdSetsResponse['data'] = [];
    let afterCursor: string | undefined;

    do {
      const response = await this.getWithHeaders<MetaAdSetsResponse>(
        endpoint,
        userAccessToken,
        {
          fields: 'id,campaign_id,name,optimization_goal,billing_event,daily_budget,bid_amount,targeting,status,effective_status',
          limit: 500,
          ...(afterCursor ? { after: afterCursor } : {}),
        },
        normalizedId,
      );

      mergedData.push(...response.data.data);
      afterCursor = response.data.paging?.cursors?.after;
    } while (afterCursor);

    return { data: mergedData };
  }

  async getAds(
    adAccountId: string,
    userAccessToken: string,
    adSetId?: string,
  ): Promise<MetaAdsResponse> {
    const normalizedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const parentId = adSetId || normalizedId;
    const endpoint = `/${parentId}/ads`;

    const mergedData: MetaAdsResponse['data'] = [];
    let afterCursor: string | undefined;

    do {
      const response = await this.getWithHeaders<MetaAdsResponse>(
        endpoint,
        userAccessToken,
        {
          fields: 'id,adset_id,campaign_id,name,status,effective_status,creative{id}',
          limit: 500,
          ...(afterCursor ? { after: afterCursor } : {}),
        },
        normalizedId,
      );

      mergedData.push(...response.data.data);
      afterCursor = response.data.paging?.cursors?.after;
    } while (afterCursor);

    return { data: mergedData };
  }

  // -------------------------------------------------------------------------
  // Write operations (campaigns / ad sets / ads) + lookups for the wizard
  // -------------------------------------------------------------------------

  private normalizeAccountId(adAccountId: string): string {
    return adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  }

  /** POST/DELETE through the per-account limiter, with retry + Meta error mapping. */
  private async writeRequest<T>(
    method: 'post' | 'delete',
    endpoint: string,
    accessToken: string,
    data: Record<string, unknown>,
    adAccountId: string,
    maxRetries = 2,
  ): Promise<T> {
    const limiter = this.getLimiterForAccount(adAccountId);

    const execute = async (): Promise<T> => {
      let attempt = 0;
      while (attempt <= maxRetries) {
        try {
          const params = { ...data, access_token: accessToken };
          const response =
            method === 'post'
              ? await this.http.post<T>(endpoint, null, { params })
              : await this.http.delete<T>(endpoint, { params });

          const info = parseRateLimitHeader(response.headers as Record<string, unknown>);
          if (info) {
            this.rateLimitState.set(adAccountId, info);
            this.adjustLimiterSpeed(limiter, info);
          }
          return response.data;
        } catch (error) {
          const axiosError = error as AxiosError;
          const canRetry = isRetryableMetaError(axiosError) && attempt < maxRetries;
          if (!canRetry) {
            const body = (axiosError.response?.data as { error?: MetaErrorBody } | undefined)?.error;
            throw new MetaApiError(body, axiosError);
          }
          await new Promise((resolve) => setTimeout(resolve, 600 * 2 ** attempt));
          attempt += 1;
        }
      }
      throw new MetaApiError({ message: 'Meta API write failed after retries' });
    };

    return limiter.schedule(execute);
  }

  async createCampaign(
    adAccountId: string,
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<{ id: string }> {
    const id = this.normalizeAccountId(adAccountId);
    return this.writeRequest('post', `/${id}/campaigns`, accessToken, payload, id);
  }

  async createAdSet(
    adAccountId: string,
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<{ id: string }> {
    const id = this.normalizeAccountId(adAccountId);
    return this.writeRequest('post', `/${id}/adsets`, accessToken, payload, id);
  }

  async createAdCreativeFromPost(
    adAccountId: string,
    accessToken: string,
    payload: { name: string; object_story_id: string },
  ): Promise<{ id: string }> {
    const id = this.normalizeAccountId(adAccountId);
    return this.writeRequest('post', `/${id}/adcreatives`, accessToken, payload as Record<string, unknown>, id);
  }

  async createAd(
    adAccountId: string,
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<{ id: string }> {
    const id = this.normalizeAccountId(adAccountId);
    return this.writeRequest('post', `/${id}/ads`, accessToken, payload, id);
  }

  async updateObject(
    objectId: string,
    accessToken: string,
    adAccountId: string,
    fields: Record<string, unknown>,
  ): Promise<{ success?: boolean }> {
    const id = this.normalizeAccountId(adAccountId);
    return this.writeRequest('post', `/${objectId}`, accessToken, fields, id);
  }

  async deleteObject(
    objectId: string,
    accessToken: string,
    adAccountId: string,
  ): Promise<{ success?: boolean }> {
    const id = this.normalizeAccountId(adAccountId);
    return this.writeRequest('delete', `/${objectId}`, accessToken, {}, id);
  }

  async getPages(
    accessToken: string,
  ): Promise<{ data: Array<{ id: string; name: string; access_token?: string }> }> {
    const { data } = await this.http.get('/me/accounts', {
      params: { fields: 'id,name,access_token', limit: 200, access_token: accessToken },
    });
    return data;
  }

  async getPromotablePosts(
    pageId: string,
    accessToken: string,
  ): Promise<{ data: Array<{ id: string; message?: string; created_time?: string }> }> {
    const { data } = await this.http.get(`/${pageId}/ads_posts`, {
      params: { fields: 'id,message,created_time', limit: 100, access_token: accessToken },
    });
    return data;
  }

  async getAdPixels(
    adAccountId: string,
    accessToken: string,
  ): Promise<{ data: Array<{ id: string; name: string }> }> {
    const id = this.normalizeAccountId(adAccountId);
    const { data } = await this.http.get(`/${id}/adspixels`, {
      params: { fields: 'id,name', access_token: accessToken },
    });
    return data;
  }

  async getCustomAudiences(
    adAccountId: string,
    accessToken: string,
  ): Promise<{ data: Array<{ id: string; name: string; subtype?: string; approximate_count?: number }> }> {
    const id = this.normalizeAccountId(adAccountId);
    const { data } = await this.http.get(`/${id}/customaudiences`, {
      params: { fields: 'id,name,subtype,approximate_count', limit: 200, access_token: accessToken },
    });
    return data;
  }

  async getSavedAudiences(
    adAccountId: string,
    accessToken: string,
  ): Promise<{ data: Array<{ id: string; name: string }> }> {
    const id = this.normalizeAccountId(adAccountId);
    const { data } = await this.http.get(`/${id}/saved_audiences`, {
      params: { fields: 'id,name', limit: 200, access_token: accessToken },
    });
    return data;
  }

  async searchInterests(
    accessToken: string,
    q: string,
  ): Promise<{ data: Array<{ id: string; name: string; audience_size_lower_bound?: number }> }> {
    const { data } = await this.http.get('/search', {
      params: { type: 'adinterest', q, limit: 25, access_token: accessToken },
    });
    return data;
  }

  async searchGeo(
    accessToken: string,
    q: string,
  ): Promise<{ data: Array<{ key: string; name: string; type: string }> }> {
    const { data } = await this.http.get('/search', {
      params: {
        type: 'adgeolocation',
        q,
        location_types: JSON.stringify(['country', 'region', 'city']),
        access_token: accessToken,
      },
    });
    return data;
  }

  async getDeliveryEstimate(
    adAccountId: string,
    accessToken: string,
    targeting: Record<string, unknown>,
    optimizationGoal: string,
  ): Promise<{ data: unknown[] }> {
    const id = this.normalizeAccountId(adAccountId);
    const { data } = await this.http.get(`/${id}/delivery_estimate`, {
      params: {
        targeting_spec: JSON.stringify(targeting),
        optimization_goal: optimizationGoal,
        access_token: accessToken,
      },
    });
    return data;
  }

  // -------------------------------------------------------------------------
  // Rate-limit state (public for sync orchestrator)
  // -------------------------------------------------------------------------

  /** Returns the latest known rate-limit info for an ad account, or null. */
  getRateLimitInfo(adAccountId: string): MetaRateLimitInfo | null {
    return this.rateLimitState.get(adAccountId) ?? null;
  }

  /** Check if an ad account is currently near its rate limit. */
  isNearRateLimit(adAccountId: string, threshold = 75): boolean {
    const info = this.rateLimitState.get(adAccountId);
    if (!info) return false;
    return (
      info.callCountPercent >= threshold ||
      info.totalCpuTimePercent >= threshold ||
      info.totalTimePercent >= threshold
    );
  }

  // -------------------------------------------------------------------------
  // Internal HTTP helpers
  // -------------------------------------------------------------------------

  /**
   * GET request routed through the global limiter. Used for non-account
   * endpoints like /me, /oauth, /me/adaccounts.
   */
  private async get<T>(
    endpoint: string,
    accessToken: string,
    params: Record<string, unknown> = {},
    maxRetries = 3,
  ): Promise<T> {
    const execute = async (): Promise<T> => {
      return this.executeWithRetry<T>(endpoint, accessToken, params, maxRetries);
    };
    return this.globalLimiter.schedule(execute);
  }

  /**
   * GET request routed through a per-account limiter. Used for Insights
   * endpoints where we also capture rate-limit headers.
   */
  private async getWithHeaders<T>(
    endpoint: string,
    accessToken: string,
    params: Record<string, unknown>,
    adAccountId: string,
    maxRetries = 3,
  ): Promise<{ data: T; rateLimitInfo: MetaRateLimitInfo | null }> {
    const limiter = this.getLimiterForAccount(adAccountId);

    const execute = async (): Promise<{ data: T; rateLimitInfo: MetaRateLimitInfo | null }> => {
      let attempt = 0;

      while (attempt <= maxRetries) {
        try {
          const response: AxiosResponse<T> = await this.http.get<T>(endpoint, {
            params: { ...params, access_token: accessToken },
          });

          // Parse & store rate-limit info from response headers
          const rateLimitInfo = parseRateLimitHeader(
            response.headers as Record<string, unknown>,
          );
          if (rateLimitInfo) {
            this.rateLimitState.set(adAccountId, rateLimitInfo);
          }

          // Dynamically adjust limiter speed based on usage
          if (rateLimitInfo) {
            this.adjustLimiterSpeed(limiter, rateLimitInfo);
          }

          return { data: response.data, rateLimitInfo };
        } catch (error) {
          const axiosError = error as AxiosError;
          const canRetry = isRetryableMetaError(axiosError) && attempt < maxRetries;

          if (!canRetry) {
            const message =
              (axiosError.response?.data as { error?: { message?: string } } | undefined)?.error
                ?.message || axiosError.message;
            throw createHttpError(502, `Meta API request failed: ${message}`);
          }

          // Exponential backoff: 600ms, 1200ms, 2400ms …
          const backoffMs = 600 * 2 ** attempt;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          attempt += 1;
        }
      }

      throw createHttpError(502, 'Meta API request failed after retries');
    };

    return limiter.schedule(execute);
  }

  /**
   * Simple retry loop for global (non-account) requests.
   */
  private async executeWithRetry<T>(
    endpoint: string,
    accessToken: string,
    params: Record<string, unknown>,
    maxRetries: number,
  ): Promise<T> {
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const { data } = await this.http.get<T>(endpoint, {
          params: { ...params, access_token: accessToken },
        });
        return data;
      } catch (error) {
        const axiosError = error as AxiosError;
        const canRetry = isRetryableMetaError(axiosError) && attempt < maxRetries;

        if (!canRetry) {
          const message =
            (axiosError.response?.data as { error?: { message?: string } } | undefined)?.error
              ?.message || axiosError.message;
          throw createHttpError(502, `Meta API request failed: ${message}`);
        }

        const backoffMs = 600 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        attempt += 1;
      }
    }

    throw createHttpError(502, 'Meta API request failed after retries');
  }

  // -------------------------------------------------------------------------
  // Per-account limiter management
  // -------------------------------------------------------------------------

  /** Get or create a Bottleneck instance for a specific ad account. */
  private getLimiterForAccount(adAccountId: string): Bottleneck {
    let limiter = this.accountLimiters.get(adAccountId);
    if (!limiter) {
      limiter = new Bottleneck({
        maxConcurrent: 2,
        minTime: 200,
        reservoir: 200,
        reservoirRefreshAmount: 200,
        reservoirRefreshInterval: 60 * 60 * 1000, // refill every hour
      });
      this.accountLimiters.set(adAccountId, limiter);
    }
    return limiter;
  }

  /**
   * Dynamically adjust the per-account limiter speed based on the latest
   * rate-limit header. As usage increases, we slow down to avoid 429s.
   */
  private adjustLimiterSpeed(limiter: Bottleneck, info: MetaRateLimitInfo): void {
    const maxPercent = Math.max(
      info.callCountPercent,
      info.totalCpuTimePercent,
      info.totalTimePercent,
    );

    let minTime: number;
    if (maxPercent >= 90) {
      minTime = 5000; // near limit — 5s between requests
    } else if (maxPercent >= 75) {
      minTime = 2000; // warning zone — 2s
    } else if (maxPercent >= 50) {
      minTime = 500;  // moderate — 500ms
    } else {
      minTime = 200;  // normal pace
    }

    limiter.updateSettings({ minTime });
  }
}

/** Singleton instance used throughout the application */
export const metaClient = new MetaClient();
