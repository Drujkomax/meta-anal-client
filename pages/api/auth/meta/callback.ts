import { metaCallbackHandler } from '../../../../lib/server/api/handlers/authHandlers';
import { withApi } from '../../../../lib/server/api/http';

export default withApi(metaCallbackHandler, {
  methods: ['GET'],
});
