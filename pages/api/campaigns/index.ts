import { getCampaignsHandler } from '../../../lib/server/api/handlers/hierarchyHandlers';
import { withApi } from '../../../lib/server/api/http';

export default withApi(getCampaignsHandler, {
  methods: ['GET'],
  requireAuth: true,
});
