import { targetingSearchHandler } from '../../../../lib/server/api/handlers/metaLookupHandlers';
import { withApi } from '../../../../lib/server/api/http';

export default withApi(targetingSearchHandler, { methods: ['GET'], requireAuth: true });
