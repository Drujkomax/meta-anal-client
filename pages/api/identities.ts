import { getIdentitiesHandler } from '../../lib/server/api/handlers/identityHandlers';
import { withApi } from '../../lib/server/api/http';

export default withApi(getIdentitiesHandler, {
  methods: ['GET'],
  requireAuth: true,
});
