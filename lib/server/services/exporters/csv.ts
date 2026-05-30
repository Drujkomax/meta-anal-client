import type { ReportRow } from '../../../types';
import { reportColumns, type ReportLevel } from '../reportService';

function esc(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function reportToCsv(rows: ReportRow[], level: ReportLevel): string {
  const cols = reportColumns(level);
  const header = cols.map((c) => esc(c.header)).join(',');
  const body = rows.map((r) => cols.map((c) => esc(c.value(r))).join(','));
  return [header, ...body].join('\n');
}
