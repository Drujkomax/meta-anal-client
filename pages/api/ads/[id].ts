import { getAdHandler } from '../../../lib/server/api/handlers/hierarchyHandlers';
import { withApi } from '../../../lib/server/api/http';

export default withApi(getAdHandler, {
  methods: ['GET'],
  requireAuth: true,
});
