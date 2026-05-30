import type { NextApiResponse } from 'next';
import dayjs from 'dayjs';
import { getAccountByIdForMetaUsers } from '../../services/accountService';
import { buildReport, type ReportLevel } from '../../services/reportService';
import { reportToCsv } from '../../services/exporters/csv';
import { reportToXlsx } from '../../services/exporters/xlsx';
import { createHttpError, type ApiRequest } from '../http';

const LEVELS: ReportLevel[] = ['campaign', 'adset', 'ad'];

function qv(v: string | string[] | undefined): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v.length) return v[0];
  return undefined;
}

function resolveLevel(v: string | undefined): ReportLevel {
  return LEVELS.includes(v as ReportLevel) ? (v as ReportLevel) : 'campaign';
}

function resolveRange(req: ApiRequest): { from: string; to: string } {
  const from = qv(req.query.date_from);
  const to = qv(req.query.date_to);
  const toD = to && dayjs(to).isValid() ? dayjs(to) : dayjs();
  const fromD = from && dayjs(from).isValid() ? dayjs(from) : toD.subtract(29, 'day');
  return { from: fromD.format('YYYY-MM-DD'), to: toD.format('YYYY-MM-DD') };
}

async function resolveAccount(req: ApiRequest) {
  if (!req.user) throw createHttpError(401, 'Authentication required');
  const accountId = qv(req.query.account_id);
  if (!accountId) throw createHttpError(400, 'Missing query param: account_id');
  const account = await getAccountByIdForMetaUsers(accountId, req.user.metaUserIds);
  if (!account) throw createHttpError(404, 'Account not found for current user');
  return account;
}

export async function reportsHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  const account = await resolveAccount(req);
  const level = resolveLevel(qv(req.query.level));
  const { from, to } = resolveRange(req);
  const data = await buildReport(account.id, level, from, to);
  res.status(200).json({ data, level, dateRange: { from, to } });
}

export async function reportsExportHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  const account = await resolveAccount(req);
  const level = resolveLevel(qv(req.query.level));
  const format = (qv(req.query.format) || 'csv').toLowerCase();
  const { from, to } = resolveRange(req);
  const rows = await buildReport(account.id, level, from, to);
  const fname = `report_${level}_${from}_${to}`;

  if (format === 'xlsx') {
    const buf = await reportToXlsx(rows, level);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fname}.xlsx"`);
    res.status(200).send(buf);
    return;
  }

  const csv = reportToCsv(rows, level);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fname}.csv"`);
  // UTF-8 BOM so Excel opens Cyrillic correctly
  res.status(200).send('﻿' + csv);
}
