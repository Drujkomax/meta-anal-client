// ---------------------------------------------------------------------------
// Analytics service
//
// Provides the API-layer response payloads for the analytics endpoints.
// Reads from the local database (daily_ad_metrics) instead of calling Meta
// live. Falls back to triggering a background sync when no data exists yet.
// ---------------------------------------------------------------------------

import dayjs from 'dayjs';
import { AccountRecord } from './accountService';
import {
  AccountSummary,
  CampaignSummary,
  TrendPoint,
  getAccountSummary,
  getCampaignSummaries,
  getCrossAccountSummary,
  getLastSuccessfulSync,
  getTrendData,
  hasMetricsData,
} from './metricsService';
import { syncAccount } from './syncService';

// ---------------------------------------------------------------------------
// Response payload types (returned to frontend)
// ---------------------------------------------------------------------------

export interface AdsSummary {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  uniqueClicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
}

export interface AdsCampaignSummary {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

export interface AnalyticsPayload {
  account: {
    id: string;
    name: string;
    adAccountId: string;
    adAccountName?: string;
    adAccountCurrency?: string;
  };
  ads: {
    available: boolean;
    reason?: string;
    summary: AdsSummary;
    top_campaigns: AdsCampaignSummary[];
  };
  dateRange: {
    from: string;
    to: string;
  };
  lastSyncedAt: string | null;
}

export interface TrendsPayload {
  accountId: string;
  dateRange: { from: string; to: string };
  data: TrendPoint[];
}

export interface CrossAccountPayload {
  dateRange: { from: string; to: string };
  accounts: AccountSummary[];
  totals: {
    spend: number;
    impressions: number;
    reach: number;
    clicks: number;
    ctr: number;
    cpc: number;
    cpm: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptySummary(): AdsSummary {
  return {
    spend: 0,
    impressions: 0,
    reach: 0,
    clicks: 0,
    uniqueClicks: 0,
    ctr: 0,
    cpc: 0,
    cpm: 0,
    frequency: 0,
  };
}

function resolveDateRange(
  dateFrom?: string,
  dateTo?: string,
): { from: string; to: string } {
  const to = dateTo && dayjs(dateTo).isValid()
    ? dayjs(dateTo).format('YYYY-MM-DD')
    : dayjs().format('YYYY-MM-DD');

  const from = dateFrom && dayjs(dateFrom).isValid()
    ? dayjs(dateFrom).format('YYYY-MM-DD')
    : dayjs(to).subtract(29, 'day').format('YYYY-MM-DD');

  return { from, to };
}

function buildAccountMeta(account: AccountRecord) {
  return {
    id: account.id,
    name: account.name,
    adAccountId: account.ad_account_id ?? '',
    adAccountName: account.ad_account_name ?? undefined,
    adAccountCurrency: account.ad_account_currency ?? undefined,
  };
}

function campaignSummaryToPayload(c: CampaignSummary): AdsCampaignSummary {
  return {
    campaign_id: c.campaignId,
    campaign_name: c.campaignName,
    spend: Number(c.totalSpend.toFixed(2)),
    impressions: c.totalImpressions,
    reach: c.totalReach,
    clicks: c.totalClicks,
    ctr: c.avgCtr,
    cpc: c.avgCpc,
    cpm: c.avgCpm,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get analytics for a single account within a date range.
 *
 * Reads from the database. If no data exists yet (first visit), triggers
 * a synchronous sync from Meta API as a one-time bootstrap.
 */
export async function getAnalyticsForAccount(
  account: AccountRecord,
  dateFrom?: string,
  dateTo?: string,
): Promise<AnalyticsPayload> {
  const { from, to } = resolveDateRange(dateFrom, dateTo);
  const adAccountId = account.ad_account_id;
  const userAccessToken = account.user_access_token;

  // No ad account or token → unusable
  if (!adAccountId || !userAccessToken) {
    return {
      account: buildAccountMeta(account),
      ads: {
        available: false,
        reason: 'Missing ad account id or user token. Reconnect this ad account.',
        summary: emptySummary(),
        top_campaigns: [],
      },
      dateRange: { from, to },
      lastSyncedAt: null,
    };
  }

  // Check if any metrics exist; if not, trigger an initial sync
  const hasData = await hasMetricsData(account.id);
  if (!hasData) {
    try {
      await syncAccount(account);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      return {
        account: buildAccountMeta(account),
        ads: {
          available: false,
          reason: `Initial sync failed: ${message}`,
          summary: emptySummary(),
          top_campaigns: [],
        },
        dateRange: { from, to },
        lastSyncedAt: null,
      };
    }
  }

  // Read from database
  const [summary, campaigns, lastSync] = await Promise.all([
    getAccountSummary(account.id, from, to),
    getCampaignSummaries(account.id, from, to),
    getLastSuccessfulSync(account.id),
  ]);

  if (!summary) {
    return {
      account: buildAccountMeta(account),
      ads: {
        available: false,
        reason: 'No metrics data found for the selected date range.',
        summary: emptySummary(),
        top_campaigns: [],
      },
      dateRange: { from, to },
      lastSyncedAt: lastSync?.completed_at ?? null,
    };
  }

  return {
    account: buildAccountMeta(account),
    ads: {
      available: true,
      summary: {
        spend: Number(summary.totalSpend.toFixed(2)),
        impressions: summary.totalImpressions,
        reach: summary.totalReach,
        clicks: summary.totalClicks,
        uniqueClicks: summary.totalUniqueClicks,
        ctr: Number(summary.avgCtr.toFixed(2)),
        cpc: Number(summary.avgCpc.toFixed(4)),
        cpm: Number(summary.avgCpm.toFixed(2)),
        frequency: Number(summary.avgFrequency.toFixed(2)),
      },
      top_campaigns: campaigns.map(campaignSummaryToPayload),
    },
    dateRange: { from, to },
    lastSyncedAt: lastSync?.completed_at ?? null,
  };
}

/**
 * Get daily trend data for a single account.
 */
export async function getTrendsForAccount(
  account: AccountRecord,
  dateFrom?: string,
  dateTo?: string,
): Promise<TrendsPayload> {
  const { from, to } = resolveDateRange(dateFrom, dateTo);

  return {
    accountId: account.id,
    dateRange: { from, to },
    data: await getTrendData(account.id, from, to),
  };
}

/**
 * Get aggregated metrics across multiple accounts.
 */
export async function getCrossAccountAnalytics(
  accounts: AccountRecord[],
  dateFrom?: string,
  dateTo?: string,
): Promise<CrossAccountPayload> {
  const { from, to } = resolveDateRange(dateFrom, dateTo);
  const accountIds = accounts.map((a) => a.id);
  const summaries = await getCrossAccountSummary(accountIds, from, to);

  // Aggregate totals
  let totalSpend = 0;
  let totalImpressions = 0;
  let totalReach = 0;
  let totalClicks = 0;

  for (const s of summaries) {
    totalSpend += s.totalSpend;
    totalImpressions += s.totalImpressions;
    totalReach += s.totalReach;
    totalClicks += s.totalClicks;
  }

  return {
    dateRange: { from, to },
    accounts: summaries,
    totals: {
      spend: Number(totalSpend.toFixed(2)),
      impressions: totalImpressions,
      reach: totalReach,
      clicks: totalClicks,
      ctr: totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
      cpc: totalClicks > 0 ? Number((totalSpend / totalClicks).toFixed(4)) : 0,
      cpm: totalImpressions > 0 ? Number(((totalSpend / totalImpressions) * 1000).toFixed(2)) : 0,
    },
  };
}
