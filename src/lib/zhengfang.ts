import type { Course, PersonId } from '../types';
import { uid } from './model';

/**
 * 解析正方教务系统课表页面源码（借鉴 miaotony/NUAA_ClassSchedule 的解析思路）。
 *
 * 正方教务课表页本质是返回一段 JS，核心结构为：
 *   var unitCount = 12;
 *   activity = new TaskActivity(teacherId, teacherName, courseId, courseName, roomId, roomName, vaildWeeks, ...);
 *   index = day * unitCount + period;   // day: 0=周一 ... 6=周日；period: 节次（0-based）
 *   table0.activities[index][...] = activity;
 *
 * 其中 vaildWeeks 是 53 位 "0/1" 字符串，第 i 位为 1 表示第 i+1 周上课。
 *
 * 由于各校接口/字段略有差异，这里实现通用解析，并尽量从 teachers/actTeachers 数组中还原教师姓名。
 */

interface RawActivity {
  teacherName: string;
  courseName: string;
  roomName: string;
  validWeeks: string; // 53 位字符串
  slots: { day: number; period: number }[];
}

function extractUnitCount(html: string): number {
  const m = html.match(/unitCount\s*=\s*(\d+)/);
  return m ? parseInt(m[1], 10) : 12;
}

function parseWeeksString(s: string): number[] {
  const weeks: number[] = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '1') weeks.push(i + 1);
  }
  return weeks;
}

/** 提取 var xxx = [{...},{...}] 形式的 JS 对象数组（用于 teachers/actTeachers） */
function extractObjectArrays(html: string): Record<string, { name: string; id: string }[]> {
  const result: Record<string, { name: string; id: string }[]> = {};
  const re = /var\s+(\w+)\s*=\s*(\[[\s\S]*?\])\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const varName = m[1];
    const arrStr = m[2];
    const items: { name: string; id: string }[] = [];
    const itemRe = /\{[^{}]*?\}/g;
    let im: RegExpExecArray | null;
    while ((im = itemRe.exec(arrStr)) !== null) {
      const obj = im[0];
      const id = obj.match(/id\s*:\s*["']?(\w+)["']?/)?.[1] ?? '';
      const name = obj.match(/name\s*:\s*"([^"]*)"/)?.[1] ?? '';
      if (name || id) items.push({ id, name });
    }
    result[varName] = items;
  }
  return result;
}

export function parseZhengfangHtml(html: string, personId: PersonId): Course[] {
  const unitCount = extractUnitCount(html);
  const objArrays = extractObjectArrays(html);
  const teacherMap = new Map<string, string>();
  for (const list of Object.values(objArrays)) {
    for (const t of list) {
      if (t.id && t.name) teacherMap.set(t.id, t.name);
    }
  }

  const courses: Course[] = [];
  // 逐段按 "new TaskActivity(" 切分
  const chunks = html.split(/new\s+TaskActivity\s*\(/);
  // 第 0 段是第一个 TaskActivity 之前的内容，跳过
  for (let ci = 1; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    // 截取到当前 TaskActivity 调用的右括号（第一个 ");" 之前）
    const callEnd = chunk.indexOf(');');
    if (callEnd === -1) continue;
    const call = chunk.slice(0, callEnd);
    const after = chunk.slice(callEnd);

    // 解析参数：逗号分隔，但字符串内可能含逗号 —— 用引号感知的切分
    const args = splitArgs(call);

    const teacherArg = (args[1] ?? '').trim();
    const courseName = stripQuotes(args[3] ?? '').trim();
    const roomName = stripQuotes(args[5] ?? '').trim();
    const validWeeks = stripQuotes(args[6] ?? '').trim();

    if (!courseName && !validWeeks) continue;

    // 教师名：若参数是字面量字符串则直接用，否则从 teachers 表尝试匹配 id
    let teacherName = '';
    if (teacherArg.startsWith('"') || teacherArg.startsWith("'")) {
      teacherName = stripQuotes(teacherArg);
    } else if (teacherArg) {
      const ids = teacherArg.replace(/[^\d,]/g, '').split(',').filter(Boolean);
      teacherName = ids.map((id) => teacherMap.get(id) || '').filter(Boolean).join(',');
    }

    // 查找该 activity 之后、下一个 activity 之前的 index 行
    const segEnd = after.indexOf('new TaskActivity');
    const segment = segEnd === -1 ? after : after.slice(0, segEnd);
    const slots: { day: number; period: number }[] = [];
    const idxRe = /index\s*=\s*(\d+)\s*\*\s*unitCount\s*\+\s*(\d+)/g;
    let im: RegExpExecArray | null;
    while ((im = idxRe.exec(segment)) !== null) {
      const day = parseInt(im[1], 10);
      const period = parseInt(im[2], 10); // 0-based
      if (day >= 0 && day <= 6) {
        slots.push({ day: day + 1, period: period + 1 });
      }
    }

    const weeks = parseWeeksString(validWeeks);
    if (!slots.length) continue;

    // 按时间段合并：同一课程若占据多个相邻节次，且被拆成多个 slot，则合并
    const byDay = new Map<number, number[]>();
    for (const s of slots) {
      const arr = byDay.get(s.day) || [];
      arr.push(s.period);
      byDay.set(s.day, arr);
    }

    for (const [day, periods] of byDay) {
      const sorted = [...periods].sort((a, b) => a - b);
      // 把连续节次合并为一个课程
      let start = sorted[0];
      let prev = sorted[0];
      const ranges: [number, number][] = [];
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === prev + 1) {
          prev = sorted[i];
        } else {
          ranges.push([start, prev]);
          start = prev = sorted[i];
        }
      }
      ranges.push([start, prev]);

      for (const [sp, ep] of ranges) {
        courses.push({
          id: uid(),
          name: courseName,
          teacher: teacherName,
          location: roomName,
          dayOfWeek: day,
          startPeriod: sp,
          endPeriod: ep,
          weeks,
          personId,
        });
      }
    }
  }
  return courses;
}

/** 引号感知的逗号切分（近似，足以处理 TaskActivity 参数） */
function splitArgs(s: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQ) {
      cur += ch;
      if (ch === inQ) inQ = null;
    } else if (ch === '"' || ch === "'") {
      inQ = ch;
      cur += ch;
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

function stripQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}
