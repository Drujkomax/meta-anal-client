import { listAccountsHandler } from '../../lib/server/api/handlers/accountHandlers';
import { withApi } from '../../lib/server/api/http';

export default withApi(listAccountsHandler, {
  methods: ['GET'],
  requireAuth: true,
});
