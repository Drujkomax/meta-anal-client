import { publishHandler } from '../../../lib/server/api/handlers/adManagementHandlers';
import { withApi } from '../../../lib/server/api/http';

export default withApi(publishHandler, { methods: ['POST'], requireAuth: true });
