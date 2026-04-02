import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { initializeInfrastructure } from '../init';

interface SessionPayload {
  metaUserId?: string;
  metaUserIds?: string[];
  activeMetaUserId?: string;
  name?: string;
}

export interface SessionUser {
  metaUserId: string;
  metaUserIds: string[];
  name?: string;
}

export interface ApiRequest extends NextApiRequest {
  user?: SessionUser;
}

interface HttpError extends Error {
  statusCode?: number;
  status?: number;
  code?: string;
}

interface WithApiOptions {
  methods: Array<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS'>;
  requireAuth?: boolean;
  skipInit?: boolean;
}

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  path?: string;
  maxAgeSeconds?: number;
  expires?: Date;
}

function normalizeMetaUserIds(payload: SessionPayload): string[] {
  const ids = payload.metaUserIds?.length
    ? payload.metaUserIds
    : payload.metaUserId
      ? [payload.metaUserId]
      : [];
  return Array.from(new Set(ids.filter(Boolean)));
}

function decodeSession(token?: string): SessionPayload | null {
  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, env.JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

function attachUserIfPresent(req: ApiRequest): void {
  const token = req.cookies?.[env.SESSION_COOKIE_NAME];
  const payload = decodeSession(token);

  if (!payload) {
    return;
  }

  const metaUserIds = normalizeMetaUserIds(payload);
  if (!metaUserIds.length) {
    return;
  }

  const activeMetaUserId =
    payload.activeMetaUserId && metaUserIds.includes(payload.activeMetaUserId)
      ? payload.activeMetaUserId
      : metaUserIds[0];

  req.user = {
    metaUserId: activeMetaUserId,
    metaUserIds,
    name: payload.name,
  };
}

function appendSetCookie(res: NextApiResponse, cookie: string): void {
  const current = res.getHeader('Set-Cookie');
  if (!current) {
    res.setHeader('Set-Cookie', [cookie]);
    return;
  }

  const arr = Array.isArray(current) ? current.map(String) : [String(current)];
  arr.push(cookie);
  res.setHeader('Set-Cookie', arr);
}

export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const encodedValue = encodeURIComponent(value);
  const parts = [`${name}=${encodedValue}`];

  parts.push(`Path=${options.path ?? '/'}`);

  if (typeof options.maxAgeSeconds === 'number') {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`);
  }

  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }

  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  if (options.secure) {
    parts.push('Secure');
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  return parts.join('; ');
}

export function setCookie(
  res: NextApiResponse,
  name: string,
  value: string,
  options: CookieOptions = {},
): void {
  appendSetCookie(res, serializeCookie(name, value, options));
}

export function clearCookie(
  res: NextApiResponse,
  name: string,
  options: CookieOptions = {},
): void {
  appendSetCookie(
    res,
    serializeCookie(name, '', {
      ...options,
      maxAgeSeconds: 0,
      expires: new Date(0),
    }),
  );
}

function toStatusCode(error: unknown): number {
  const err = error as HttpError;
  const status = err.statusCode || err.status;
  if (typeof status === 'number' && status >= 400 && status < 600) {
    return status;
  }
  return 500;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Internal server error';
}

function hasAnyErrorCode(error: unknown, expectedCodes: Set<string>): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = (error as HttpError).code;
  if (typeof code === 'string' && expectedCodes.has(code)) {
    return true;
  }

  if (error instanceof AggregateError) {
    return error.errors.some((item) => hasAnyErrorCode(item, expectedCodes));
  }

  return false;
}

function isDatabaseUnavailableError(error: unknown): boolean {
  const networkCodes = new Set([
    'ECONNREFUSED',
    'EHOSTUNREACH',
    'ENOTFOUND',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'ECONNRESET',
    '57P01', // admin_shutdown
    '57P03', // cannot_connect_now
  ]);

  if (hasAnyErrorCode(error, networkCodes)) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('connection terminated unexpectedly') ||
      message.includes('connect econnrefused') ||
      message.includes('failed to connect')
    ) {
      return true;
    }
  }

  return false;
}

export function createHttpError(statusCode: number, message: string): Error {
  const error = new Error(message) as HttpError;
  error.statusCode = statusCode;
  return error;
}

export function withApi(
  handler: (req: ApiRequest, res: NextApiResponse) => Promise<void>,
  options: WithApiOptions,
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const apiReq = req as ApiRequest;

    try {
      const method = (apiReq.method || '').toUpperCase();

      if (!options.methods.includes(method as WithApiOptions['methods'][number])) {
        res.setHeader('Allow', options.methods.join(', '));
        throw createHttpError(405, `Method ${method || 'UNKNOWN'} not allowed`);
      }

      attachUserIfPresent(apiReq);

      if (options.requireAuth && !apiReq.user) {
        throw createHttpError(401, 'Authentication required');
      }

      if (!options.skipInit) {
        await initializeInfrastructure();
      }

      await handler(apiReq, res);
    } catch (error) {
      if (res.writableEnded) {
        return;
      }

      let status = toStatusCode(error);
      let message = toErrorMessage(error);

      if (status === 500 && isDatabaseUnavailableError(error)) {
        status = 503;
        message = 'Database is unavailable';
      }

      if (status >= 500) {
        console.error('[api] request failed', {
          method: apiReq.method,
          url: apiReq.url,
          status,
          error,
        });
      }

      const payload: {
        error: {
          message: string;
          stack?: string;
        };
      } = {
        error: { message },
      };

      if (!env.isProd && error instanceof Error) {
        payload.error.stack = error.stack;
      }

      res.status(status).json(payload);
    }
  };
}
