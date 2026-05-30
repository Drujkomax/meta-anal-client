import { pagePostsHandler } from '../../../../../lib/server/api/handlers/metaLookupHandlers';
import { withApi } from '../../../../../lib/server/api/http';

export default withApi(pagePostsHandler, { methods: ['GET'], requireAuth: true });
