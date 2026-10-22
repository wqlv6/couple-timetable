import type { AppState } from '../types';
import { DAY_LABELS } from '../lib/model';
import { commonFreeSlots, mergeSlots } from '../lib/freeTime';

interface Props {
  state: AppState;
  week: number;
  onWeekChange: (w: number) => void;
}

export default function FreeTimePanel({ state, week, onWeekChange }: Props) {
  const slots = commonFreeSlots(state, week);
  const byDay: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
  for (const s of slots) byDay[s.dayOfWeek].push(s.period);

  const total = slots.length;
  const times = state.periodTimes?.me ?? [];

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>💕 共同空闲时间</h2>
        <div className="week-stepper">
          <button className="ghost" onClick={() => onWeekChange(Math.max(1, week - 1))}>
            ‹
          </button>
          <span>第 {week} 周</span>
          <button className="ghost" onClick={() => onWeekChange(week + 1)}>
            ›
          </button>
        </div>
      </div>
      <p className="hint">
        两人都没有课的节次（共 {total} 节），适合约会、一起吃饭～ 点右上角切换周次。
      </p>
      <div className="free-list">
        {DAY_LABELS.map((label, i) => {
          const d = i + 1;
          const ranges = mergeSlots(byDay[d]);
          return (
            <div className="free-day" key={d}>
              <div className="free-day-name">{label}</div>
              <div className="free-ranges">
                {ranges.length ? (
                  ranges.map(([s, e]) => (
                    <span className="free-chip" key={`${s}-${e}`}>
                      {times[s - 1]?.[0] || '--:--'} – {times[e - 1]?.[1] || '--:--'}
                      <em>第{s === e ? s : `${s}–${e}`}节</em>
                    </span>
                  ))
                ) : (
                  <span className="free-none">暂无共同空闲</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
