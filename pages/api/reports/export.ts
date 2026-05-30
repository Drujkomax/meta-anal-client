import { reportsExportHandler } from '../../../lib/server/api/handlers/reportHandlers';
import { withApi } from '../../../lib/server/api/http';

export default withApi(reportsExportHandler, { methods: ['GET'], requireAuth: true });
