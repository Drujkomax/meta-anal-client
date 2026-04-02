import { getAnalyticsCrossAccountHandler } from '../../../lib/server/api/handlers/analyticsHandlers';
import { withApi } from '../../../lib/server/api/http';

export default withApi(getAnalyticsCrossAccountHandler, {
  methods: ['GET'],
  requireAuth: true,
});
