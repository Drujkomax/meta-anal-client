import { startMetaLoginHandler } from '../../../../lib/server/api/handlers/authHandlers';
import { withApi } from '../../../../lib/server/api/http';

export default withApi(startMetaLoginHandler, {
  methods: ['GET'],
  skipInit: true,
});
