import type { NextApiResponse } from 'next';
import { withApi, type ApiRequest } from '../../lib/server/api/http';

async function handler(_req: ApiRequest, res: NextApiResponse): Promise<void> {
  res.status(200).json({ ok: true, service: 'meta-analytics-next' });
}

export default withApi(handler, {
  methods: ['GET'],
  skipInit: true,
});
