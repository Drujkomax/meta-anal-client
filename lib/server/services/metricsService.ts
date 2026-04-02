// ---------------------------------------------------------------------------
// Metrics persistence service
//
// Responsible for writing and reading daily_ad_metrics rows.
// This is the data access layer — no Meta API calls happen here.
// ---------------------------------------------------------------------------

import { query } from '../config/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyMetricRow {
  id: number;
  account_id: string;
  ad_account_id: string;
  campaign_id: string;
  campaign_name: string;
  adset_id: string | null;
  adset_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  unique_clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  actions: unknown[];
  action_values: unknown[];
  cost_per_action: unknown[];
  purchase_roas: unknown[];
  currency: string;
  synced_at: string;
}

export interface MetricUpsertInput {
  accountId: string;
  adAccountId: string;
  campaignId: string;
  campaignName: string;
  adsetId?: string | null;
  adsetName?: string | null;
  adId?: string | null;
  adName?: string | null;
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  uniqueClicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  actions: unknown[];
  actionValues: unknown[];
  costPerAction: unknown[];
  purchaseRoas: unknown[];
  currency: string;
}

export interface AccountSummary {
  accountId: string;
  adAccountId: string;
  totalSpend: number;
  totalImpressions: number;
  totalReach: number;
  totalClicks: number;
  totalUniqueClicks: number;
  avgCtr: number;
  avgCpc: number;
  avgCpm: number;
  avgFrequency: number;
  currency: string;
}

export interface CampaignSummary {
  campaignId: string;
  campaignName: string;
  totalSpend: number;
  totalImpressions: number;
  totalReach: number;
  totalClicks: number;
  avgCtr: number;
  avgCpc: number;
  avgCpm: number;
}

export interface TrendPoint {
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

export interface SyncLogRow {
  id: number;
  account_id: string;
  sync_type: string;
  status: string;
  date_from: string | null;
  date_to: string | null;
  rows_synced: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/**
 * Bulk upsert daily metrics. Uses ON CONFLICT to update existing rows
 * when the same (account, campaign, adset, ad, date) tuple already exists.
 *
 * Processes rows in batches to avoid exceeding Postgres parameter limits.
 */
export async function upsertDailyMetrics(rows: MetricUpsertInput[]): Promise<number> {
  if (rows.length === 0) return 0;

  let total = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values: unknown[] = [];
    const placeholders: string[] = [];

    for (let j = 0; j < batch.length; j++) {
      const row = batch[j];
      const offset = j * 19;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, ` +
        `$${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, ` +
        `$${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, ` +
        `$${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, ` +
        `$${offset + 17}, $${offset + 18}, $${offset + 19})`,
      );
      values.push(
        row.accountId,
        row.adAccountId,
        row.campaignId,
        row.campaignName,
        row.adsetId ?? null,
        row.adsetName ?? null,
        row.adId ?? null,
        row.adName ?? null,
        row.date,
        row.spend,
        row.impressions,
        row.reach,
        row.clicks,
        row.uniqueClicks,
        row.ctr,
        row.cpc,
        row.cpm,
        row.frequency,
        row.currency,
      );
    }

    // Note: actions/action_values/cost_per_action/purchase_roas are handled
    // in the UPDATE clause via a separate pass to keep the batch insert manageable.
    // For the initial insert we store them as part of the default '[]'.
    const sql = `
      INSERT INTO daily_ad_metrics (
        account_id, ad_account_id, campaign_id, campaign_name,
        adset_id, adset_name, ad_id, ad_name,
        date, spend, impressions, reach,
        clicks, unique_clicks, ctr, cpc, cpm, frequency, currency
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (account_id, campaign_id, COALESCE(adset_id, ''), COALESCE(ad_id, ''), date)
      DO UPDATE SET
        campaign_name  = EXCLUDED.campaign_name,
        adset_name     = EXCLUDED.adset_name,
        ad_name        = EXCLUDED.ad_name,
        spend          = EXCLUDED.spend,
        impressions    = EXCLUDED.impressions,
        reach          = EXCLUDED.reach,
        clicks         = EXCLUDED.clicks,
        unique_clicks  = EXCLUDED.unique_clicks,
        ctr            = EXCLUDED.ctr,
        cpc            = EXCLUDED.cpc,
        cpm            = EXCLUDED.cpm,
        frequency      = EXCLUDED.frequency,
        currency       = EXCLUDED.currency,
        synced_at      = NOW()
    `;

    await query(sql, values);
    total += batch.length;
  }

  // Second pass: update JSONB columns individually (avoids huge parameter counts in batches)
  for (const row of rows) {
    if (
      row.actions.length > 0 ||
      row.actionValues.length > 0 ||
      row.costPerAction.length > 0 ||
      row.purchaseRoas.length > 0
    ) {
      await query(
        `
        UPDATE daily_ad_metrics
        SET
          actions         = $1::jsonb,
          action_values   = $2::jsonb,
          cost_per_action = $3::jsonb,
          purchase_roas   = $4::jsonb
        WHERE account_id  = $5
          AND campaign_id = $6
          AND COALESCE(adset_id, '') = COALESCE($7, '')
          AND COALESCE(ad_id, '')    = COALESCE($8, '')
          AND date = $9
        `,
        [
          JSON.stringify(row.actions),
          JSON.stringify(row.actionValues),
          JSON.stringify(row.costPerAction),
          JSON.stringify(row.purchaseRoas),
          row.accountId,
          row.campaignId,
          row.adsetId ?? null,
          row.adId ?? null,
          row.date,
        ],
      );
    }
  }

  return total;
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/**
 * Get aggregated summary for a single account over a date range.
 */
export async function getAccountSummary(
  accountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<AccountSummary | null> {
  const rows = await query<{
    ad_account_id: string;
    total_spend: string;
    total_impressions: string;
    total_reach: string;
    total_clicks: string;
    total_unique_clicks: string;
    currency: string;
  }>(
    `
    SELECT
      ad_account_id,
      SUM(spend)::TEXT            AS total_spend,
      SUM(impressions)::TEXT      AS total_impressions,
      SUM(reach)::TEXT            AS total_reach,
      SUM(clicks)::TEXT           AS total_clicks,
      SUM(unique_clicks)::TEXT    AS total_unique_clicks,
      MAX(currency)              AS currency
    FROM daily_ad_metrics
    WHERE account_id = $1
      AND date >= $2
      AND date <= $3
    GROUP BY ad_account_id
    `,
    [accountId, dateFrom, dateTo],
  );

  if (rows.length === 0) return null;

  const r = rows[0];
  const spend = Number(r.total_spend) || 0;
  const impressions = Number(r.total_impressions) || 0;
  const clicks = Number(r.total_clicks) || 0;
  const reach = Number(r.total_reach) || 0;

  return {
    accountId,
    adAccountId: r.ad_account_id,
    totalSpend: spend,
    totalImpressions: impressions,
    totalReach: reach,
    totalClicks: clicks,
    totalUniqueClicks: Number(r.total_unique_clicks) || 0,
    avgCtr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    avgCpc: clicks > 0 ? spend / clicks : 0,
    avgCpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    avgFrequency: reach > 0 ? impressions / reach : 0,
    currency: r.currency || 'USD',
  };
}

/**
 * Get top campaigns for an account in a date range, sorted by spend desc.
 */
export async function getCampaignSummaries(
  accountId: string,
  dateFrom: string,
  dateTo: string,
  limit = 20,
): Promise<CampaignSummary[]> {
  const rows = await query<{
    campaign_id: string;
    campaign_name: string;
    total_spend: string;
    total_impressions: string;
    total_reach: string;
    total_clicks: string;
  }>(
    `
    SELECT
      campaign_id,
      MAX(campaign_name)          AS campaign_name,
      SUM(spend)::TEXT            AS total_spend,
      SUM(impressions)::TEXT      AS total_impressions,
      SUM(reach)::TEXT            AS total_reach,
      SUM(clicks)::TEXT           AS total_clicks
    FROM daily_ad_metrics
    WHERE account_id = $1
      AND date >= $2
      AND date <= $3
    GROUP BY campaign_id
    ORDER BY SUM(spend) DESC
    LIMIT $4
    `,
    [accountId, dateFrom, dateTo, limit],
  );

  return rows.map((r) => {
    const spend = Number(r.total_spend) || 0;
    const impressions = Number(r.total_impressions) || 0;
    const clicks = Number(r.total_clicks) || 0;

    return {
      campaignId: r.campaign_id,
      campaignName: r.campaign_name,
      totalSpend: spend,
      totalImpressions: impressions,
      totalReach: Number(r.total_reach) || 0,
      totalClicks: clicks,
      avgCtr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
      avgCpc: clicks > 0 ? Number((spend / clicks).toFixed(4)) : 0,
      avgCpm: impressions > 0 ? Number(((spend / impressions) * 1000).toFixed(2)) : 0,
    };
  });
}

/**
 * Get daily trend data for an account — one row per day.
 */
export async function getTrendData(
  accountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<TrendPoint[]> {
  const rows = await query<{
    date: string;
    total_spend: string;
    total_impressions: string;
    total_reach: string;
    total_clicks: string;
  }>(
    `
    SELECT
      date::TEXT                  AS date,
      SUM(spend)::TEXT            AS total_spend,
      SUM(impressions)::TEXT      AS total_impressions,
      SUM(reach)::TEXT            AS total_reach,
      SUM(clicks)::TEXT           AS total_clicks
    FROM daily_ad_metrics
    WHERE account_id = $1
      AND date >= $2
      AND date <= $3
    GROUP BY date
    ORDER BY date ASC
    `,
    [accountId, dateFrom, dateTo],
  );

  return rows.map((r) => {
    const spend = Number(r.total_spend) || 0;
    const impressions = Number(r.total_impressions) || 0;
    const clicks = Number(r.total_clicks) || 0;

    return {
      date: r.date,
      spend,
      impressions,
      reach: Number(r.total_reach) || 0,
      clicks,
      ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
      cpc: clicks > 0 ? Number((spend / clicks).toFixed(4)) : 0,
      cpm: impressions > 0 ? Number(((spend / impressions) * 1000).toFixed(2)) : 0,
    };
  });
}

/**
 * Get aggregated metrics across multiple accounts (cross-account view).
 */
export async function getCrossAccountSummary(
  accountIds: string[],
  dateFrom: string,
  dateTo: string,
): Promise<AccountSummary[]> {
  if (accountIds.length === 0) return [];

  const rows = await query<{
    account_id: string;
    ad_account_id: string;
    total_spend: string;
    total_impressions: string;
    total_reach: string;
    total_clicks: string;
    total_unique_clicks: string;
    currency: string;
  }>(
    `
    SELECT
      account_id,
      ad_account_id,
      SUM(spend)::TEXT            AS total_spend,
      SUM(impressions)::TEXT      AS total_impressions,
      SUM(reach)::TEXT            AS total_reach,
      SUM(clicks)::TEXT           AS total_clicks,
      SUM(unique_clicks)::TEXT    AS total_unique_clicks,
      MAX(currency)              AS currency
    FROM daily_ad_metrics
    WHERE account_id = ANY($1::uuid[])
      AND date >= $2
      AND date <= $3
    GROUP BY account_id, ad_account_id
    ORDER BY SUM(spend) DESC
    `,
    [accountIds, dateFrom, dateTo],
  );

  return rows.map((r) => {
    const spend = Number(r.total_spend) || 0;
    const impressions = Number(r.total_impressions) || 0;
    const clicks = Number(r.total_clicks) || 0;
    const reach = Number(r.total_reach) || 0;

    return {
      accountId: r.account_id,
      adAccountId: r.ad_account_id,
      totalSpend: spend,
      totalImpressions: impressions,
      totalReach: reach,
      totalClicks: clicks,
      totalUniqueClicks: Number(r.total_unique_clicks) || 0,
      avgCtr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
      avgCpc: clicks > 0 ? Number((spend / clicks).toFixed(4)) : 0,
      avgCpm: impressions > 0 ? Number(((spend / impressions) * 1000).toFixed(2)) : 0,
      avgFrequency: reach > 0 ? Number((impressions / reach).toFixed(2)) : 0,
      currency: r.currency || 'USD',
    };
  });
}

// ---------------------------------------------------------------------------
// Sync log helpers
// ---------------------------------------------------------------------------

/** Record the start of a sync operation. Returns the log row id. */
export async function createSyncLog(
  accountId: string,
  syncType: 'full' | 'incremental',
  dateFrom: string | null,
  dateTo: string | null,
): Promise<number> {
  const rows = await query<{ id: number }>(
    `
    INSERT INTO sync_log (account_id, sync_type, status, date_from, date_to)
    VALUES ($1, $2, 'running', $3, $4)
    RETURNING id
    `,
    [accountId, syncType, dateFrom, dateTo],
  );
  return rows[0].id;
}

/** Mark a sync operation as completed. */
export async function completeSyncLog(
  logId: number,
  rowsSynced: number,
): Promise<void> {
  await query(
    `
    UPDATE sync_log
    SET status = 'completed', rows_synced = $1, completed_at = NOW()
    WHERE id = $2
    `,
    [rowsSynced, logId],
  );
}

/** Mark a sync operation as failed. */
export async function failSyncLog(
  logId: number,
  errorMessage: string,
): Promise<void> {
  await query(
    `
    UPDATE sync_log
    SET status = 'failed', error_message = $1, completed_at = NOW()
    WHERE id = $2
    `,
    [errorMessage, logId],
  );
}

/** Get the most recent successful sync for an account. */
export async function getLastSuccessfulSync(
  accountId: string,
): Promise<SyncLogRow | null> {
  const rows = await query<SyncLogRow>(
    `
    SELECT *
    FROM sync_log
    WHERE account_id = $1
      AND status = 'completed'
    ORDER BY completed_at DESC
    LIMIT 1
    `,
    [accountId],
  );
  return rows[0] ?? null;
}

/** Check if any data exists for an account. */
export async function hasMetricsData(accountId: string): Promise<boolean> {
  const rows = await query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM daily_ad_metrics WHERE account_id = $1) AS exists`,
    [accountId],
  );
  return rows[0]?.exists ?? false;
}
