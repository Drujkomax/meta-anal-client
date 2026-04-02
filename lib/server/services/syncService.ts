// ---------------------------------------------------------------------------
// Sync orchestrator
//
// Coordinates the full pipeline:
//   Meta API (fetch) → parse rows → upsert to daily_ad_metrics → log result
//
// This service is called by the cron job and can also be triggered manually
// via the API for on-demand refresh.
// ---------------------------------------------------------------------------

import dayjs from 'dayjs';
import { AccountRecord } from './accountService';
import { syncCampaignHierarchy } from './hierarchyService';
import { metaClient } from './metaClient';
import {
  MetricUpsertInput,
  completeSyncLog,
  createSyncLog,
  failSyncLog,
  getLastSuccessfulSync,
  upsertDailyMetrics,
} from './metricsService';
import { MetaAdInsightRow } from '../types/meta';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safely parse a string to a number, returning 0 for invalid input. */
function toNum(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * Convert a raw Meta Insights row into our database-ready upsert input.
 */
function toMetricInput(
  row: MetaAdInsightRow,
  accountId: string,
  adAccountId: string,
  currency: string,
): MetricUpsertInput | null {
  const campaignId = row.campaign_id;
  const date = row.date_start;

  // campaign_id and date_start are mandatory for a valid row
  if (!campaignId || !date) return null;

  return {
    accountId,
    adAccountId,
    campaignId,
    campaignName: row.campaign_name?.trim() || 'Unknown campaign',
    adsetId: row.adset_id ?? null,
    adsetName: row.adset_name ?? null,
    adId: row.ad_id ?? null,
    adName: row.ad_name ?? null,
    date,
    spend: toNum(row.spend),
    impressions: Math.round(toNum(row.impressions)),
    reach: Math.round(toNum(row.reach)),
    clicks: Math.round(toNum(row.clicks)),
    uniqueClicks: Math.round(toNum(row.unique_clicks)),
    ctr: toNum(row.ctr),
    cpc: toNum(row.cpc),
    cpm: toNum(row.cpm),
    frequency: toNum(row.frequency),
    actions: row.actions ?? [],
    actionValues: row.action_values ?? [],
    costPerAction: row.cost_per_action_type ?? [],
    purchaseRoas: row.purchase_roas ?? [],
    currency,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SyncResult {
  accountId: string;
  accountName: string;
  status: 'completed' | 'failed' | 'skipped';
  rowsSynced: number;
  errorMessage?: string;
  durationMs: number;
}

/**
 * Sync a single account: fetch insights from Meta and persist to database.
 *
 * Performs an incremental sync when possible (only fetches data since last
 * successful sync), otherwise does a full 30-day sync.
 */
export async function syncAccount(account: AccountRecord): Promise<SyncResult> {
  const start = Date.now();
  const adAccountId = account.ad_account_id;
  const userAccessToken = account.user_access_token;

  // Validate required fields
  if (!adAccountId || !userAccessToken) {
    return {
      accountId: account.id,
      accountName: account.name,
      status: 'skipped',
      rowsSynced: 0,
      errorMessage: 'Missing ad_account_id or user_access_token',
      durationMs: Date.now() - start,
    };
  }

  // Check if we're near the rate limit for this account
  if (metaClient.isNearRateLimit(adAccountId, 85)) {
    return {
      accountId: account.id,
      accountName: account.name,
      status: 'skipped',
      rowsSynced: 0,
      errorMessage: 'Rate limit too high, skipping this cycle',
      durationMs: Date.now() - start,
    };
  }

  // Determine sync date range
  const lastSync = await getLastSuccessfulSync(account.id);
  let syncType: 'full' | 'incremental' = 'full';
  let since: string;
  const until = dayjs().format('YYYY-MM-DD');

  if (lastSync?.date_to) {
    // Incremental: re-sync from 2 days before last sync (Meta can revise recent data)
    since = dayjs(lastSync.date_to).subtract(2, 'day').format('YYYY-MM-DD');
    syncType = 'incremental';
  } else {
    // Full: last 30 days
    since = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
  }

  // Create sync log entry
  const logId = await createSyncLog(account.id, syncType, since, until);

  try {
    // Fetch insights from Meta API
    const insights = await metaClient.getAdInsights(adAccountId, userAccessToken, {
      level: 'campaign',
      since,
      until,
    });

    // Convert to upsert inputs
    const currency = account.ad_account_currency || 'USD';
    const upsertRows: MetricUpsertInput[] = [];

    for (const row of insights.data) {
      const input = toMetricInput(row, account.id, adAccountId, currency);
      if (input) upsertRows.push(input);
    }

    // Persist to database
    const rowsSynced = await upsertDailyMetrics(upsertRows);

    // Sync hierarchy metadata (campaigns, ad sets, ads)
    await syncCampaignHierarchy(account);

    // Mark sync as completed
    await completeSyncLog(logId, rowsSynced);

    return {
      accountId: account.id,
      accountName: account.name,
      status: 'completed',
      rowsSynced,
      durationMs: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await failSyncLog(logId, message);

    return {
      accountId: account.id,
      accountName: account.name,
      status: 'failed',
      rowsSynced: 0,
      errorMessage: message,
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Sync all accounts. Called by the cron job.
 *
 * Processes accounts sequentially to respect Meta's per-app rate limits.
 * Skips accounts that are currently near their rate limit ceiling.
 */
export async function syncAllAccounts(
  accounts: AccountRecord[],
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  for (const account of accounts) {
    try {
      const result = await syncAccount(account);
      results.push(result);

      console.log(
        `[sync] ${result.accountName}: ${result.status} ` +
        `(${result.rowsSynced} rows, ${result.durationMs}ms)` +
        (result.errorMessage ? ` — ${result.errorMessage}` : ''),
      );

      // Small delay between accounts to spread load
      await new Promise((r) => setTimeout(r, 500));
    } catch (error) {
      console.error(`[sync] Fatal error syncing account ${account.id}:`, error);
      results.push({
        accountId: account.id,
        accountName: account.name,
        status: 'failed',
        rowsSynced: 0,
        errorMessage: error instanceof Error ? error.message : 'Fatal error',
        durationMs: 0,
      });
    }
  }

  return results;
}
