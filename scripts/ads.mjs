#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Meta Ads CLI — управление рекламой Meta прямо из терминала.
//
// Самодостаточный скрипт: читает META_USER_TOKEN из .env и работает напрямую
// с Graph API. Зависит только от Node 18+ (fetch) и (для xlsx) от exceljs.
//
// Безопасность: все создаваемые объекты по умолчанию PAUSED (траты не идут,
// пока вы явно не активируете).  Запустите без аргументов для справки.
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---- .env loader -----------------------------------------------------------
function loadEnv() {
  const env = { ...process.env };
  for (const file of ['.env.local', '.env']) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i <= 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (env[k] === undefined) env[k] = v;
    }
  }
  return env;
}

const ENV = loadEnv();
const VER = ENV.META_GRAPH_VERSION || 'v23.0';
const BASE = `https://graph.facebook.com/${VER}`;
let TOKEN = ENV.META_USER_TOKEN;
const APP_ID = ENV.META_APP_ID;
const APP_SECRET = ENV.META_APP_SECRET;

function die(msg) {
  console.error('✖ ' + msg);
  process.exit(1);
}
function out(obj) {
  console.log(JSON.stringify(obj, null, 2));
}
function need(args, keys) {
  for (const k of keys) if (args[k] === undefined) die(`Не хватает аргумента --${k}`);
}
const acct = (a) => (String(a).startsWith('act_') ? String(a) : `act_${a}`);

// ---- arg parsing -----------------------------------------------------------
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else {
        out[key] = next;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

// ---- Graph API helper ------------------------------------------------------
async function graph(method, endpoint, params = {}) {
  const url = new URL(BASE + endpoint);
  const payload = { access_token: TOKEN, ...params };
  let res;
  if (method === 'GET' || method === 'DELETE') {
    for (const [k, v] of Object.entries(payload)) {
      url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
    res = await fetch(url, { method });
  } else {
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(payload)) {
      form.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
    res = await fetch(url, { method: 'POST', body: form });
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    const e = json.error || {};
    const code = `${e.code ?? res.status}${e.error_subcode ? '/' + e.error_subcode : ''}`;
    throw new Error(`Meta API [${code}]: ${e.error_user_msg || e.message || res.statusText}`);
  }
  return json;
}

const INSIGHT_FIELDS = 'campaign_name,adset_name,ad_name,spend,impressions,reach,clicks,ctr,cpc,cpm';
const REPORT_COLS = ['campaign_name', 'adset_name', 'ad_name', 'spend', 'impressions', 'reach', 'clicks', 'ctr', 'cpc', 'cpm'];

function insightParams(args) {
  const params = { level: args.level || 'campaign', fields: INSIGHT_FIELDS, limit: 500 };
  if (args.since && args.until) params.time_range = { since: args.since, until: args.until };
  else params.date_preset = args.preset || 'last_30d';
  return params;
}

// ---- commands --------------------------------------------------------------
const commands = {
  async 'token:refresh'() {
    if (!APP_ID || !APP_SECRET) die('Нужны META_APP_ID и META_APP_SECRET в .env');
    const url = new URL(BASE + '/oauth/access_token');
    url.searchParams.set('grant_type', 'fb_exchange_token');
    url.searchParams.set('client_id', APP_ID);
    url.searchParams.set('client_secret', APP_SECRET);
    url.searchParams.set('fb_exchange_token', TOKEN);
    const r = await (await fetch(url)).json();
    if (r.error) die(r.error.message);
    out({ long_lived_token: r.access_token, expires_in_days: Math.round((r.expires_in || 0) / 86400) });
    console.error('→ Вставьте этот токен в .env как META_USER_TOKEN');
  },

  async whoami() {
    const me = await graph('GET', '/me', { fields: 'id,name' });
    out(me);
  },

  async accounts() {
    const r = await graph('GET', '/me/adaccounts', {
      fields: 'id,account_id,name,currency,account_status,business{name}',
      limit: 200,
    });
    console.table(r.data.map((a) => ({ id: a.id, name: a.name, currency: a.currency, status: a.account_status })));
  },

  async pages() {
    const r = await graph('GET', '/me/accounts', { fields: 'id,name', limit: 200 });
    console.table(r.data);
  },

  async posts(args) {
    need(args, ['page']);
    const r = await graph('GET', `/${args.page}/ads_posts`, { fields: 'id,message,created_time', limit: 50 });
    console.table(r.data.map((p) => ({ id: p.id, message: (p.message || '').slice(0, 60), created: p.created_time })));
  },

  async pixels(args) {
    need(args, ['account']);
    const r = await graph('GET', `/${acct(args.account)}/adspixels`, { fields: 'id,name' });
    console.table(r.data);
  },

  async audiences(args) {
    need(args, ['account']);
    const r = await graph('GET', `/${acct(args.account)}/customaudiences`, {
      fields: 'id,name,subtype,approximate_count',
      limit: 200,
    });
    console.table(r.data);
  },

  async interests(args) {
    need(args, ['q']);
    const r = await graph('GET', '/search', { type: 'adinterest', q: args.q, limit: 25 });
    console.table(r.data.map((i) => ({ id: i.id, name: i.name, audience: i.audience_size_lower_bound })));
  },

  async campaigns(args) {
    need(args, ['account']);
    const r = await graph('GET', `/${acct(args.account)}/campaigns`, {
      fields: 'id,name,objective,status,effective_status,daily_budget,lifetime_budget',
      limit: 200,
    });
    console.table(r.data);
  },

  async adsets(args) {
    need(args, ['account']);
    const parent = args.campaign || acct(args.account);
    const r = await graph('GET', `/${parent}/adsets`, {
      fields: 'id,name,campaign_id,optimization_goal,status,effective_status,daily_budget',
      limit: 200,
    });
    console.table(r.data);
  },

  async ads(args) {
    need(args, ['account']);
    const parent = args.adset || acct(args.account);
    const r = await graph('GET', `/${parent}/ads`, {
      fields: 'id,name,adset_id,status,effective_status',
      limit: 200,
    });
    console.table(r.data);
  },

  async 'campaign:create'(args) {
    need(args, ['account', 'name', 'objective']);
    const payload = {
      name: args.name,
      objective: args.objective,
      status: args.status || 'PAUSED',
      special_ad_categories: args['special-categories'] ? String(args['special-categories']).split(',') : [],
    };
    if (args['daily-budget']) payload.daily_budget = Number(args['daily-budget']);
    if (args['bid-strategy']) payload.bid_strategy = args['bid-strategy'];
    const r = await graph('POST', `/${acct(args.account)}/campaigns`, payload);
    out({ created: 'campaign', id: r.id, status: payload.status });
  },

  async 'adset:create'(args) {
    need(args, ['account', 'campaign', 'name', 'optimization', 'billing']);
    const targeting = args['targeting-file']
      ? JSON.parse(fs.readFileSync(args['targeting-file'], 'utf8'))
      : args.targeting
        ? JSON.parse(args.targeting)
        : {
            geo_locations: { countries: args.countries ? String(args.countries).split(',') : ['US'] },
            age_min: Number(args['age-min'] || 18),
            age_max: Number(args['age-max'] || 65),
          };
    const payload = {
      name: args.name,
      campaign_id: args.campaign,
      status: args.status || 'PAUSED',
      optimization_goal: args.optimization,
      billing_event: args.billing,
      targeting,
    };
    if (args['daily-budget']) payload.daily_budget = Number(args['daily-budget']);
    if (args.pixel && args.event) payload.promoted_object = { pixel_id: args.pixel, custom_event_type: args.event };
    if (args['start-time']) payload.start_time = args['start-time'];
    if (args['end-time']) payload.end_time = args['end-time'];
    const r = await graph('POST', `/${acct(args.account)}/adsets`, payload);
    out({ created: 'adset', id: r.id, status: payload.status });
  },

  async 'ad:create'(args) {
    need(args, ['account', 'adset', 'name', 'post']);
    const creative = await graph('POST', `/${acct(args.account)}/adcreatives`, {
      name: `${args.name} creative`,
      object_story_id: args.post,
    });
    const r = await graph('POST', `/${acct(args.account)}/ads`, {
      name: args.name,
      adset_id: args.adset,
      status: args.status || 'PAUSED',
      creative: { creative_id: creative.id },
    });
    out({ created: 'ad', id: r.id, creative_id: creative.id, status: args.status || 'PAUSED' });
  },

  // Полный funnel из JSON-файла: { campaign, adSet, ad } (см. CLAUDE.md)
  async publish(args) {
    need(args, ['account', 'file']);
    const f = JSON.parse(fs.readFileSync(args.file, 'utf8'));
    const id = acct(args.account);
    const created = {};
    try {
      const c = await graph('POST', `/${id}/campaigns`, {
        ...f.campaign,
        status: 'PAUSED',
        special_ad_categories: f.campaign.special_ad_categories || [],
      });
      created.campaign = c.id;
      const as = await graph('POST', `/${id}/adsets`, {
        ...f.adSet,
        campaign_id: c.id,
        status: 'PAUSED',
      });
      created.adset = as.id;
      const cr = await graph('POST', `/${id}/adcreatives`, {
        name: `${f.ad.name} creative`,
        object_story_id: f.ad.object_story_id,
      });
      const ad = await graph('POST', `/${id}/ads`, {
        name: f.ad.name,
        adset_id: as.id,
        status: 'PAUSED',
        creative: { creative_id: cr.id },
      });
      out({ created: 'funnel', campaign: c.id, adset: as.id, ad: ad.id, note: 'всё PAUSED — активируйте командой status' });
    } catch (e) {
      if (created.adset) await graph('DELETE', `/${created.adset}`).catch(() => {});
      if (created.campaign) await graph('DELETE', `/${created.campaign}`).catch(() => {});
      die('Публикация не удалась, изменения откатаны: ' + e.message);
    }
  },

  async status(args) {
    need(args, ['id', 'status']);
    await graph('POST', `/${args.id}`, { status: args.status });
    out({ updated: args.id, status: args.status });
  },

  async budget(args) {
    need(args, ['id', 'daily']);
    await graph('POST', `/${args.id}`, { daily_budget: Number(args.daily) });
    out({ updated: args.id, daily_budget: Number(args.daily) });
  },

  async delete(args) {
    need(args, ['id']);
    await graph('DELETE', `/${args.id}`);
    out({ deleted: args.id });
  },

  async insights(args) {
    need(args, ['account']);
    const r = await graph('GET', `/${acct(args.account)}/insights`, insightParams(args));
    console.table(
      r.data.map((d) => ({
        name: d.ad_name || d.adset_name || d.campaign_name,
        spend: d.spend,
        impr: d.impressions,
        clicks: d.clicks,
        ctr: Number(d.ctr || 0).toFixed(2),
        cpc: Number(d.cpc || 0).toFixed(2),
      })),
    );
  },

  async export(args) {
    need(args, ['account', 'format']);
    const r = await graph('GET', `/${acct(args.account)}/insights`, insightParams(args));
    const rows = r.data;
    const file = args.out || `report_${args.level || 'campaign'}.${args.format}`;
    if (args.format === 'csv') {
      const esc = (v) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = ['﻿' + REPORT_COLS.join(',')]
        .concat(rows.map((rw) => REPORT_COLS.map((c) => esc(rw[c])).join(',')))
        .join('\n');
      fs.writeFileSync(file, csv);
    } else if (args.format === 'xlsx') {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Report');
      ws.addRow(REPORT_COLS);
      ws.getRow(1).font = { bold: true };
      rows.forEach((rw) => ws.addRow(REPORT_COLS.map((c) => rw[c] ?? '')));
      ws.columns.forEach((col) => (col.width = 18));
      await wb.xlsx.writeFile(file);
    } else {
      die('format должен быть csv или xlsx');
    }
    out({ exported: file, rows: rows.length });
  },
};

function printHelp() {
  console.log(`
Meta Ads CLI — управление рекламой из терминала.  Использует META_USER_TOKEN из .env.
Все создаваемые объекты по умолчанию PAUSED (без трат).

Просмотр:
  node scripts/ads.mjs whoami
  node scripts/ads.mjs accounts                         # список рекламных аккаунтов
  node scripts/ads.mjs pages                            # страницы FB
  node scripts/ads.mjs posts --page <PAGE_ID>           # посты страницы (для продвижения)
  node scripts/ads.mjs pixels --account <act_..>        # пиксели
  node scripts/ads.mjs audiences --account <act_..>     # custom/lookalike аудитории
  node scripts/ads.mjs interests --q "fitness"          # поиск интересов
  node scripts/ads.mjs campaigns --account <act_..>
  node scripts/ads.mjs adsets --account <act_..> [--campaign <id>]
  node scripts/ads.mjs ads --account <act_..> [--adset <id>]

Создание:
  node scripts/ads.mjs campaign:create --account <act_..> --name "X" --objective OUTCOME_TRAFFIC [--daily-budget 500] [--special-categories ""]
  node scripts/ads.mjs adset:create --account <act_..> --campaign <id> --name "X" --optimization LINK_CLICKS --billing IMPRESSIONS --daily-budget 500 [--countries US,GB] [--age-min 18 --age-max 65] [--targeting-file t.json] [--pixel <id> --event PURCHASE]
  node scripts/ads.mjs ad:create --account <act_..> --adset <id> --name "X" --post <PAGEID_POSTID>
  node scripts/ads.mjs publish --account <act_..> --file funnel.json    # вся воронка сразу (с откатом при сбое)

Управление:
  node scripts/ads.mjs status --id <id> --status ACTIVE|PAUSED
  node scripts/ads.mjs budget --id <id> --daily 1000                    # дневной бюджет в центах
  node scripts/ads.mjs delete --id <id>

Отчёты / выгрузка:
  node scripts/ads.mjs insights --account <act_..> [--level campaign|adset|ad] [--since 2026-05-01 --until 2026-05-30] [--preset last_30d]
  node scripts/ads.mjs export --account <act_..> --format csv|xlsx [--level ad] [--since .. --until ..] [--out file]

Токен:
  node scripts/ads.mjs token:refresh                    # обменять на новый долгоживущий (~60 дней)

Бюджеты задаются в МИНОРНЫХ единицах валюты (центах): 500 = $5.00.
`);
}

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0];

(async () => {
  if (!cmd || cmd === 'help' || args.help) {
    printHelp();
    return;
  }
  if (!TOKEN) die('Нет META_USER_TOKEN в .env. Добавьте долгоживущий токен (или запустите token:refresh).');
  const fn = commands[cmd];
  if (!fn) die(`Неизвестная команда: ${cmd}.  Справка: node scripts/ads.mjs help`);
  try {
    await fn(args);
  } catch (e) {
    die(e.message);
  }
})();
