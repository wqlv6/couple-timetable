/**
 * 解析正方教务系统课表页面源码（与前端 src/lib/zhengfang.ts 算法一致）。
 * 参考 miaotony/NUAA_ClassSchedule 的解析思路。
 *
 * 正方教务课表页本质返回一段 JS，核心结构：
 *   var unitCount = 12;
 *   activity = new TaskActivity(teacherId, teacherName, courseId, courseName, roomId, roomName, vaildWeeks, ...);
 *   index = day * unitCount + period;   // day: 0=周一 ... 6=周日；period: 节次（0-based）
 *   table0.activities[index][...] = activity;
 *
 * vaildWeeks 是 53 位 "0/1" 字符串，第 i 位为 1 表示第 i+1 周上课。
 */

let counter = 0;
function uid() {
  counter += 1;
  return `zf-${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 6)}`;
}

function extractUnitCount(html) {
  const m = html.match(/unitCount\s*=\s*(\d+)/);
  return m ? parseInt(m[1], 10) : 12;
}

function parseWeeksString(s) {
  const weeks = [];
  for (let i = 0; i < s.length; i++) if (s[i] === '1') weeks.push(i + 1);
  return weeks;
}

function extractObjectArrays(html) {
  const result = {};
  const re = /var\s+(\w+)\s*=\s*(\[[\s\S]*?\])\s*;/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const varName = m[1];
    const arrStr = m[2];
    const items = [];
    const itemRe = /\{[^{}]*?\}/g;
    let im;
    while ((im = itemRe.exec(arrStr)) !== null) {
      const obj = im[0];
      const id = (obj.match(/id\s*:\s*["']?(\w+)["']?/) || [])[1] || '';
      const name = (obj.match(/name\s*:\s*"([^"]*)"/) || [])[1] || '';
      if (name || id) items.push({ id, name });
    }
    result[varName] = items;
  }
  return result;
}

function stripQuotes(s) {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function splitArgs(s) {
  const out = [];
  let cur = '';
  let inQ = null;
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

export function parseZhengfangHtml(html, personId = 'me') {
  const unitCount = extractUnitCount(html);
  const objArrays = extractObjectArrays(html);
  const teacherMap = new Map();
  for (const list of Object.values(objArrays)) {
    for (const t of list) if (t.id && t.name) teacherMap.set(t.id, t.name);
  }

  const courses = [];
  const chunks = html.split(/new\s+TaskActivity\s*\(/);

  for (let ci = 1; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    const callEnd = chunk.indexOf(');');
    if (callEnd === -1) continue;
    const call = chunk.slice(0, callEnd);
    const after = chunk.slice(callEnd);

    const args = splitArgs(call);
    const teacherArg = (args[1] ?? '').trim();
    const courseName = stripQuotes(args[3] ?? '').trim();
    const roomName = stripQuotes(args[5] ?? '').trim();
    const validWeeks = stripQuotes(args[6] ?? '').trim();

    if (!courseName && !validWeeks) continue;

    let teacherName = '';
    if (teacherArg.startsWith('"') || teacherArg.startsWith("'")) {
      teacherName = stripQuotes(teacherArg);
    } else if (teacherArg) {
      const ids = teacherArg.replace(/[^\d,]/g, '').split(',').filter(Boolean);
      teacherName = ids.map((id) => teacherMap.get(id) || '').filter(Boolean).join(',');
    }

    const segEnd = after.indexOf('new TaskActivity');
    const segment = segEnd === -1 ? after : after.slice(0, segEnd);
    const slots = [];
    const idxRe = /index\s*=\s*(\d+)\s*\*\s*unitCount\s*\+\s*(\d+)/g;
    let im;
    while ((im = idxRe.exec(segment)) !== null) {
      const day = parseInt(im[1], 10);
      const period = parseInt(im[2], 10);
      if (day >= 0 && day <= 6) slots.push({ day: day + 1, period: period + 1 });
    }

    const weeks = parseWeeksString(validWeeks);
    if (!slots.length) continue;

    const byDay = new Map();
    for (const s of slots) {
      const arr = byDay.get(s.day) || [];
      arr.push(s.period);
      byDay.set(s.day, arr);
    }

    for (const [day, periods] of byDay) {
      const sorted = [...periods].sort((a, b) => a - b);
      let start = sorted[0];
      let prev = sorted[0];
      const ranges = [];
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
