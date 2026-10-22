import { useState } from 'react';
import type { Course, Person, PersonId } from '../types';
import { DAY_LABELS, parseWeeks, uid, weeksToString } from '../lib/model';

interface Props {
  initial?: Course;
  defaultSlot?: { day: number; period: number; personId: PersonId };
  people: Person[];
  periodCount: number;
  onSave: (course: Course) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export default function CourseForm({
  initial,
  defaultSlot,
  people,
  periodCount,
  onSave,
  onClose,
  onDelete,
}: Props) {
  const [personId, setPersonId] = useState<PersonId>(initial?.personId || defaultSlot?.personId || 'me');
  const [name, setName] = useState(initial?.name || '');
  const [teacher, setTeacher] = useState(initial?.teacher || '');
  const [location, setLocation] = useState(initial?.location || '');
  const [day, setDay] = useState(initial?.dayOfWeek || defaultSlot?.day || 1);
  const [startPeriod, setStartPeriod] = useState(initial?.startPeriod || defaultSlot?.period || 1);
  const [endPeriod, setEndPeriod] = useState(initial?.endPeriod || defaultSlot?.period || 1);
  const [weeksText, setWeeksText] = useState(initial ? weeksToString(initial.weeks) : '1-16');
  const [note, setNote] = useState(initial?.note || '');

  function submit() {
    if (!name.trim()) {
      alert('请填写课程名');
      return;
    }
    if (endPeriod < startPeriod) {
      alert('结束节次不能小于开始节次');
      return;
    }
    onSave({
      id: initial?.id || uid(),
      name: name.trim(),
      teacher: teacher.trim(),
      location: location.trim(),
      dayOfWeek: day,
      startPeriod,
      endPeriod,
      weeks: weeksText.trim() ? parseWeeks(weeksText) : [],
      personId,
      color: initial?.color,
      note: note.trim() || undefined,
    });
  }

  const periodOptions = Array.from({ length: periodCount }, (_, i) => i + 1);

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{initial ? '编辑课程' : '添加课程'}</h3>

        <div className="field">
          <label>归属</label>
          <div className="seg">
            {people.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`seg-btn ${personId === p.id ? 'active' : ''}`}
                style={personId === p.id ? { background: p.color, borderColor: p.color } : undefined}
                onClick={() => setPersonId(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>课程名 *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：高等数学" />
        </div>

        <div className="form-row">
          <div className="field">
            <label>教师</label>
            <input value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="选填" />
          </div>
          <div className="field">
            <label>教室</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="选填" />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>星期</label>
            <select value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {DAY_LABELS.map((l, i) => (
                <option key={l} value={i + 1}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>开始节</label>
            <select value={startPeriod} onChange={(e) => setStartPeriod(Number(e.target.value))}>
              {periodOptions.map((p) => (
                <option key={p} value={p}>
                  第{p}节
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>结束节</label>
            <select value={endPeriod} onChange={(e) => setEndPeriod(Number(e.target.value))}>
              {periodOptions.map((p) => (
                <option key={p} value={p}>
                  第{p}节
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>上课周次</label>
          <input
            value={weeksText}
            onChange={(e) => setWeeksText(e.target.value)}
            placeholder="如 1-16 或 1-8(单) 或 2,4,6；留空=每周"
          />
        </div>

        <div className="field">
          <label>备注</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="选填" />
        </div>

        <div className="form-actions">
          {initial && onDelete ? (
            <button type="button" className="btn danger" onClick={() => onDelete(initial.id)}>
              删除
            </button>
          ) : (
            <span />
          )}
          <div className="actions-right">
            <button type="button" className="btn" onClick={onClose}>
              取消
            </button>
            <button type="button" className="btn primary" onClick={submit}>
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
