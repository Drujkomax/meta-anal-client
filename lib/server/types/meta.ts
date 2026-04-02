// ---------------------------------------------------------------------------
// Meta Marketing API type definitions
// ---------------------------------------------------------------------------

/** Single ad account returned by GET /me/adaccounts */
export interface MetaAdAccount {
  id: string;
  account_id?: string;
  name?: string;
  account_status?: number;
  currency?: string;
  timezone_name?: string;
  business?: {
    id: string;
    name: string;
  };
}

export interface MetaAdAccountsResponse {
  data: MetaAdAccount[];
}

// ---------------------------------------------------------------------------
// Insights (GET /act_{id}/insights)
// ---------------------------------------------------------------------------

/**
 * Action / action_values element.
 * Meta returns arrays like [{ "action_type": "purchase", "value": "4" }].
 */
export interface MetaActionBreakdown {
  action_type: string;
  value: string;
  '1d_click'?: string;
  '7d_click'?: string;
  '28d_click'?: string;
  '1d_view'?: string;
  '7d_view'?: string;
  '28d_view'?: string;
}

/**
 * A single row from the Insights API.
 * All numeric values arrive as strings from Meta.
 */
export interface MetaAdInsightRow {
  // Hierarchy identifiers
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;

  // Date range for this row
  date_start?: string;
  date_stop?: string;

  // Core delivery metrics (strings from API)
  impressions?: string;
  clicks?: string;
  spend?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  reach?: string;
  frequency?: string;
  unique_clicks?: string;

  // Conversion / value arrays
  actions?: MetaActionBreakdown[];
  action_values?: MetaActionBreakdown[];
  cost_per_action_type?: MetaActionBreakdown[];
  purchase_roas?: MetaActionBreakdown[];
}

/** Cursor-based pagination from Meta Graph API */
interface MetaPagingCursors {
  before?: string;
  after?: string;
}

export interface MetaPaging {
  cursors?: MetaPagingCursors;
  next?: string;
}

export interface MetaAdInsightsResponse {
  data: MetaAdInsightRow[];
  paging?: MetaPaging;
}

// ---------------------------------------------------------------------------
// Rate-limit information parsed from response headers
// ---------------------------------------------------------------------------

/** Extracted from the x-business-use-case-usage or x-ad-account-usage header */
export interface MetaRateLimitInfo {
  /** Percentage of the allowed call volume consumed (0-100+) */
  callCountPercent: number;
  /** Percentage of the allowed CPU time consumed */
  totalCpuTimePercent: number;
  /** Percentage of the total processing time consumed */
  totalTimePercent: number;
  /** Estimated minutes until the throttle window resets */
  estimatedTimeToRegainAccess: number;
}

// ---------------------------------------------------------------------------
// Hierarchy Metadata
// ---------------------------------------------------------------------------

export interface MetaCampaign {
  id: string;
  name: string;
  objective?: string;
  status: string;
  effective_status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
}

export interface MetaCampaignsResponse {
  data: MetaCampaign[];
  paging?: MetaPaging;
}

export interface MetaAdSet {
  id: string;
  campaign_id: string;
  name: string;
  optimization_goal?: string;
  billing_event?: string;
  daily_budget?: string;
  bid_amount?: string;
  targeting?: unknown;
  status: string;
  effective_status: string;
}

export interface MetaAdSetsResponse {
  data: MetaAdSet[];
  paging?: MetaPaging;
}

export interface MetaAd {
  id: string;
  adset_id: string;
  campaign_id: string;
  name: string;
  status: string;
  effective_status: string;
  creative?: {
    id: string;
  };
}

export interface MetaAdsResponse {
  data: MetaAd[];
  paging?: MetaPaging;
}

