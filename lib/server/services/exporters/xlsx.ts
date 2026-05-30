import ExcelJS from 'exceljs';
import type { ReportRow } from '../../../types';
import { reportColumns, type ReportLevel } from '../reportService';

export async function reportToXlsx(rows: ReportRow[], level: ReportLevel): Promise<Buffer> {
  const cols = reportColumns(level);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Report');

  ws.addRow(cols.map((c) => c.header));
  ws.getRow(1).font = { bold: true };

  for (const r of rows) {
    ws.addRow(cols.map((c) => c.value(r)));
  }

  ws.columns.forEach((col) => {
    col.width = 18;
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as unknown as ArrayBuffer);
}
