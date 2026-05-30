import axios from 'axios';
import {
  AnalyticsResponse,
  AuthMeResponse,
  ConnectedAccount,
  CrossAccountResponse,
  SyncStatus,
  TrendsResponse,
  CampaignListItem,
  CampaignDetail,
  AdSetDetail,
  AdDetail,
} from './types';

const api = axios.create({
  baseURL: (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/+$/, ''),
  withCredentials: true,
  timeout: 30_000,
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export function getMetaLoginUrlWithNext(nextPath = '/dashboard'): string {
  const params = new URLSearchParams({ next: nextPath });
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/+$/, '');
  return `${baseUrl}/auth/meta/login?${params.toString()}`;
}

export async function getSession(): Promise<AuthMeResponse> {
  const { data } = await api.get<AuthMeResponse>('/auth/me');
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export async function getAccounts(): Promise<ConnectedAccount[]> {
  const { data } = await api.get<{ data: ConnectedAccount[] }>('/accounts');
  return data.data;
}

// ---------------------------------------------------------------------------
// Identities
// ---------------------------------------------------------------------------

import { IdentityNode } from './types';
import type {
  PublishFunnelResult,
  MetaPage,
  MetaPromotablePost,
  MetaPixel,
  MetaAudiences,
  TargetingSearchItem,
  AdLevel,
  ReportRow,
} from './types';
import type { PublishPayload } from './adWizard';

export async function getIdentities(): Promise<IdentityNode[]> {
  const { data } = await api.get<{ data: IdentityNode[] }>('/identities');
  return data.data;
}

export async function disconnectIdentity(metaUserId: string): Promise<void> {
  await api.delete(`/identities/${encodeURIComponent(metaUserId)}`);
}

// ---------------------------------------------------------------------------
// Analytics — single account with date range
// ---------------------------------------------------------------------------

export async function getAnalytics(
  accountId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<AnalyticsResponse> {
  const params: Record<string, string> = { account_id: accountId };
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;

  const { data } = await api.get<AnalyticsResponse>('/analytics', { params });
  return data;
}

// ---------------------------------------------------------------------------
// Trends — daily time-series
// ---------------------------------------------------------------------------

export async function getTrends(
  accountId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<TrendsResponse> {
  const params: Record<string, string> = { account_id: accountId };
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;

  const { data } = await api.get<TrendsResponse>('/analytics/trends', { params });
  return data;
}

// ---------------------------------------------------------------------------
// Cross-account analytics
// ---------------------------------------------------------------------------

export async function getCrossAccountAnalytics(
  dateFrom?: string,
  dateTo?: string,
): Promise<CrossAccountResponse> {
  const params: Record<string, string> = {};
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;

  const { data } = await api.get<CrossAccountResponse>('/analytics/cross', { params });
  return data;
}

// ---------------------------------------------------------------------------
// Sync status & trigger
// ---------------------------------------------------------------------------

export async function getSyncStatus(): Promise<SyncStatus[]> {
  const { data } = await api.get<{ data: SyncStatus[] }>('/analytics/sync');
  return data.data;
}

export async function triggerSync(accountId: string): Promise<void> {
  await api.post('/analytics/sync', null, { params: { account_id: accountId } });
}

// ---------------------------------------------------------------------------
// Hierarchy Explorer
// ---------------------------------------------------------------------------

export async function getCampaignsList(
  accountId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<CampaignListItem[]> {
  const params: Record<string, string> = { account_id: accountId };
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;

  const { data } = await api.get<{ data: CampaignListItem[] }>('/campaigns', { params });
  return data.data;
}

export async function getCampaignDetail(
  accountId: string,
  campaignId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<CampaignDetail> {
  const params: Record<string, string> = { account_id: accountId };
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;

  const { data } = await api.get<{ data: CampaignDetail }>(`/campaigns/${campaignId}`, { params });
  return data.data;
}

export async function getAdSetDetail(
  accountId: string,
  adSetId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<AdSetDetail> {
  const params: Record<string, string> = { account_id: accountId };
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;

  const { data } = await api.get<{ data: AdSetDetail }>(`/adsets/${adSetId}`, { params });
  return data.data;
}

export async function getAdDetail(
  accountId: string,
  adId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<AdDetail> {
  const params: Record<string, string> = { account_id: accountId };
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;

  const { data } = await api.get<{ data: AdDetail }>(`/ads/${adId}`, { params });
  return data.data;
}

// ---------------------------------------------------------------------------
// Ad management — write operations + Meta reference lookups
// ---------------------------------------------------------------------------

const LEVEL_PATH: Record<AdLevel, string> = {
  campaign: 'campaigns',
  adset: 'adsets',
  ad: 'ads',
};

export async function publishAd(
  accountId: string,
  payload: PublishPayload,
): Promise<PublishFunnelResult> {
  const { data } = await api.post<{ data: PublishFunnelResult }>('/ads/publish', payload, {
    params: { account_id: accountId },
  });
  return data.data;
}

export async function updateAdObjectStatus(
  level: AdLevel,
  accountId: string,
  id: string,
  status: 'ACTIVE' | 'PAUSED',
): Promise<void> {
  await api.patch(`/${LEVEL_PATH[level]}/${id}`, { status }, { params: { account_id: accountId } });
}

export async function updateAdObjectBudget(
  level: AdLevel,
  accountId: string,
  id: string,
  dailyBudgetMinor: number,
): Promise<void> {
  await api.patch(
    `/${LEVEL_PATH[level]}/${id}`,
    { daily_budget: dailyBudgetMinor },
    { params: { account_id: accountId } },
  );
}

export async function deleteAdObject(level: AdLevel, accountId: string, id: string): Promise<void> {
  await api.delete(`/${LEVEL_PATH[level]}/${id}`, { params: { account_id: accountId } });
}

export async function getPages(accountId: string): Promise<MetaPage[]> {
  const { data } = await api.get<{ data: MetaPage[] }>('/meta/pages', {
    params: { account_id: accountId },
  });
  return data.data;
}

export async function getPagePosts(accountId: string, pageId: string): Promise<MetaPromotablePost[]> {
  const { data } = await api.get<{ data: MetaPromotablePost[] }>(`/meta/pages/${pageId}/posts`, {
    params: { account_id: accountId },
  });
  return data.data;
}

export async function getPixels(accountId: string): Promise<MetaPixel[]> {
  const { data } = await api.get<{ data: MetaPixel[] }>('/meta/pixels', {
    params: { account_id: accountId },
  });
  return data.data;
}

export async function getAudiences(accountId: string): Promise<MetaAudiences> {
  const { data } = await api.get<{ data: MetaAudiences }>('/meta/audiences', {
    params: { account_id: accountId },
  });
  return data.data;
}

export async function searchTargeting(
  accountId: string,
  q: string,
  type: 'adinterest' | 'adgeolocation' = 'adinterest',
): Promise<TargetingSearchItem[]> {
  const { data } = await api.get<{ data: TargetingSearchItem[] }>('/meta/targeting/search', {
    params: { account_id: accountId, q, type },
  });
  return data.data;
}

// ---------------------------------------------------------------------------
// Reports & export
// ---------------------------------------------------------------------------

export async function getReport(
  accountId: string,
  level: AdLevel,
  dateFrom?: string,
  dateTo?: string,
): Promise<ReportRow[]> {
  const params: Record<string, string> = { account_id: accountId, level };
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;
  const { data } = await api.get<{ data: ReportRow[] }>('/reports', { params });
  return data.data;
}

export function reportExportUrl(
  accountId: string,
  level: AdLevel,
  format: 'csv' | 'xlsx',
  dateFrom?: string,
  dateTo?: string,
): string {
  const base = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/+$/, '');
  const p = new URLSearchParams({ account_id: accountId, level, format });
  if (dateFrom) p.set('date_from', dateFrom);
  if (dateTo) p.set('date_to', dateTo);
  return `${base}/reports/export?${p.toString()}`;
}
