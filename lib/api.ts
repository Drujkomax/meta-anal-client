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
