import type { AppState, PersonId, PeriodTime } from '../types';
import { DEFAULT_PERIODS, PERSON_DEFAULTS, defaultPeriodTimes, normalizePeriodTimes } from './model';

const KEY = 'couple-timetable:v1';

export function defaultState(): AppState {
  return {
    people: PERSON_DEFAULTS.map((p) => ({ ...p })),
    courses: [],
    periodCount: DEFAULT_PERIODS,
    startDate: '',
    periodTimes: {
      me: defaultPeriodTimes(),
      partner: defaultPeriodTimes(),
    },
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AppState> & {
      periodTimes?: Partial<Record<PersonId, PeriodTime[]>>;
    };
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
      periodTimes: {
        me: normalizePeriodTimes(parsed.periodTimes?.me),
        partner: normalizePeriodTimes(parsed.periodTimes?.partner),
      },
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
