import { logoutHandler } from '../../../lib/server/api/handlers/authHandlers';
import { withApi } from '../../../lib/server/api/http';

export default withApi(logoutHandler, {
  methods: ['POST'],
  skipInit: true,
});
