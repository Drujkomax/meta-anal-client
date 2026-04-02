import { meHandler } from '../../../lib/server/api/handlers/authHandlers';
import { withApi } from '../../../lib/server/api/http';

export default withApi(meHandler, {
  methods: ['GET'],
  skipInit: true,
});
