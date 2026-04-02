import { getAnalyticsTrendsHandler } from '../../../lib/server/api/handlers/analyticsHandlers';
import { withApi } from '../../../lib/server/api/http';

export default withApi(getAnalyticsTrendsHandler, {
  methods: ['GET'],
  requireAuth: true,
});
