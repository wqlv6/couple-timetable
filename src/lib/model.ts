import type { PersonId } from '../types';

export const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
export const DAY_SHORT = ['一', '二', '三', '四', '五', '六', '日'];

export const DEFAULT_PERIODS = 12;
export const MAX_PERIODS = 16;

export const PERIOD_TIMES: [string, string][] = [
  ['08:00', '08:45'],
  ['08:55', '09:40'],
  ['10:00', '10:45'],
  ['10:55', '11:40'],
  ['13:30', '14:15'],
  ['14:25', '15:10'],
  ['15:20', '16:05'],
  ['16:15', '17:00'],
  ['18:30', '19:15'],
  ['19:25', '20:10'],
  ['20:20', '21:05'],
  ['21:15', '22:00'],
  ['08:00', '08:45'],
  ['08:55', '09:40'],
  ['10:00', '10:45'],
  ['10:55', '11:40'],
];

export const PERSON_DEFAULTS: { id: PersonId; name: string; color: string }[] = [
  { id: 'me', name: '我', color: '#ff5a8a' },
  { id: 'partner', name: 'Ta', color: '#4f8cff' },
];

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** 解析周次字符串："1-16周"、"1-8周(单)"、"2,4,6"、"1-16周(双)" 等 → 周次数组 */
export function parseWeeks(input: string): number[] {
  if (!input) return [];
  const result = new Set<number>();
  const parts = input.split(/[,，;；\s]+/).map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const odd = /单/.test(part);
    const even = /双/.test(part);
    const m = part.match(/(\d+)\s*[-–~—]\s*(\d+)/);
    if (m) {
      let a = parseInt(m[1], 10);
      let b = parseInt(m[2], 10);
      if (a > b) [a, b] = [b, a];
      for (let w = a; w <= b; w++) {
        if (odd && w % 2 === 0) continue;
        if (even && w % 2 !== 0) continue;
        result.add(w);
      }
    } else {
      const single = part.match(/(\d+)/);
      if (single) result.add(parseInt(single[1], 10));
    }
  }
  return Array.from(result).sort((x, y) => x - y);
}

/** 周次数组 → 可读字符串（连续的合并为区间） */
export function weeksToString(weeks: number[]): string {
  if (!weeks.length) return '';
  const sorted = [...weeks].sort((a, b) => a - b);
  const groups: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    if (cur === prev + 1) {
      prev = cur;
    } else {
      groups.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = cur;
      prev = cur;
    }
  }
  groups.push(start === prev ? `${start}` : `${start}-${prev}`);
  return groups.join(',');
}

/** 计算当前是第几周（基于开学日期 startDate，即第 1 周周一） */
export function currentWeek(startDate: string): number {
  if (!startDate) return 1;
  const start = new Date(startDate + 'T00:00:00');
  if (isNaN(start.getTime())) return 1;
  const now = new Date();
  const diff = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 3600 * 1000)) + 1;
  return Math.max(1, diff);
}

export function todayDayOfWeek(): number {
  // JS: 0=周日 ... 6=周六；转换为 1=周一 ... 7=周日
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}
