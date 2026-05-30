import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useLanguage } from './LanguageProvider';

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

const ISO = 'YYYY-MM-DD';

interface Preset {
  key: string;
  labelEn: string;
  labelRu: string;
  get: () => DateRange;
}

function lastDays(days: number): DateRange {
  const to = dayjs();
  return { from: to.subtract(days - 1, 'day').format(ISO), to: to.format(ISO) };
}

const PRESETS: Preset[] = [
  { key: 'today', labelEn: 'Today', labelRu: 'Сегодня', get: () => ({ from: dayjs().format(ISO), to: dayjs().format(ISO) }) },
  { key: 'yesterday', labelEn: 'Yesterday', labelRu: 'Вчера', get: () => ({ from: dayjs().subtract(1, 'day').format(ISO), to: dayjs().subtract(1, 'day').format(ISO) }) },
  { key: 'last7', labelEn: 'Last 7 days', labelRu: 'Последние 7 дней', get: () => lastDays(7) },
  { key: 'last14', labelEn: 'Last 14 days', labelRu: 'Последние 14 дней', get: () => lastDays(14) },
  { key: 'last30', labelEn: 'Last 30 days', labelRu: 'Последние 30 дней', get: () => lastDays(30) },
  { key: 'last90', labelEn: 'Last 90 days', labelRu: 'Последние 90 дней', get: () => lastDays(90) },
  { key: 'thisMonth', labelEn: 'This month', labelRu: 'Этот месяц', get: () => ({ from: dayjs().startOf('month').format(ISO), to: dayjs().format(ISO) }) },
  { key: 'lastMonth', labelEn: 'Last month', labelRu: 'Прошлый месяц', get: () => ({ from: dayjs().subtract(1, 'month').startOf('month').format(ISO), to: dayjs().subtract(1, 'month').endOf('month').format(ISO) }) },
];

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const { language } = useLanguage();
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';
  const ru = language === 'ru';

  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<string>(value.from);
  const [to, setTo] = useState<string | null>(value.to);
  const [viewMonth, setViewMonth] = useState<Dayjs>(dayjs(value.to).startOf('month'));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFrom(value.from);
    setTo(value.to);
  }, [value.from, value.to]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const todayStr = dayjs().format(ISO);
  const fmt = (s: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(s + 'T00:00:00').toLocaleDateString(locale, opts);

  const triggerLabel = `${fmt(value.from, { day: 'numeric', month: 'short' })} – ${fmt(value.to, { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const activePresetKey = useMemo(
    () => PRESETS.find((p) => { const r = p.get(); return r.from === from && r.to === (to ?? from); })?.key,
    [from, to],
  );

  const clickDay = (d: Dayjs) => {
    const s = d.format(ISO);
    if (s > todayStr) return;
    if (!from || (from && to)) {
      setFrom(s);
      setTo(null);
    } else if (s < from) {
      setFrom(s);
      setTo(null);
    } else {
      setTo(s);
    }
  };

  const applyPreset = (p: Preset) => {
    const r = p.get();
    setFrom(r.from);
    setTo(r.to);
    setViewMonth(dayjs(r.to).startOf('month'));
    onChange(r);
    setOpen(false);
  };

  const applyCustom = () => {
    const safeFrom = from > todayStr ? todayStr : from;
    const tentativeTo = to ?? from;
    const safeTo = tentativeTo > todayStr ? todayStr : tentativeTo;
    onChange({ from: safeFrom, to: safeTo });
    setOpen(false);
  };

  function Month({ base }: { base: Dayjs }) {
    const start = base.startOf('month');
    const firstWeekday = start.day();
    const daysInMonth = base.daysInMonth();
    const cells: (Dayjs | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(start.date(d));
    while (cells.length % 7 !== 0) cells.push(null);

    const weekdays = ru ? ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    return (
      <div className="w-[14rem]">
        <div className="mb-2 text-center text-[13px] font-semibold capitalize text-[#1c1e21]">
          {base.toDate().toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] text-[#90949c]">
          {weekdays.map((w) => (
            <div key={w} className="py-1">{w}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7">
          {cells.map((c, i) => {
            if (!c) return <div key={i} className="h-8" />;
            const s = c.format(ISO);
            const isStart = s === from;
            const isEnd = to !== null && s === to;
            const inRange = to !== null && s > from && s < to;
            const future = s > todayStr;
            const isToday = s === todayStr;
            const stripL = isStart && to !== null;
            return (
              <div
                key={i}
                className={`flex h-8 justify-center ${inRange ? 'bg-[#e7f3ff]' : ''} ${stripL ? 'rounded-l-full bg-[#e7f3ff]' : ''} ${isEnd ? 'rounded-r-full bg-[#e7f3ff]' : ''}`}
              >
                <button
                  type="button"
                  disabled={future}
                  onClick={() => clickDay(c)}
                  className={`h-8 w-8 rounded-full text-[13px] transition
                    ${isStart || isEnd ? 'bg-[#1877F2] font-semibold text-white' : future ? 'cursor-not-allowed text-[#bcc0c4]' : 'text-[#1c1e21] hover:bg-[#f0f2f5]'}
                    ${isToday && !isStart && !isEnd ? 'ring-1 ring-inset ring-[#1877F2]' : ''}`}
                >
                  {c.date()}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-sm text-ink transition hover:border-[#1877F2]"
      >
        <CalendarIcon />
        <span>{triggerLabel}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(42rem,92vw)] overflow-hidden rounded-xl border border-[#dadde1] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
          <div className="flex flex-col sm:flex-row">
            <div className="border-b border-[#dadde1] p-2 sm:w-44 sm:border-b-0 sm:border-r">
              {PRESETS.map((p) => {
                const active = p.key === activePresetKey;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`block w-full rounded-lg px-3 py-2 text-left text-[13px] transition ${active ? 'bg-[#e7f3ff] font-semibold text-[#1877F2]' : 'text-[#1c1e21] hover:bg-[#f0f2f5]'}`}
                  >
                    {ru ? p.labelRu : p.labelEn}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 p-3">
              <div className="mb-1 flex items-center justify-between">
                <button type="button" onClick={() => setViewMonth((m) => m.subtract(1, 'month'))} className="rounded-md px-2 py-1 text-lg leading-none text-[#1c1e21] hover:bg-[#f0f2f5]">‹</button>
                <button type="button" onClick={() => setViewMonth((m) => m.add(1, 'month'))} className="rounded-md px-2 py-1 text-lg leading-none text-[#1c1e21] hover:bg-[#f0f2f5]">›</button>
              </div>
              <div className="flex justify-center gap-5">
                <Month base={viewMonth} />
                <div className="hidden sm:block">
                  <Month base={viewMonth.add(1, 'month')} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#dadde1] px-4 py-3">
            <span className="text-[13px] text-[#606770]">
              {fmt(from, { day: 'numeric', month: 'short' })} – {to ? fmt(to, { day: 'numeric', month: 'short', year: 'numeric' }) : '…'}
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-[13px] font-medium text-[#1c1e21] hover:bg-[#f0f2f5]">
                {ru ? 'Отмена' : 'Cancel'}
              </button>
              <button type="button" onClick={applyCustom} disabled={!from} className="rounded-lg bg-[#1877F2] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#166fe5] disabled:opacity-50">
                {ru ? 'Применить' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
