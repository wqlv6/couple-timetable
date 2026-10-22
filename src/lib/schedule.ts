import type { Course, PersonId } from '../types';
import { parseZhengfangHtml } from './zhengfang';
import { parseQiangzhiHtml } from './qiangzhi';

/** 识别课表源码类型：正方(TaskActivity JS) / 强智(kbtable 表格) / 未知 */
export function detectScheduleType(html: string): 'zhengfang' | 'qiangzhi' | null {
  if (!html) return null;
  if (/TaskActivity/.test(html)) return 'zhengfang';
  if (/kbtable|kbcontent|强智|jsxsd/.test(html)) return 'qiangzhi';
  return null;
}

/** 自动识别并解析课表源码（兼容正方 / 强智教务系统） */
export function parseScheduleHtml(html: string, personId: PersonId): Course[] {
  const type = detectScheduleType(html);
  if (type === 'zhengfang') return parseZhengfangHtml(html, personId);
  if (type === 'qiangzhi') return parseQiangzhiHtml(html, personId);
  // 未知类型：两种都尝试，取有结果的那个
  const qz = parseQiangzhiHtml(html, personId);
  if (qz.length) return qz;
  return parseZhengfangHtml(html, personId);
}
