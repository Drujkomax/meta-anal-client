// ---------------------------------------------------------------------------
// Shared frontend types
// ---------------------------------------------------------------------------

export interface ConnectedAccount {
  id: string;
  name: string;
  ad_account_id?: string | null;
  ad_account_name?: string | null;
  ad_account_currency?: string | null;
  business_id?: string | null;
  business_name?: string | null;
  identity_name?: string | null;
  created_at?: string;
}

export interface AuthMeResponse {
  authenticated: boolean;
  user?: {
    metaUserId: string;
    metaUserIds?: string[];
    name?: string;
  };
  accounts?: ConnectedAccount[];
}

// ---------------------------------------------------------------------------
// Analytics — single account
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

export interface AnalyticsResponse {
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

// ---------------------------------------------------------------------------
// Trends — daily time-series
// ---------------------------------------------------------------------------

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

export interface TrendsResponse {
  accountId: string;
  dateRange: { from: string; to: string };
  data: TrendPoint[];
}

// ---------------------------------------------------------------------------
// Cross-account analytics
// ---------------------------------------------------------------------------

export interface CrossAccountEntry {
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

export interface CrossAccountResponse {
  dateRange: { from: string; to: string };
  accounts: CrossAccountEntry[];
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
// Sync status
// ---------------------------------------------------------------------------

export interface SyncStatus {
  accountId: string;
  accountName: string;
  adAccountId: string | null;
  lastSyncedAt: string | null;
  lastSyncStatus: string | null;
  lastSyncRows: number;
}

// ---------------------------------------------------------------------------
// Hierarchy Explorer
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

export interface CampaignListItem {
  id: string;
  name: string;
  objective?: string;
  status: string;
  daily_budget: number;
  metrics: HierarchyMetrics;
}

export interface AdSetListItem {
  id: string;
  name: string;
  optimization_goal?: string;
  status: string;
  daily_budget: number;
  metrics: HierarchyMetrics;
}

export interface AdListItem {
  id: string;
  name: string;
  status: string;
  creative_id?: string;
  metrics: HierarchyMetrics;
}

export interface CampaignDetail extends CampaignListItem {
  adsets: AdSetListItem[];
}

export interface AdSetDetail extends AdSetListItem {
  campaign_id: string;
  campaign_name: string;
  targeting?: any;
  ads: AdListItem[];
}

export interface AdDailyBreakdown {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

export interface AdDetail extends AdListItem {
  campaign_id: string;
  campaign_name: string;
  adset_id: string;
  adset_name: string;
  daily: AdDailyBreakdown[];
}

// ---------------------------------------------------------------------------
// Date presets for the date range selector
// ---------------------------------------------------------------------------

export type DatePreset = '7d' | '14d' | '30d' | '90d';

export const DATE_PRESETS: { label: string; value: DatePreset; days: number }[] = [
  { label: '7 days', value: '7d', days: 7 },
  { label: '14 days', value: '14d', days: 14 },
  { label: '30 days', value: '30d', days: 30 },
  { label: '90 days', value: '90d', days: 90 },
];

// ---------------------------------------------------------------------------
// Ad management — Meta reference data (wizard lookups) + write results
// ---------------------------------------------------------------------------

export interface MetaPage {
  id: string;
  name: string;
  access_token?: string;
}

export interface MetaPromotablePost {
  id: string;
  message?: string;
  created_time?: string;
}

export interface MetaPixel {
  id: string;
  name: string;
}

export interface MetaAudience {
  id: string;
  name: string;
  subtype?: string;
  approximate_count?: number;
}

export interface MetaAudiences {
  custom: MetaAudience[];
  saved: { id: string; name: string }[];
}

export interface TargetingSearchItem {
  id?: string;
  key?: string;
  name: string;
  type?: string;
  audience_size_lower_bound?: number;
}

export interface PublishFunnelResult {
  campaignId: string;
  adSetId: string;
  adId: string;
}

export type AdLevel = 'campaign' | 'adset' | 'ad';

export interface ReportRow {
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  currency: string;
}
