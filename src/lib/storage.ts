import type { AppState } from '../types';
import { DEFAULT_PERIODS, PERSON_DEFAULTS } from './model';

const KEY = 'couple-timetable:v1';

export function defaultState(): AppState {
  return {
    people: PERSON_DEFAULTS.map((p) => ({ ...p })),
    courses: [],
    periodCount: DEFAULT_PERIODS,
    startDate: '',
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      people:
        parsed.people && parsed.people.length >= 2
          ? parsed.people
          : PERSON_DEFAULTS.map((p) => ({ ...p })),
      courses: Array.isArray(parsed.courses) ? parsed.courses : [],
      periodCount: typeof parsed.periodCount === 'number' ? parsed.periodCount : DEFAULT_PERIODS,
      startDate: parsed.startDate || '',
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 存储失败（如隐私模式）静默忽略
  }
}
