import { describe, it, expect } from 'vitest';
import { PublishFunnelSchema } from '../adSchemas';

const valid = {
  campaign: { name: 'C', objective: 'OUTCOME_SALES', special_ad_categories: [] },
  adSet: {
    name: 'AS',
    daily_budget: 500,
    optimization_goal: 'OFFSITE_CONVERSIONS',
    billing_event: 'IMPRESSIONS',
    targeting: { geo_locations: { countries: ['US'] }, age_min: 18, age_max: 65 },
    promoted_object: { pixel_id: 'px1', custom_event_type: 'PURCHASE' },
  },
  ad: { name: 'AD', object_story_id: '111_222' },
};

describe('PublishFunnelSchema', () => {
  it('принимает валидный funnel', () => {
    expect(PublishFunnelSchema.safeParse(valid).success).toBe(true);
  });

  it('требует countries в гео', () => {
    const bad = {
      ...valid,
      adSet: {
        ...valid.adSet,
        targeting: { geo_locations: { countries: [] }, age_min: 18, age_max: 65 },
      },
    };
    expect(PublishFunnelSchema.safeParse(bad).success).toBe(false);
  });

  it('требует положительный бюджет', () => {
    const bad = { ...valid, adSet: { ...valid.adSet, daily_budget: 0 } };
    expect(PublishFunnelSchema.safeParse(bad).success).toBe(false);
  });

  it('требует pixel_id при OFFSITE_CONVERSIONS', () => {
    const bad = { ...valid, adSet: { ...valid.adSet, promoted_object: undefined } };
    expect(PublishFunnelSchema.safeParse(bad).success).toBe(false);
  });
});
