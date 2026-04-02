import { getCampaignHandler } from '../../../lib/server/api/handlers/hierarchyHandlers';
import { withApi } from '../../../lib/server/api/http';

export default withApi(getCampaignHandler, {
  methods: ['GET'],
  requireAuth: true,
});
