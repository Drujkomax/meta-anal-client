import { query } from '../config/db';
import { AccountRecord } from './accountService';
import { metaClient } from './metaClient';

// ---------------------------------------------------------------------------
// Sync Logic
// ---------------------------------------------------------------------------

function toNum(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function syncCampaignHierarchy(account: AccountRecord): Promise<void> {
  const adAccountId = account.ad_account_id;
  const token = account.user_access_token;
  if (!adAccountId || !token) return;

  // 1. Fetch from Meta
  const [campaignsResp, adSetsResp, adsResp] = await Promise.all([
    metaClient.getCampaigns(adAccountId, token),
    metaClient.getAdSets(adAccountId, token),
    metaClient.getAds(adAccountId, token),
  ]);

  const campaigns = campaignsResp.data;
  const adSets = adSetsResp.data;
  const ads = adsResp.data;

  // 2. Upsert Campaigns
  if (campaigns.length > 0) {
    const values: unknown[] = [];
    const placeholders: string[] = [];
    
    for (let i = 0; i < campaigns.length; i++) {
      const c = campaigns[i];
      const offset = i * 10;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`);
      values.push(
        c.id,
        account.id,
        c.name || 'Unknown',
        c.objective || '',
        c.status || 'UNKNOWN',
        c.effective_status || 'UNKNOWN',
        toNum(c.daily_budget) / 100, // Meta returns budgets in cents usually, but here string. Let's assume cents, so / 100
        toNum(c.lifetime_budget) / 100,
        c.start_time || null,
        c.stop_time || null
      );
    }
    
    // We should safely insert chunks if array is too large, but for now we do it in one go (assuming < 1000 campaigns)
    // To strictly avoid parameter limit (65535), batching is better. Let's do batching.
    const BATCH_SIZE = 50;
    for (let i = 0; i < campaigns.length; i += BATCH_SIZE) {
        const batch = campaigns.slice(i, i + BATCH_SIZE);
        const batchValues: unknown[] = [];
        const batchPlaceholders: string[] = [];
        for (let j = 0; j < batch.length; j++) {
            const c = batch[j];
            const offset = j * 10;
            batchPlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`);
            batchValues.push(
                c.id, account.id, c.name || 'Unknown', c.objective || '', c.status || 'UNKNOWN', c.effective_status || 'UNKNOWN', toNum(c.daily_budget) / 100, toNum(c.lifetime_budget) / 100, c.start_time || null, c.stop_time || null
            );
        }
        await query(`
            INSERT INTO campaign_metadata (
                meta_campaign_id, account_id, name, objective, status, effective_status, daily_budget, lifetime_budget, start_time, stop_time
            ) VALUES ${batchPlaceholders.join(', ')}
            ON CONFLICT (account_id, meta_campaign_id) DO UPDATE SET
                name = EXCLUDED.name,
                objective = EXCLUDED.objective,
                status = EXCLUDED.status,
                effective_status = EXCLUDED.effective_status,
                daily_budget = EXCLUDED.daily_budget,
                lifetime_budget = EXCLUDED.lifetime_budget,
                start_time = EXCLUDED.start_time,
                stop_time = EXCLUDED.stop_time,
                updated_at = NOW()
        `, batchValues);
    }
  }

  // 3. Upsert AdSets
  if (adSets.length > 0) {
      const BATCH_SIZE = 50;
      for (let i = 0; i < adSets.length; i += BATCH_SIZE) {
          const batch = adSets.slice(i, i + BATCH_SIZE);
          const batchValues: unknown[] = [];
          const batchPlaceholders: string[] = [];
          for (let j = 0; j < batch.length; j++) {
              const a = batch[j];
              const offset = j * 11;
              batchPlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`);
              batchValues.push(
                  a.id, a.campaign_id, account.id, a.name || 'Unknown', a.optimization_goal || '', a.billing_event || '', toNum(a.daily_budget) / 100, toNum(a.bid_amount) / 100, a.targeting ? JSON.stringify(a.targeting) : '{}', a.status || 'UNKNOWN', a.effective_status || 'UNKNOWN'
              );
          }
          await query(`
              INSERT INTO adset_metadata (
                  meta_adset_id, meta_campaign_id, account_id, name, optimization_goal, billing_event, daily_budget, bid_amount, targeting, status, effective_status
              ) VALUES ${batchPlaceholders.join(', ')}
              ON CONFLICT (account_id, meta_adset_id) DO UPDATE SET
                  name = EXCLUDED.name,
                  optimization_goal = EXCLUDED.optimization_goal,
                  billing_event = EXCLUDED.billing_event,
                  daily_budget = EXCLUDED.daily_budget,
                  bid_amount = EXCLUDED.bid_amount,
                  targeting = EXCLUDED.targeting,
                  status = EXCLUDED.status,
                  effective_status = EXCLUDED.effective_status,
                  updated_at = NOW()
          `, batchValues);
      }
  }

  // 4. Upsert Ads
  if (ads.length > 0) {
      const BATCH_SIZE = 50;
      for (let i = 0; i < ads.length; i += BATCH_SIZE) {
          const batch = ads.slice(i, i + BATCH_SIZE);
          const batchValues: unknown[] = [];
          const batchPlaceholders: string[] = [];
          for (let j = 0; j < batch.length; j++) {
              const a = batch[j];
              const offset = j * 8;
              batchPlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`);
              batchValues.push(
                  a.id, a.adset_id, a.campaign_id, account.id, a.name || 'Unknown', a.status || 'UNKNOWN', a.effective_status || 'UNKNOWN', a.creative?.id || null
              );
          }
          await query(`
              INSERT INTO ad_metadata (
                  meta_ad_id, meta_adset_id, meta_campaign_id, account_id, name, status, effective_status, creative_id
              ) VALUES ${batchPlaceholders.join(', ')}
              ON CONFLICT (account_id, meta_ad_id) DO UPDATE SET
                  name = EXCLUDED.name,
                  status = EXCLUDED.status,
                  effective_status = EXCLUDED.effective_status,
                  creative_id = EXCLUDED.creative_id,
                  updated_at = NOW()
          `, batchValues);
      }
  }
}

// ---------------------------------------------------------------------------
// Query Logic
// ---------------------------------------------------------------------------

export interface HierarchyMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

type NumericLike = number | string | null;

interface CampaignAggregateRow {
  id: string;
  name: string;
  objective: string | null;
  status: string | null;
  daily_budget: NumericLike;
  spend: NumericLike;
  impressions: NumericLike;
  clicks: NumericLike;
  reach: NumericLike;
}

interface AdSetAggregateRow {
  id: string;
  name: string;
  optimization_goal: string | null;
  status: string | null;
  daily_budget: NumericLike;
  spend: NumericLike;
  impressions: NumericLike;
  clicks: NumericLike;
  reach: NumericLike;
}

interface AdSetDetailRow {
  id: string;
  campaign_id: string | null;
  campaign_name: string | null;
  name: string;
  optimization_goal: string | null;
  status: string | null;
  daily_budget: NumericLike;
  targeting: unknown;
  spend: NumericLike;
  impressions: NumericLike;
  clicks: NumericLike;
  reach: NumericLike;
}

interface AdAggregateRow {
  id: string;
  name: string;
  status: string | null;
  creative_id: string | null;
  spend: NumericLike;
  impressions: NumericLike;
  clicks: NumericLike;
  reach: NumericLike;
}

interface AdDetailRow {
  id: string;
  adset_id: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  adset_name: string | null;
  name: string;
  status: string | null;
  creative_id: string | null;
  spend: NumericLike;
  impressions: NumericLike;
  clicks: NumericLike;
  reach: NumericLike;
}

interface DailyMetricsRow {
  date: string;
  spend: NumericLike;
  impressions: NumericLike;
  clicks: NumericLike;
  reach: NumericLike;
}

export async function listCampaigns(accountId: string, dateFrom: string, dateTo: string) {
  const rows = await query<CampaignAggregateRow>(`
    SELECT 
      c.meta_campaign_id as id,
      c.name,
      c.objective,
      c.effective_status as status,
      c.daily_budget,
      COALESCE(SUM(m.spend), 0) as spend,
      COALESCE(SUM(m.impressions), 0) as impressions,
      COALESCE(SUM(m.clicks), 0) as clicks,
      COALESCE(SUM(m.reach), 0) as reach
    FROM campaign_metadata c
    LEFT JOIN daily_ad_metrics m 
      ON c.account_id = m.account_id 
      AND c.meta_campaign_id = m.campaign_id
      AND m.date >= $2 AND m.date <= $3
    WHERE c.account_id = $1
    GROUP BY c.id
    ORDER BY spend DESC, c.name ASC
  `, [accountId, dateFrom, dateTo]);

  return rows.map((r) => {
    const impressions = Number(r.impressions) || 0;
    const clicks = Number(r.clicks) || 0;
    const spend = Number(r.spend) || 0;
    return {
      id: r.id,
      name: r.name,
      objective: r.objective,
      status: r.status,
      daily_budget: Number(r.daily_budget),
      metrics: {
        spend,
        impressions,
        clicks,
        reach: Number(r.reach) || 0,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      }
    };
  });
}

export async function getCampaignDetail(accountId: string, campaignId: string, dateFrom: string, dateTo: string) {
  // 1. Get campaign metadata + total metrics
  const cRows = await query<CampaignAggregateRow>(`
    SELECT 
      c.meta_campaign_id as id,
      c.name,
      c.objective,
      c.effective_status as status,
      c.daily_budget,
      COALESCE(SUM(m.spend), 0) as spend,
      COALESCE(SUM(m.impressions), 0) as impressions,
      COALESCE(SUM(m.clicks), 0) as clicks,
      COALESCE(SUM(m.reach), 0) as reach
    FROM campaign_metadata c
    LEFT JOIN daily_ad_metrics m 
      ON c.account_id = m.account_id 
      AND c.meta_campaign_id = m.campaign_id
      AND m.date >= $3 AND m.date <= $4
    WHERE c.account_id = $1 AND c.meta_campaign_id = $2
    GROUP BY c.id
  `, [accountId, campaignId, dateFrom, dateTo]);
  
  if (cRows.length === 0) return null;
  const c = cRows[0];

  // 2. Get adsets for this campaign
  const aRows = await query<AdSetAggregateRow>(`
    SELECT 
      a.meta_adset_id as id,
      a.name,
      a.optimization_goal,
      a.effective_status as status,
      a.daily_budget,
      COALESCE(SUM(m.spend), 0) as spend,
      COALESCE(SUM(m.impressions), 0) as impressions,
      COALESCE(SUM(m.clicks), 0) as clicks,
      COALESCE(SUM(m.reach), 0) as reach
    FROM adset_metadata a
    LEFT JOIN daily_ad_metrics m 
      ON a.account_id = m.account_id 
      AND a.meta_adset_id = m.adset_id
      AND m.date >= $3 AND m.date <= $4
    WHERE a.account_id = $1 AND a.meta_campaign_id = $2
    GROUP BY a.id
    ORDER BY spend DESC, a.name ASC
  `, [accountId, campaignId, dateFrom, dateTo]);

  const adsets = aRows.map((r) => {
    const imp = Number(r.impressions) || 0;
    const clk = Number(r.clicks) || 0;
    const spd = Number(r.spend) || 0;
    return {
      id: r.id,
      name: r.name,
      optimization_goal: r.optimization_goal,
      status: r.status,
      daily_budget: Number(r.daily_budget),
      metrics: {
        spend: spd,
        impressions: imp,
        clicks: clk,
        reach: Number(r.reach) || 0,
        ctr: imp > 0 ? (clk / imp) * 100 : 0,
        cpc: clk > 0 ? spd / clk : 0,
        cpm: imp > 0 ? (spd / imp) * 1000 : 0,
      }
    };
  });

  const cImp = Number(c.impressions) || 0;
  const cClk = Number(c.clicks) || 0;
  const cSpd = Number(c.spend) || 0;

  return {
    id: c.id,
    name: c.name,
    objective: c.objective,
    status: c.status,
    daily_budget: Number(c.daily_budget),
    metrics: {
      spend: cSpd,
      impressions: cImp,
      clicks: cClk,
      reach: Number(c.reach) || 0,
      ctr: cImp > 0 ? (cClk / cImp) * 100 : 0,
      cpc: cClk > 0 ? cSpd / cClk : 0,
      cpm: cImp > 0 ? (cSpd / cImp) * 1000 : 0,
    },
    adsets
  };
}

export async function getAdSetDetail(accountId: string, adsetId: string, dateFrom: string, dateTo: string) {
  // 1. Get adset metadata + metrics
  const cRows = await query<AdSetDetailRow>(`
    SELECT 
      a.meta_adset_id as id,
      a.meta_campaign_id as campaign_id,
      c.name as campaign_name,
      a.name,
      a.optimization_goal,
      a.effective_status as status,
      a.daily_budget,
      a.targeting,
      COALESCE(SUM(m.spend), 0) as spend,
      COALESCE(SUM(m.impressions), 0) as impressions,
      COALESCE(SUM(m.clicks), 0) as clicks,
      COALESCE(SUM(m.reach), 0) as reach
    FROM adset_metadata a
    LEFT JOIN campaign_metadata c ON c.account_id = a.account_id AND c.meta_campaign_id = a.meta_campaign_id
    LEFT JOIN daily_ad_metrics m 
      ON a.account_id = m.account_id 
      AND a.meta_adset_id = m.adset_id
      AND m.date >= $3 AND m.date <= $4
    WHERE a.account_id = $1 AND a.meta_adset_id = $2
    GROUP BY a.id, c.name
  `, [accountId, adsetId, dateFrom, dateTo]);
  
  if (cRows.length === 0) return null;
  const a = cRows[0];

  // 2. Get ads for this adset
  const adsRows = await query<AdAggregateRow>(`
    SELECT 
      ad.meta_ad_id as id,
      ad.name,
      ad.effective_status as status,
      ad.creative_id,
      COALESCE(SUM(m.spend), 0) as spend,
      COALESCE(SUM(m.impressions), 0) as impressions,
      COALESCE(SUM(m.clicks), 0) as clicks,
      COALESCE(SUM(m.reach), 0) as reach
    FROM ad_metadata ad
    LEFT JOIN daily_ad_metrics m 
      ON ad.account_id = m.account_id 
      AND ad.meta_ad_id = m.ad_id
      AND m.date >= $3 AND m.date <= $4
    WHERE ad.account_id = $1 AND ad.meta_adset_id = $2
    GROUP BY ad.id
    ORDER BY spend DESC, ad.name ASC
  `, [accountId, adsetId, dateFrom, dateTo]);

  const ads = adsRows.map((r) => {
    const imp = Number(r.impressions) || 0;
    const clk = Number(r.clicks) || 0;
    const spd = Number(r.spend) || 0;
    return {
      id: r.id,
      name: r.name,
      status: r.status,
      creative_id: r.creative_id,
      metrics: {
        spend: spd,
        impressions: imp,
        clicks: clk,
        reach: Number(r.reach) || 0,
        ctr: imp > 0 ? (clk / imp) * 100 : 0,
        cpc: clk > 0 ? spd / clk : 0,
        cpm: imp > 0 ? (spd / imp) * 1000 : 0,
      }
    };
  });

  const aImp = Number(a.impressions) || 0;
  const aClk = Number(a.clicks) || 0;
  const aSpd = Number(a.spend) || 0;

  return {
    id: a.id,
    campaign_id: a.campaign_id,
    campaign_name: a.campaign_name,
    name: a.name,
    optimization_goal: a.optimization_goal,
    status: a.status,
    daily_budget: Number(a.daily_budget),
    targeting: a.targeting,
    metrics: {
      spend: aSpd,
      impressions: aImp,
      clicks: aClk,
      reach: Number(a.reach) || 0,
      ctr: aImp > 0 ? (aClk / aImp) * 100 : 0,
      cpc: aClk > 0 ? aSpd / aClk : 0,
      cpm: aImp > 0 ? (aSpd / aImp) * 1000 : 0,
    },
    ads
  };
}

export async function getAdDetail(accountId: string, adId: string, dateFrom: string, dateTo: string) {
  // 1. Get ad metadata
  const cRows = await query<AdDetailRow>(`
    SELECT 
      ad.meta_ad_id as id,
      ad.meta_adset_id as adset_id,
      ad.meta_campaign_id as campaign_id,
      c.name as campaign_name,
      a.name as adset_name,
      ad.name,
      ad.effective_status as status,
      ad.creative_id,
      COALESCE(SUM(m.spend), 0) as spend,
      COALESCE(SUM(m.impressions), 0) as impressions,
      COALESCE(SUM(m.clicks), 0) as clicks,
      COALESCE(SUM(m.reach), 0) as reach
    FROM ad_metadata ad
    LEFT JOIN campaign_metadata c ON c.account_id = ad.account_id AND c.meta_campaign_id = ad.meta_campaign_id
    LEFT JOIN adset_metadata a ON a.account_id = ad.account_id AND a.meta_adset_id = ad.meta_adset_id
    LEFT JOIN daily_ad_metrics m 
      ON ad.account_id = m.account_id 
      AND ad.meta_ad_id = m.ad_id
      AND m.date >= $3 AND m.date <= $4
    WHERE ad.account_id = $1 AND ad.meta_ad_id = $2
    GROUP BY ad.id, c.name, a.name
  `, [accountId, adId, dateFrom, dateTo]);
  
  if (cRows.length === 0) return null;
  const ad = cRows[0];

  // 2. Daily breakdown
  const dailyRows = await query<DailyMetricsRow>(`
    SELECT 
      date::TEXT as date,
      COALESCE(spend, 0) as spend,
      COALESCE(impressions, 0) as impressions,
      COALESCE(clicks, 0) as clicks,
      COALESCE(reach, 0) as reach
    FROM daily_ad_metrics
    WHERE account_id = $1 AND ad_id = $2
      AND date >= $3 AND date <= $4
    ORDER BY date DESC
  `, [accountId, adId, dateFrom, dateTo]);

  const daily = dailyRows.map((r) => {
    const imp = Number(r.impressions) || 0;
    const clk = Number(r.clicks) || 0;
    const spd = Number(r.spend) || 0;
    return {
      date: r.date,
      spend: spd,
      impressions: imp,
      clicks: clk,
      reach: Number(r.reach) || 0,
      ctr: imp > 0 ? (clk / imp) * 100 : 0,
      cpc: clk > 0 ? spd / clk : 0,
      cpm: imp > 0 ? (spd / imp) * 1000 : 0,
    };
  });

  const adImp = Number(ad.impressions) || 0;
  const adClk = Number(ad.clicks) || 0;
  const adSpd = Number(ad.spend) || 0;

  return {
    id: ad.id,
    campaign_id: ad.campaign_id,
    campaign_name: ad.campaign_name,
    adset_id: ad.adset_id,
    adset_name: ad.adset_name,
    name: ad.name,
    status: ad.status,
    creative_id: ad.creative_id,
    metrics: {
      spend: adSpd,
      impressions: adImp,
      clicks: adClk,
      reach: Number(ad.reach) || 0,
      ctr: adImp > 0 ? (adClk / adImp) * 100 : 0,
      cpc: adClk > 0 ? adSpd / adClk : 0,
      cpm: adImp > 0 ? (adSpd / adImp) * 1000 : 0,
    },
    daily
  };
}
