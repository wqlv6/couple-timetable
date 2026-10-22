import type { Course, PersonId } from '../types';
import { parseWeeks, uid } from './model';

function splitCSVRow(row: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (inQ) {
      if (ch === '"') {
        if (row[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseDay(s: string): number {
  const t = s.replace(/\s/g, '');
  if (!t) return 1;
  if (/一/.test(t)) return 1;
  if (/二/.test(t)) return 2;
  if (/三/.test(t)) return 3;
  if (/四/.test(t)) return 4;
  if (/五/.test(t)) return 5;
  if (/六/.test(t)) return 6;
  if (/[日天]/.test(t)) return 7;
  const m = t.match(/(\d)/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 7) return n;
  }
  return 1;
}

function parsePeriod(s: string): { startPeriod: number; endPeriod: number } {
  const t = s.replace(/\s/g, '');
  const range = t.match(/(\d+)\s*[-–~—]\s*(\d+)/);
  if (range) {
    return { startPeriod: parseInt(range[1], 10), endPeriod: parseInt(range[2], 10) };
  }
  const nums = t.match(/(\d+)/g);
  if (nums && nums.length) {
    const arr = nums.map(Number).filter((n) => n >= 1 && n <= 30);
    if (arr.length) return { startPeriod: Math.min(...arr), endPeriod: Math.max(...arr) };
  }
  return { startPeriod: 1, endPeriod: 1 };
}

/**
 * 解析教务系统导出的 CSV/Excel（另存为 CSV）。
 * 自动识别常见中文列名；如识别不准，请手动按列调整。
 */
export function parseCSV(text: string, personId: PersonId): Course[] {
  const rows = text
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter((r) => r && !/^[,，"']*$/.test(r));
  if (!rows.length) return [];

  const courses: Course[] = [];
  let header: string[] | null = null;

  for (const row of rows) {
    const cells = splitCSVRow(row);
    if (!header) {
      header = cells.map((c) => c.trim());
      continue;
    }
    const get = (keys: string[]) => {
      const idx = header!.findIndex((h) => keys.some((k) => h.includes(k)));
      return idx >= 0 ? (cells[idx] || '').trim() : '';
    };

    const name = get(['课程', '名称', '科目', 'course', 'name', '课程名']);
    if (!name) continue;

    const dayOfWeek = parseDay(get(['星期', '周几', 'day', '星期几']));
    const { startPeriod, endPeriod } = parsePeriod(get(['节次', '时间', 'period', '节数', 'time']));
    const weeks = parseWeeks(get(['周次', 'weeks', 'week', '上课周次']) || '1-16');

    courses.push({
      id: uid(),
      name,
      teacher: get(['教师', '老师', 'teacher', '任课教师']),
      location: get(['教室', '地点', 'location', 'room', '上课地点']),
      dayOfWeek,
      startPeriod,
      endPeriod: endPeriod >= startPeriod ? endPeriod : startPeriod,
      weeks,
      personId,
    });
  }
  return courses;
}

/** 导出为 CSV（可用 Excel 打开） */
export function exportCSV(courses: Course[]): string {
  const header = ['课程名', '教师', '教室', '星期', '节次', '周次'];
  const lines = [header.join(',')];
  const DAY = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  for (const c of courses) {
    const weeks = c.weeks.length ? c.weeks.join(';') : '1-16';
    const cells = [
      c.name,
      c.teacher,
      c.location,
      DAY[c.dayOfWeek] || `周${c.dayOfWeek}`,
      c.startPeriod === c.endPeriod ? `${c.startPeriod}` : `${c.startPeriod}-${c.endPeriod}`,
      weeks,
    ];
    lines.push(cells.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','));
  }
  return lines.join('\n');
}
