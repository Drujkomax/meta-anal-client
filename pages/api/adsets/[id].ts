import type { NextApiResponse } from 'next';
import { getAdSetHandler } from '../../../lib/server/api/handlers/hierarchyHandlers';
import { makeUpdateHandler } from '../../../lib/server/api/handlers/adManagementHandlers';
import { withApi, type ApiRequest } from '../../../lib/server/api/http';

const update = makeUpdateHandler('adset');

export default withApi(
  async (req: ApiRequest, res: NextApiResponse) => {
    if (req.method === 'GET') return getAdSetHandler(req, res);
    return update(req, res);
  },
  { methods: ['GET', 'PATCH', 'DELETE'], requireAuth: true },
);
