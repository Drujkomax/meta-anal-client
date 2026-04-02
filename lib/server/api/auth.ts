import crypto from 'node:crypto';
import type { NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { ApiRequest } from './http';
import { clearCookie, setCookie } from './http';

export interface SessionPayload {
  metaUserIds: string[];
  activeMetaUserId: string;
  name?: string;
}

export const OAuthCookieNames = {
  state: 'meta_oauth_state',
  nextPath: 'meta_oauth_next',
  redirectUri: 'meta_oauth_redirect_uri',
  frontendOrigin: 'meta_oauth_frontend_origin',
} as const;

export function normalizeMetaUserIds(metaUserIds: string[]): string[] {
  return Array.from(new Set(metaUserIds.filter(Boolean)));
}

export function resolveSafeNextPath(input?: string): string {
  if (!input || !input.startsWith('/') || input.startsWith('//')) {
    return '/dashboard';
  }

  return input;
}

export function resolveRequestOrigin(req: ApiRequest): string {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'];
  const hostHeader = req.headers.host;

  const proto = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto?.split(',')[0]?.trim() || (env.isProd ? 'https' : 'http');

  const host = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : forwardedHost?.split(',')[0]?.trim() || hostHeader;

  if (!host) {
    return env.FRONTEND_URL;
  }

  return `${proto}://${host}`;
}

export function resolveOAuthRedirectUri(req: ApiRequest): string {
  return `${resolveRequestOrigin(req)}${env.API_BASE_PATH}/auth/meta/callback`;
}

export function setSessionCookie(res: NextApiResponse, payload: SessionPayload): void {
  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: `${env.SESSION_TTL_DAYS}d`,
  });

  setCookie(res, env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    path: '/',
    maxAgeSeconds: env.SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(res: NextApiResponse): void {
  clearCookie(res, env.SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    path: '/',
  });
}

export function setOAuthCookies(
  req: ApiRequest,
  res: NextApiResponse,
  nextPath: string,
): { state: string; redirectUri: string; frontendOrigin: string } {
  const state = crypto.randomBytes(24).toString('hex');
  const redirectUri = resolveOAuthRedirectUri(req);
  const frontendOrigin = resolveRequestOrigin(req);

  const options = {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAgeSeconds: 10 * 60,
  };

  setCookie(res, OAuthCookieNames.state, state, options);
  setCookie(res, OAuthCookieNames.nextPath, nextPath, options);
  setCookie(res, OAuthCookieNames.redirectUri, redirectUri, options);
  setCookie(res, OAuthCookieNames.frontendOrigin, frontendOrigin, options);

  return { state, redirectUri, frontendOrigin };
}

export function clearOAuthCookies(res: NextApiResponse): void {
  const options = {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax' as const,
    path: '/',
  };

  clearCookie(res, OAuthCookieNames.state, options);
  clearCookie(res, OAuthCookieNames.nextPath, options);
  clearCookie(res, OAuthCookieNames.redirectUri, options);
  clearCookie(res, OAuthCookieNames.frontendOrigin, options);
}
