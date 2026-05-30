import { describe, it, expect } from 'vitest';
import { shapeReportRow, reportColumns } from '../reportService';
import { reportToCsv } from '../exporters/csv';
import { reportToXlsx } from '../exporters/xlsx';
import type { ReportRow } from '../../../types';

describe('shapeReportRow', () => {
  it('считает ctr/cpc/cpm', () => {
    const r = shapeReportRow({
      campaign_id: 'c1',
      campaign_name: 'C',
      spend: '100',
      impressions: '1000',
      reach: '800',
      clicks: '50',
      currency: 'USD',
    });
    expect(r.ctr).toBe(5);
    expect(r.cpc).toBe(2);
    expect(r.cpm).toBe(100);
    expect(r.spend).toBe(100);
  });

  it('не делит на ноль и подставляет валюту по умолчанию', () => {
    const r = shapeReportRow({ spend: '0', impressions: '0', reach: '0', clicks: '0', currency: '' });
    expect(r.ctr).toBe(0);
    expect(r.cpc).toBe(0);
    expect(r.cpm).toBe(0);
    expect(r.currency).toBe('USD');
  });
});

describe('reportColumns', () => {
  it('ad level включает Campaign/Ad Set/Ad', () => {
    expect(reportColumns('ad').map((c) => c.header).slice(0, 3)).toEqual(['Campaign', 'Ad Set', 'Ad']);
  });

  it('campaign level включает только Campaign из имён', () => {
    expect(reportColumns('campaign')[0].header).toBe('Campaign');
  });
});

const sample: ReportRow = {
  campaign_name: 'A, B',
  spend: 10,
  impressions: 100,
  reach: 90,
  clicks: 5,
  ctr: 5,
  cpc: 2,
  cpm: 100,
  currency: 'USD',
};

describe('reportToCsv', () => {
  it('строит CSV с заголовком и экранированием запятых', () => {
    const csv = reportToCsv([sample], 'campaign');
    const lines = csv.split('\n');
    expect(lines[0]).toContain('Campaign');
    expect(lines[1]).toContain('"A, B"');
  });
});

describe('reportToXlsx', () => {
  it('возвращает непустой буфер', async () => {
    const buf = await reportToXlsx([sample], 'campaign');
    expect(buf.length).toBeGreaterThan(100);
  });
});
