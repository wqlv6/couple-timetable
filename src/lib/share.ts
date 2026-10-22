import type { AppState, PersonId } from '../types';
import { DEFAULT_PERIOD_TIMES, normalizePeriodTimes } from './model';

/** 把完整状态编码为 URL-safe 的分享码（base64url） */
export function encodeShare(state: AppState): string {
  const json = JSON.stringify(state);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 从分享码还原状态 */
export function decodeShare(code: string): AppState | null {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    const bin = atob(b64 + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes)) as AppState;
  } catch {
    return null;
  }
}

/** 生成带分享码的链接（用于情侣间同步课表） */
export function shareLink(code: string): string {
  const url = new URL(window.location.href);
  url.hash = 'share=' + code;
  return url.toString();
}

/** 从 URL hash 中读取分享码（若有） */
export function readShareFromHash(): string | null {
  const m = window.location.hash.match(/share=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

export function clearShareFromHash(): void {
  if (window.location.hash.startsWith('#share=')) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

/**
 * 合并对方分享的课表：保留我自己的「我」课程，把对方的「我」课程作为「Ta」课程。
 * 双方约定：本人永远是 personId='me'，对方是 'partner'。
 */
export function mergeSharedState(mine: AppState, theirs: AppState): AppState {
  const myMe = mine.courses.filter((c) => c.personId === 'me');
  const theirMe = theirs.courses
    .filter((c) => c.personId === 'me')
    .map((c) => ({ ...c, personId: 'partner' as PersonId }));

  const theirName = theirs.people.find((p) => p.id === 'me')?.name;
  const people = mine.people.map((p) => {
    if (p.id === 'partner' && theirName) return { ...p, name: theirName };
    return p;
  });

  const theirTimes = theirs.periodTimes?.me;

  return {
    ...mine,
    people,
    courses: [...myMe, ...theirMe],
    periodCount: Math.max(mine.periodCount, theirs.periodCount),
    startDate: mine.startDate || theirs.startDate,
    periodTimes: {
      me: mine.periodTimes?.me ?? DEFAULT_PERIOD_TIMES,
      partner: normalizePeriodTimes(theirTimes),
    },
  };
}
