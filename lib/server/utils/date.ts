import dayjs from 'dayjs';

export interface DateRange {
  dates: string[];
  sinceUnix: number;
  untilUnix: number;
  startDate: string;
  endDate: string;
}

export function buildDailyDateRange(days: number): DateRange {
  const safeDays = Math.max(1, days);
  const end = dayjs().endOf('day');
  const start = end.subtract(safeDays - 1, 'day').startOf('day');

  const dates: string[] = [];
  for (let i = 0; i < safeDays; i += 1) {
    dates.push(start.add(i, 'day').format('YYYY-MM-DD'));
  }

  return {
    dates,
    sinceUnix: start.unix(),
    untilUnix: end.unix(),
    startDate: start.format('YYYY-MM-DD'),
    endDate: end.format('YYYY-MM-DD'),
  };
}
