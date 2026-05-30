import { pagesHandler } from '../../../lib/server/api/handlers/metaLookupHandlers';
import { withApi } from '../../../lib/server/api/http';

export default withApi(pagesHandler, { methods: ['GET'], requireAuth: true });
