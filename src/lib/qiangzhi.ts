import type { Course, PersonId } from '../types';
import { parseWeeks, uid } from './model';

/**
 * 解析强智科技教务系统课表页面源码。
 *
 * 强智课表页是一个 HTML <table id="kbtable">，结构如下：
 *   表头行：角标空、星期日、星期一 … 星期六
 *   数据行：行首 <th> 为节次标签（如 "1－2"、"3－4"），其后 7 个 <td> 对应 星期日..星期六
 *   每个 <td> 内有两组 div：
 *     div.kbcontent1 —— 简略视图（课程名 + 周次 + 教室，无教师）
 *     div.kbcontent  —— 完整视图（课程名 + 教师 + 周次 + 教室）
 *   完整视图里字段用 <font title='...'> 包裹：老师 / 周次(节次) / 教室。
 */

/** 解析节次标签："1－2" → {start:1, end:2}；"备注:" 等非节次返回 null */
function parsePeriodRange(text: string): { start: number; end: number } | null {
  const t = text.replace(/[\s\u00A0]/g, '');
  if (!t) return null;
  const m = t.match(/(\d+)\s*[-－–—~～]\s*(\d+)/);
  if (m) return { start: parseInt(m[1], 10), end: parseInt(m[2], 10) };
  const single = t.match(/(\d+)/);
  if (single) {
    const n = parseInt(single[1], 10);
    return { start: n, end: n };
  }
  return null;
}

/** 取 div 内第一个 <br> 之前的文本（即课程名）；空单元格（&nbsp;）返回空串 */
function courseNameOf(div: Element): string {
  let name = '';
  for (const node of Array.from(div.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'BR') break;
    if (node.nodeType === Node.TEXT_NODE) name += node.textContent || '';
  }
  return name.replace(/\u00A0/g, ' ').trim();
}

/** 取 div 内 title 属性完全匹配的 <font> 文本 */
function fontText(div: Element, title: string): string {
  const font = Array.from(div.querySelectorAll('font')).find(
    (f) => (f.getAttribute('title') || '') === title
  );
  return font ? (font.textContent || '').replace(/\u00A0/g, ' ').trim() : '';
}

/** 取 div 内 title 属性「包含」关键字的 <font> 文本（用于周次等变体） */
function fontTextContains(div: Element, keyword: string): string {
  const font = Array.from(div.querySelectorAll('font')).find(
    (f) => (f.getAttribute('title') || '').indexOf(keyword) >= 0
  );
  return font ? (font.textContent || '').replace(/\u00A0/g, ' ').trim() : '';
}

function parseCell(
  div: Element,
  day: number,
  period: { start: number; end: number },
  personId: PersonId
): Course | null {
  const name = courseNameOf(div);
  if (!name) return null;
  const teacher = fontText(div, '老师');
  const weeksText = fontText(div, '周次(节次)') || fontTextContains(div, '周次');
  const location = fontText(div, '教室');
  const weeks = parseWeeks(weeksText);
  return {
    id: uid(),
    name,
    teacher,
    location,
    dayOfWeek: day,
    startPeriod: period.start,
    endPeriod: period.end,
    weeks,
    personId,
  };
}

export function parseQiangzhiHtml(html: string, personId: PersonId): Course[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const courses: Course[] = [];
  const seen = new Set<string>();

  for (const table of Array.from(doc.querySelectorAll('table#kbtable'))) {
    for (const row of Array.from(table.querySelectorAll('tr'))) {
      const th = row.querySelector('th');
      const period = th ? parsePeriodRange(th.textContent || '') : null;
      if (!period) continue;

      const cells = Array.from(row.querySelectorAll('td'));
      cells.forEach((cell, idx) => {
        if (idx > 6) return; // 数据行最多 7 列（星期日..星期六）
        const day = idx === 0 ? 7 : idx; // 第 0 列=星期日=7，1..6 列=周一..周六
        for (const div of Array.from(cell.querySelectorAll('div.kbcontent'))) {
          const course = parseCell(div, day, period, personId);
          if (!course) continue;
          const key = [
            course.name,
            course.dayOfWeek,
            `${course.startPeriod}-${course.endPeriod}`,
            course.teacher,
            course.location,
            course.weeks.join(','),
          ].join('|');
          if (seen.has(key)) continue;
          seen.add(key);
          courses.push(course);
        }
      });
    }
  }
  return courses;
}
