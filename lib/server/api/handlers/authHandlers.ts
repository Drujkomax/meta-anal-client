import type { NextApiResponse } from 'next';
import { listAccountsByMetaUsers, upsertAccounts, upsertMetaIdentity } from '../../services/accountService';
import { metaClient } from '../../services/metaClient';
import {
  clearOAuthCookies,
  clearSessionCookie,
  normalizeMetaUserIds,
  resolveOAuthRedirectUri,
  resolveRequestOrigin,
  resolveSafeNextPath,
  setOAuthCookies,
  setSessionCookie,
} from '../auth';
import { type ApiRequest } from '../http';

function pickQueryString(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }

  return undefined;
}

export async function startMetaLoginHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  const nextPath = resolveSafeNextPath(pickQueryString(req.query.next));
  const { state, redirectUri } = setOAuthCookies(req, res, nextPath);

  res.redirect(302, metaClient.buildLoginUrl(state, redirectUri));
}

export async function metaCallbackHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  const frontendOrigin = req.cookies.meta_oauth_frontend_origin || resolveRequestOrigin(req);

  try {
    const code = pickQueryString(req.query.code) || '';
    const incomingState = pickQueryString(req.query.state) || '';
    const storedState = req.cookies.meta_oauth_state;
    const storedRedirectUri = req.cookies.meta_oauth_redirect_uri;
    const nextPath = resolveSafeNextPath(req.cookies.meta_oauth_next);

    if (!code || !incomingState || !storedState || incomingState !== storedState) {
      console.warn('OAuth State Mismatch:', { incomingState, storedState, hasCode: !!code });
      res.redirect(302, `${frontendOrigin}/login?error=oauth_state_mismatch`);
      return;
    }

    clearOAuthCookies(res);

    const redirectUri = storedRedirectUri || resolveOAuthRedirectUri(req);
    const shortToken = await metaClient.exchangeCodeForShortToken(code, redirectUri);
    const longToken = await metaClient.exchangeForLongLivedUserToken(shortToken.access_token);
    const userProfile = await metaClient.getUserProfile(longToken.access_token);

    await upsertMetaIdentity(userProfile.id, userProfile.name);

    const adAccountsResponse = await metaClient.getUserAdAccounts(longToken.access_token);

    const upsertInput = adAccountsResponse.data
      .filter((adAccount) => Boolean(adAccount.id))
      .map((adAccount) => ({
        ownerMetaUserId: userProfile.id,
        name: adAccount.name || `Ad Account ${adAccount.id}`,
        userAccessToken: longToken.access_token,
        adAccountId: adAccount.id,
        adAccountName: adAccount.name ?? null,
        adAccountCurrency: adAccount.currency ?? null,
        businessId: adAccount.business?.id ?? null,
        businessName: adAccount.business?.name ?? null,
        refreshToken: null,
        tokenExpiry: longToken.expires_in
          ? new Date(Date.now() + longToken.expires_in * 1000)
          : null,
      }));

    if (upsertInput.length > 0) {
      await upsertAccounts(upsertInput);
    }

    const existingIds = req.user?.metaUserIds || (req.user?.metaUserId ? [req.user.metaUserId] : []);
    const mergedMetaUserIds = normalizeMetaUserIds([...existingIds, userProfile.id]);

    setSessionCookie(res, {
      metaUserIds: mergedMetaUserIds,
      activeMetaUserId: userProfile.id,
      name: userProfile.name,
    });

    res.redirect(302, `${frontendOrigin}${nextPath}`);
  } catch (error) {
    console.error('Meta callback error. Check permissions, tokens, and scopes:', error);
    res.redirect(302, `${frontendOrigin}/login?error=oauth_failed`);
  }
}

export async function meHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  if (!req.user) {
    res.status(200).json({ authenticated: false });
    return;
  }

  const accounts = await listAccountsByMetaUsers(req.user.metaUserIds);

  res.status(200).json({
    authenticated: true,
    user: req.user,
    accounts: accounts.map((account) => ({
      id: account.id,
      name: account.name,
      ad_account_id: account.ad_account_id,
      ad_account_name: account.ad_account_name,
      ad_account_currency: account.ad_account_currency,
      business_id: account.business_id,
      business_name: account.business_name,
      identity_name: account.identity_name,
      created_at: account.created_at,
    })),
  });
}

export async function logoutHandler(_req: ApiRequest, res: NextApiResponse): Promise<void> {
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
}
