import { audiencesHandler } from '../../../lib/server/api/handlers/metaLookupHandlers';
import { withApi } from '../../../lib/server/api/http';

export default withApi(audiencesHandler, { methods: ['GET'], requireAuth: true });
