import { getAnalyticsHandler } from '../../../lib/server/api/handlers/analyticsHandlers';
import { withApi } from '../../../lib/server/api/http';

export default withApi(getAnalyticsHandler, {
  methods: ['GET'],
  requireAuth: true,
});
