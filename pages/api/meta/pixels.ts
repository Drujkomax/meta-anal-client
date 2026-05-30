import { pixelsHandler } from '../../../lib/server/api/handlers/metaLookupHandlers';
import { withApi } from '../../../lib/server/api/http';

export default withApi(pixelsHandler, { methods: ['GET'], requireAuth: true });
