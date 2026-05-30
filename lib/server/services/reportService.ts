// ---------------------------------------------------------------------------
// Report service — builds flat report datasets from daily_ad_metrics at the
// requested level (campaign / adset / ad). Pure shaping (shapeReportRow) and
// column definitions (reportColumns) are unit-tested; buildReport hits the DB.
// ---------------------------------------------------------------------------

import { query } from '../config/db';
import type { ReportRow, AdLevel } from '../../types';

export type ReportLevel = AdLevel;

interface RawReportRow {
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  spend: string;
  impressions: string;
  reach: string;
  clicks: string;
  currency: string;
}

/** Pure: convert a raw aggregated DB row into a ReportRow with derived metrics. */
export function shapeReportRow(raw: RawReportRow): ReportRow {
  const spend = Number(raw.spend) || 0;
  const impressions = Number(raw.impressions) || 0;
  const clicks = Number(raw.clicks) || 0;
  const reach = Number(raw.reach) || 0;

  return {
    campaign_id: raw.campaign_id,
    campaign_name: raw.campaign_name,
    adset_id: raw.adset_id,
    adset_name: raw.adset_name,
    ad_id: raw.ad_id,
    ad_name: raw.ad_name,
    spend: Number(spend.toFixed(2)),
    impressions,
    reach,
    clicks,
    ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
    cpc: clicks > 0 ? Number((spend / clicks).toFixed(4)) : 0,
    cpm: impressions > 0 ? Number(((spend / impressions) * 1000).toFixed(2)) : 0,
    currency: raw.currency || 'USD',
  };
}

interface LevelSql {
  select: string;
  group: string;
  where: string;
}

// NOTE: level comes from a fixed allow-list (validated by the handler) — never
// from free user input — so these interpolated fragments are not injectable.
function levelSql(level: ReportLevel): LevelSql {
  if (level === 'ad') {
    return {
      select:
        'ad_id, MAX(ad_name) AS ad_name, MAX(adset_name) AS adset_name, MAX(campaign_name) AS campaign_name',
      group: 'ad_id',
      where: 'AND ad_id IS NOT NULL',
    };
  }
  if (level === 'adset') {
    return {
      select: 'adset_id, MAX(adset_name) AS adset_name, MAX(campaign_name) AS campaign_name',
      group: 'adset_id',
      where: 'AND adset_id IS NOT NULL',
    };
  }
  return {
    select: 'campaign_id, MAX(campaign_name) AS campaign_name',
    group: 'campaign_id',
    where: '',
  };
}

export async function buildReport(
  accountId: string,
  level: ReportLevel,
  dateFrom: string,
  dateTo: string,
): Promise<ReportRow[]> {
  const sql = levelSql(level);
  const rows = await query<RawReportRow>(
    `
    SELECT ${sql.select},
      SUM(spend)::TEXT        AS spend,
      SUM(impressions)::TEXT  AS impressions,
      SUM(reach)::TEXT        AS reach,
      SUM(clicks)::TEXT       AS clicks,
      MAX(currency)           AS currency
    FROM daily_ad_metrics
    WHERE account_id = $1 AND date >= $2 AND date <= $3 ${sql.where}
    GROUP BY ${sql.group}
    ORDER BY SUM(spend) DESC
    `,
    [accountId, dateFrom, dateTo],
  );
  return rows.map(shapeReportRow);
}

export interface ReportColumn {
  header: string;
  value: (r: ReportRow) => string | number;
}

/** Column layout for a level — shared by CSV and XLSX exporters and the UI. */
export function reportColumns(level: ReportLevel): ReportColumn[] {
  const cols: ReportColumn[] = [];
  if (level === 'ad') {
    cols.push({ header: 'Campaign', value: (r) => r.campaign_name ?? '' });
    cols.push({ header: 'Ad Set', value: (r) => r.adset_name ?? '' });
    cols.push({ header: 'Ad', value: (r) => r.ad_name ?? '' });
  } else if (level === 'adset') {
    cols.push({ header: 'Campaign', value: (r) => r.campaign_name ?? '' });
    cols.push({ header: 'Ad Set', value: (r) => r.adset_name ?? '' });
  } else {
    cols.push({ header: 'Campaign', value: (r) => r.campaign_name ?? '' });
  }
  cols.push(
    { header: 'Spend', value: (r) => r.spend },
    { header: 'Impressions', value: (r) => r.impressions },
    { header: 'Reach', value: (r) => r.reach },
    { header: 'Clicks', value: (r) => r.clicks },
    { header: 'CTR %', value: (r) => r.ctr },
    { header: 'CPC', value: (r) => r.cpc },
    { header: 'CPM', value: (r) => r.cpm },
    { header: 'Currency', value: (r) => r.currency },
  );
  return cols;
}
