import { describe, it, expect } from 'vitest';
import { buildPublishPayload, defaultWizardState, toMinorUnits, type WizardState } from '../adWizard';

function stateWith(overrides: (s: WizardState) => void): WizardState {
  const s = defaultWizardState();
  overrides(s);
  return s;
}

describe('toMinorUnits', () => {
  it('конвертирует валюту в центы', () => {
    expect(toMinorUnits(5)).toBe(500);
    expect(toMinorUnits(5.49)).toBe(549);
  });
});

describe('buildPublishPayload', () => {
  it('переводит дневной бюджет группы в центы', () => {
    const s = stateWith((x) => {
      x.adSet.dailyBudget = 5;
    });
    expect(buildPublishPayload(s).adSet.daily_budget).toBe(500);
  });

  it('включает promoted_object только при OFFSITE_CONVERSIONS + pixel', () => {
    const without = stateWith((x) => {
      x.adSet.optimization_goal = 'LINK_CLICKS';
    });
    expect(buildPublishPayload(without).adSet.promoted_object).toBeUndefined();

    const withConv = stateWith((x) => {
      x.adSet.optimization_goal = 'OFFSITE_CONVERSIONS';
      x.adSet.pixel_id = 'px1';
      x.adSet.custom_event_type = 'LEAD';
    });
    expect(buildPublishPayload(withConv).adSet.promoted_object).toEqual({
      pixel_id: 'px1',
      custom_event_type: 'LEAD',
    });
  });

  it('маппит интересы в flexible_spec', () => {
    const s = stateWith((x) => {
      x.adSet.targeting.interests = [{ id: 'i1', name: 'Cats' }];
    });
    const t = buildPublishPayload(s).adSet.targeting as { flexible_spec?: unknown[] };
    expect(t.flexible_spec).toEqual([{ interests: [{ id: 'i1', name: 'Cats' }] }]);
  });

  it('пропускает пустые опциональные поля таргетинга', () => {
    const s = defaultWizardState();
    const t = buildPublishPayload(s).adSet.targeting as Record<string, unknown>;
    expect(t.genders).toBeUndefined();
    expect(t.flexible_spec).toBeUndefined();
    expect(t.custom_audiences).toBeUndefined();
    expect((t.geo_locations as { countries: string[] }).countries).toEqual(['US']);
  });

  it('передаёт object_story_id в объявление', () => {
    const s = stateWith((x) => {
      x.ad.object_story_id = '111_222';
    });
    expect(buildPublishPayload(s).ad.object_story_id).toBe('111_222');
  });
});
