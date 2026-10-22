import type { AppState, Course, PersonId } from '../types';
import { DAY_LABELS, todayDayOfWeek } from '../lib/model';

interface Props {
  state: AppState;
  week: number;
  onAdd: (day: number, period: number, personId: PersonId) => void;
  onEdit: (course: Course) => void;
}

const HDR_H = 44;
const ROW_H = 52;

interface Positioned {
  course: Course;
  col: number;
  maxTracks: number;
}

/** 区间图贪心布局：把同一天内相互重叠的课程横向并排，互不重叠的共用一列 */
function layoutDay(courses: Course[]): Positioned[] {
  const sorted = [...courses].sort(
    (a, b) => a.startPeriod - b.startPeriod || b.endPeriod - a.endPeriod
  );
  const trackEnds: number[] = [];
  const placed: Positioned[] = [];
  for (const c of sorted) {
    let col = -1;
    for (let t = 0; t < trackEnds.length; t++) {
      if (trackEnds[t] < c.startPeriod) {
        col = t;
        trackEnds[t] = c.endPeriod;
        break;
      }
    }
    if (col === -1) {
      col = trackEnds.length;
      trackEnds.push(c.endPeriod);
    }
    placed.push({ course: c, col, maxTracks: 0 });
  }
  const maxTracks = Math.max(1, trackEnds.length);
  return placed.map((p) => ({ ...p, maxTracks }));
}

export default function TimetableGrid({ state, week, onAdd, onEdit }: Props) {
  const today = todayDayOfWeek();

  const byDay: Record<number, Course[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
  for (const c of state.courses) {
    if (byDay[c.dayOfWeek]) byDay[c.dayOfWeek].push(c);
  }
  const layouts: Record<number, Positioned[]> = {};
  for (let d = 1; d <= 7; d++) layouts[d] = layoutDay(byDay[d]);

  return (
    <>
      <div className="tt" style={{ height: HDR_H + state.periodCount * ROW_H }}>
        <div className="tt-head">
          <div className="tt-corner">节次</div>
          {DAY_LABELS.map((label, i) => (
            <div key={label} className={`tt-day ${today === i + 1 ? 'today' : ''}`}>
              {label}
            </div>
          ))}
        </div>

        <div className="tt-periods">
          {Array.from({ length: state.periodCount }, (_, i) => i + 1).map((p) => {
            const meStart = state.periodTimes.me[p - 1]?.[0] || '--:--';
            const partnerStart = state.periodTimes.partner[p - 1]?.[0] || '--:--';
            const partnerColor = state.people.find((x) => x.id === 'partner')?.color;
            return (
              <div className="tt-period" key={p}>
                <span className="p-num">{p}</span>
                <span className="p-time">{meStart}</span>
                {partnerStart !== meStart && (
                  <span className="p-time p-time-2" style={{ color: partnerColor }}>
                    {partnerStart}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="tt-canvas" style={{ height: state.periodCount * ROW_H }}>
          <div className="tt-cells">
            {Array.from({ length: state.periodCount }, (_, i) => i + 1).map((p) =>
              DAY_LABELS.map((_, d) => (
                <div key={`${d}-${p}`} className="tt-cell" onClick={() => onAdd(d + 1, p, 'me')} />
              ))
            )}
          </div>

          {Array.from({ length: 7 }, (_, i) => i + 1).map((d) =>
            (layouts[d] || []).map(({ course, col, maxTracks }) => {
              const person = state.people.find((p) => p.id === course.personId);
              const color = course.color || person?.color || '#999999';
              const active = course.weeks.length === 0 || course.weeks.includes(week);
              const top = `calc(${course.startPeriod - 1} * var(--row-h))`;
              const height = `calc(${course.endPeriod - course.startPeriod + 1} * var(--row-h) - 3px)`;
              const left = `calc(${d - 1} * (100% / 7) + ${col} * (100% / 7 / ${maxTracks}))`;
              const width = `calc(100% / 7 / ${maxTracks} - 3px)`;
              const times = state.periodTimes[course.personId] ?? [];
              const start = times[course.startPeriod - 1]?.[0];
              const end = times[course.endPeriod - 1]?.[1];
              const timeText = start && end ? `${start}–${end}` : '';
              return (
                <button
                  key={course.id}
                  className={`tt-course ${active ? '' : 'inactive'}`}
                  style={{ top, height, left, width, background: color }}
                  onClick={() => onEdit(course)}
                  title={`${course.name} · ${course.teacher || '无教师'} · ${course.location || '无地点'}${timeText ? ` · ${timeText}` : ''}`}
                >
                  <span className="c-name">{course.name}</span>
                  {course.location ? <span className="c-loc">{course.location}</span> : null}
                  {timeText ? <span className="c-time">{timeText}</span> : null}
                  {!active ? <span className="c-tag">本周无</span> : null}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="tt-legend">
        {state.people.map((p) => (
          <span className="legend-item" key={p.id}>
            <i style={{ background: p.color }} />
            {p.name}
          </span>
        ))}
        <span className="legend-tip">点空白格子添加 · 点课程编辑</span>
      </div>
    </>
  );
}
