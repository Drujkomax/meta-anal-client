import { disconnectIdentityHandler } from '../../../lib/server/api/handlers/identityHandlers';
import { withApi } from '../../../lib/server/api/http';

export default withApi(disconnectIdentityHandler, {
  methods: ['DELETE'],
  requireAuth: true,
});
