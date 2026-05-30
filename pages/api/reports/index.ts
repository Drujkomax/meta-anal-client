import { reportsHandler } from '../../../lib/server/api/handlers/reportHandlers';
import { withApi } from '../../../lib/server/api/http';

export default withApi(reportsHandler, { methods: ['GET'], requireAuth: true });
