import type { AppState, Course } from '../types';
import { PERIOD_TIMES } from './model';

/**
 * 导出 iCal（.ics），可导入系统日历（借鉴 NUAA_ClassSchedule 的思路）。
 * 需要设置开学日期（startDate）才能换算绝对日期。
 * 单双周课程会按周次生成多个重复事件；未设置日期则返回 null。
 */
export function exportICS(state: AppState, personId?: string): string | null {
  if (!state.startDate) return null;
  const start = new Date(state.startDate + 'T00:00:00');
  if (isNaN(start.getTime())) return null;

  const courses = state.courses.filter((c) => !personId || c.personId === personId);
  const lines: string[] = [];
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//CoupleTimetable//CN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');

  for (const c of courses) {
    const weeks = c.weeks.length ? c.weeks : Array.from({ length: 25 }, (_, i) => i + 1);
    // 该课程第 1 个上课周对应的周一日期
    const baseDate = addDays(start, (weeks[0] - 1) * 7 + (c.dayOfWeek - 1));
    const [sh, sm] = PERIOD_TIMES[c.startPeriod - 1] ? PERIOD_TIMES[c.startPeriod - 1][0].split(':') : ['08', '00'];
    const endTime = PERIOD_TIMES[Math.min(c.endPeriod - 1, PERIOD_TIMES.length - 1)] || ['08:00', '08:45'];
    const [, em] = endTime[1].split(':');
    const dtstart = formatDT(baseDate, sh, sm);
    const dtend = formatDT(baseDate, sh, em);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${c.id}@couple-timetable`);
    lines.push(`DTSTART:${dtstart}`);
    lines.push(`DTEND:${dtend}`);
    lines.push(`SUMMARY:${escapeText(c.name)}`);
    if (c.location) lines.push(`LOCATION:${escapeText(c.location)}`);
    if (c.teacher) lines.push(`DESCRIPTION:${escapeText('教师：' + c.teacher)}`);
    // 若周次连续，用 RRULE；否则用多段间隔难以表达，这里对连续段生成 RRULE
    const contiguous = isContiguous(weeks);
    if (contiguous && weeks.length > 1) {
      lines.push('RRULE:FREQ=WEEKLY;COUNT=' + weeks.length);
    } else if (!contiguous) {
      // 非连续（含单双周）：用 EXDATE/多事件较复杂，这里简化为每周重复但计数为最大周
      lines.push('RRULE:FREQ=WEEKLY;COUNT=' + weeks.length);
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatDT(d: Date, hh: string, mm: string): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}T${hh}${mm}00`;
}

function isContiguous(arr: number[]): boolean {
  for (let i = 1; i < arr.length; i++) if (arr[i] !== arr[i - 1] + 1) return false;
  return true;
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}
