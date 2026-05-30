import { z } from 'zod';

export const TargetingSchema = z.object({
  geo_locations: z.object({
    countries: z.array(z.string()).min(1, 'Укажите хотя бы одну страну'),
    regions: z.array(z.object({ key: z.string() })).optional(),
    cities: z
      .array(
        z.object({
          key: z.string(),
          radius: z.number().optional(),
          distance_unit: z.string().optional(),
        }),
      )
      .optional(),
  }),
  age_min: z.number().int().min(13).max(65),
  age_max: z.number().int().min(13).max(65),
  genders: z.array(z.union([z.literal(1), z.literal(2)])).optional(),
  locales: z.array(z.number()).optional(),
  flexible_spec: z
    .array(
      z.object({
        interests: z.array(z.object({ id: z.string(), name: z.string().optional() })).optional(),
        behaviors: z.array(z.object({ id: z.string(), name: z.string().optional() })).optional(),
      }),
    )
    .optional(),
  exclusions: z
    .object({
      interests: z.array(z.object({ id: z.string() })).optional(),
    })
    .optional(),
  custom_audiences: z.array(z.object({ id: z.string() })).optional(),
  excluded_custom_audiences: z.array(z.object({ id: z.string() })).optional(),
  publisher_platforms: z.array(z.string()).optional(),
  facebook_positions: z.array(z.string()).optional(),
  instagram_positions: z.array(z.string()).optional(),
});

export const CampaignSchema = z.object({
  name: z.string().min(1),
  objective: z.enum([
    'OUTCOME_SALES',
    'OUTCOME_LEADS',
    'OUTCOME_ENGAGEMENT',
    'OUTCOME_TRAFFIC',
    'OUTCOME_AWARENESS',
    'OUTCOME_APP_PROMOTION',
  ]),
  special_ad_categories: z.array(z.string()),
  daily_budget: z.number().int().positive().optional(),
  lifetime_budget: z.number().int().positive().optional(),
  bid_strategy: z.string().optional(),
});

export const PromotedObjectSchema = z.object({
  pixel_id: z.string(),
  custom_event_type: z.string(),
});

export const AdSetSchema = z
  .object({
    name: z.string().min(1),
    daily_budget: z.number().int().positive().optional(),
    lifetime_budget: z.number().int().positive().optional(),
    optimization_goal: z.string().min(1),
    billing_event: z.string().min(1),
    bid_amount: z.number().int().positive().optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    targeting: TargetingSchema,
    promoted_object: PromotedObjectSchema.optional(),
  })
  .refine((s) => s.daily_budget || s.lifetime_budget, {
    message: 'Укажите дневной или общий бюджет',
    path: ['daily_budget'],
  })
  .refine((s) => s.optimization_goal !== 'OFFSITE_CONVERSIONS' || !!s.promoted_object, {
    message: 'Для оптимизации под конверсии нужен пиксель и событие',
    path: ['promoted_object'],
  });

export const AdSchema = z.object({
  name: z.string().min(1),
  object_story_id: z.string().min(1),
});

export const PublishFunnelSchema = z.object({
  campaign: CampaignSchema,
  adSet: AdSetSchema,
  ad: AdSchema,
});

export type PublishFunnelInput = z.infer<typeof PublishFunnelSchema>;
export type TargetingInput = z.infer<typeof TargetingSchema>;
