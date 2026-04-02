import type { NextApiResponse } from 'next';
import {
  getAnalyticsSyncStatusHandler,
  triggerManualSyncHandler,
} from '../../../lib/server/api/handlers/analyticsHandlers';
import { createHttpError, type ApiRequest, withApi } from '../../../lib/server/api/http';

async function handler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method === 'GET') {
    await getAnalyticsSyncStatusHandler(req, res);
    return;
  }

  if (req.method === 'POST') {
    await triggerManualSyncHandler(req, res);
    return;
  }

  throw createHttpError(405, `Method ${req.method || 'UNKNOWN'} not allowed`);
}

export default withApi(handler, {
  methods: ['GET', 'POST'],
  requireAuth: true,
});
