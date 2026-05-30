// ---------------------------------------------------------------------------
// Create-Ad wizard: client-side state, constants, and the pure payload builder.
// buildPublishPayload() is unit-tested and converts the wizard state into the
// body accepted by POST /api/ads/publish (validated server-side by Zod).
// ---------------------------------------------------------------------------

export type Objective =
  | 'OUTCOME_SALES'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_APP_PROMOTION';

export const OBJECTIVES: { value: Objective; label: string }[] = [
  { value: 'OUTCOME_SALES', label: 'Sales / Продажи' },
  { value: 'OUTCOME_LEADS', label: 'Leads / Лиды' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement / Вовлечённость' },
  { value: 'OUTCOME_TRAFFIC', label: 'Traffic / Трафик' },
  { value: 'OUTCOME_AWARENESS', label: 'Awareness / Узнаваемость' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'App Promotion / Приложение' },
];

export const SPECIAL_CATEGORIES: string[] = [
  'HOUSING',
  'EMPLOYMENT',
  'CREDIT',
  'ISSUES_ELECTIONS_POLITICS',
];

export const OPTIMIZATION_GOALS: string[] = [
  'OFFSITE_CONVERSIONS',
  'LINK_CLICKS',
  'LANDING_PAGE_VIEWS',
  'REACH',
  'IMPRESSIONS',
  'POST_ENGAGEMENT',
  'LEAD_GENERATION',
];

export const EVENT_TYPES: string[] = [
  'PURCHASE',
  'LEAD',
  'COMPLETE_REGISTRATION',
  'ADD_TO_CART',
  'INITIATED_CHECKOUT',
  'ADD_PAYMENT_INFO',
  'SUBSCRIBE',
  'CONTENT_VIEW',
];

export const PLACEMENTS: string[] = ['facebook', 'instagram', 'audience_network', 'messenger'];

export interface WizardTargeting {
  countries: string[];
  age_min: number;
  age_max: number;
  genders: number[];
  interests: { id: string; name: string }[];
  custom_audiences: { id: string; name: string }[];
  excluded_custom_audiences: { id: string; name: string }[];
  publisher_platforms: string[];
}

export interface WizardState {
  campaign: {
    name: string;
    objective: Objective;
    special_ad_categories: string[];
    dailyBudget?: number;
  };
  adSet: {
    name: string;
    dailyBudget?: number;
    optimization_goal: string;
    billing_event: string;
    start_time?: string;
    end_time?: string;
    targeting: WizardTargeting;
    pixel_id?: string;
    custom_event_type?: string;
  };
  ad: {
    name: string;
    page_id?: string;
    object_story_id?: string;
  };
}

export interface PublishPayload {
  campaign: {
    name: string;
    objective: Objective;
    special_ad_categories: string[];
    daily_budget?: number;
  };
  adSet: {
    name: string;
    daily_budget?: number;
    optimization_goal: string;
    billing_event: string;
    start_time?: string;
    end_time?: string;
    targeting: Record<string, unknown>;
    promoted_object?: { pixel_id: string; custom_event_type: string };
  };
  ad: {
    name: string;
    object_story_id: string;
  };
}

export function defaultWizardState(): WizardState {
  return {
    campaign: {
      name: '',
      objective: 'OUTCOME_TRAFFIC',
      special_ad_categories: [],
      dailyBudget: undefined,
    },
    adSet: {
      name: '',
      dailyBudget: 5,
      optimization_goal: 'LINK_CLICKS',
      billing_event: 'IMPRESSIONS',
      targeting: {
        countries: ['US'],
        age_min: 18,
        age_max: 65,
        genders: [],
        interests: [],
        custom_audiences: [],
        excluded_custom_audiences: [],
        publisher_platforms: [],
      },
    },
    ad: { name: '' },
  };
}

/** Convert a currency amount (e.g. 5.00) into Meta minor units (cents). */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

/** Pure mapping from wizard state to the publish API body. */
export function buildPublishPayload(s: WizardState): PublishPayload {
  const t = s.adSet.targeting;

  const targeting: Record<string, unknown> = {
    geo_locations: { countries: t.countries },
    age_min: t.age_min,
    age_max: t.age_max,
  };
  if (t.genders.length) targeting.genders = t.genders;
  if (t.interests.length) {
    targeting.flexible_spec = [{ interests: t.interests.map((i) => ({ id: i.id, name: i.name })) }];
  }
  if (t.custom_audiences.length) {
    targeting.custom_audiences = t.custom_audiences.map((a) => ({ id: a.id }));
  }
  if (t.excluded_custom_audiences.length) {
    targeting.excluded_custom_audiences = t.excluded_custom_audiences.map((a) => ({ id: a.id }));
  }
  if (t.publisher_platforms.length) targeting.publisher_platforms = t.publisher_platforms;

  const useConversions = s.adSet.optimization_goal === 'OFFSITE_CONVERSIONS' && !!s.adSet.pixel_id;

  return {
    campaign: {
      name: s.campaign.name,
      objective: s.campaign.objective,
      special_ad_categories: s.campaign.special_ad_categories,
      ...(s.campaign.dailyBudget ? { daily_budget: toMinorUnits(s.campaign.dailyBudget) } : {}),
    },
    adSet: {
      name: s.adSet.name,
      ...(s.adSet.dailyBudget ? { daily_budget: toMinorUnits(s.adSet.dailyBudget) } : {}),
      optimization_goal: s.adSet.optimization_goal,
      billing_event: s.adSet.billing_event,
      ...(s.adSet.start_time ? { start_time: s.adSet.start_time } : {}),
      ...(s.adSet.end_time ? { end_time: s.adSet.end_time } : {}),
      targeting,
      ...(useConversions
        ? {
            promoted_object: {
              pixel_id: s.adSet.pixel_id as string,
              custom_event_type: s.adSet.custom_event_type || 'PURCHASE',
            },
          }
        : {}),
    },
    ad: {
      name: s.ad.name,
      object_story_id: s.ad.object_story_id ?? '',
    },
  };
}
