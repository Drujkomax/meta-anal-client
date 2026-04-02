import { getAdSetHandler } from '../../../lib/server/api/handlers/hierarchyHandlers';
import { withApi } from '../../../lib/server/api/http';

export default withApi(getAdSetHandler, {
  methods: ['GET'],
  requireAuth: true,
});
