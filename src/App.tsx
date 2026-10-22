import { useEffect, useState } from 'react';
import type { AppState, Course, PersonId } from './types';
import { loadState, saveState } from './lib/storage';
import { currentWeek, DAY_LABELS, todayDayOfWeek } from './lib/model';
import { clearShareFromHash, decodeShare, mergeSharedState, readShareFromHash } from './lib/share';
import { b64urlDecode, clearRawFromHash, readRawFromHash } from './lib/bookmarklet';
import { parseZhengfangHtml } from './lib/zhengfang';
import TimetableGrid from './components/TimetableGrid';
import CourseForm from './components/CourseForm';
import FreeTimePanel from './components/FreeTimePanel';
import SettingsPanel from './components/SettingsPanel';

type View = 'timetable' | 'free' | 'settings';

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [view, setView] = useState<View>('timetable');
  const [week, setWeek] = useState<number>(() => currentWeek(state.startDate));
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [newSlot, setNewSlot] = useState<{ day: number; period: number; personId: PersonId } | null>(
    null
  );

  useEffect(() => {
    saveState(state);
  }, [state]);

  // 处理分享链接 + 教务一键抓取（书签跳转 #raw=）
  useEffect(() => {
    const code = readShareFromHash();
    if (code) {
      const imported = decodeShare(code);
      if (imported && window.confirm('检测到对方分享的课表，是否导入并合并？')) {
        setState((prev) => mergeSharedState(prev, imported));
        setView('timetable');
      }
      clearShareFromHash();
    }

    const raw = readRawFromHash();
    if (raw) {
      const html = b64urlDecode(raw);
      if (html) {
        const courses = parseZhengfangHtml(html, 'me');
        if (courses.length) {
          if (window.confirm(`检测到从教务系统抓取的课表，共 ${courses.length} 门课程，是否导入为「我」的课表？`)) {
            setState((prev) => ({ ...prev, courses: [...prev.courses, ...courses] }));
            setView('timetable');
          }
        } else {
          window.alert('未能从页面解析出课程，请确认是在教务「课表」页面点击的书签。');
        }
      } else {
        window.alert('抓取的数据无效或已损坏，请重试。');
      }
      clearRawFromHash();
    }
  }, []);

  // 开学日期变化时重新计算当前周
  useEffect(() => {
    setWeek(currentWeek(state.startDate));
  }, [state.startDate]);

  function upsertCourse(course: Course) {
    setState((prev) => {
      const exists = prev.courses.some((c) => c.id === course.id);
      const courses = exists
        ? prev.courses.map((c) => (c.id === course.id ? course : c))
        : [...prev.courses, course];
      return { ...prev, courses };
    });
  }

  function deleteCourse(id: string) {
    setState((prev) => ({ ...prev, courses: prev.courses.filter((c) => c.id !== id) }));
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">❤️ 情侣课表</div>
        <nav className="tabs">
          <button className={view === 'timetable' ? 'tab active' : 'tab'} onClick={() => setView('timetable')}>
            课表
          </button>
          <button className={view === 'free' ? 'tab active' : 'tab'} onClick={() => setView('free')}>
            空闲时间
          </button>
          <button className={view === 'settings' ? 'tab active' : 'tab'} onClick={() => setView('settings')}>
            设置
          </button>
        </nav>
      </header>

      {view === 'timetable' && (
        <>
          <div className="week-bar">
            <button className="ghost" onClick={() => setWeek((w) => Math.max(1, w - 1))}>
              ‹
            </button>
            <span className="week-num">第 {week} 周</span>
            <button className="ghost" onClick={() => setWeek((w) => w + 1)}>
              ›
            </button>
            <span className="week-today">
              {DAY_LABELS[todayDayOfWeek() - 1]} · 今天
            </span>
          </div>
          <TimetableGrid
            state={state}
            week={week}
            onAdd={(day, period, personId) => setNewSlot({ day, period, personId })}
            onEdit={(course) => setEditCourse(course)}
          />
        </>
      )}

      {view === 'free' && <FreeTimePanel state={state} week={week} onWeekChange={setWeek} />}

      {view === 'settings' && <SettingsPanel state={state} onStateChange={setState} />}

      {view === 'timetable' && (
        <button className="fab" onClick={() => setNewSlot(null)}>
          ＋
        </button>
      )}

      {(editCourse || newSlot) && (
        <CourseForm
          initial={editCourse || undefined}
          defaultSlot={newSlot || undefined}
          people={state.people}
          periodCount={state.periodCount}
          onSave={(c) => {
            upsertCourse(c);
            setEditCourse(null);
            setNewSlot(null);
          }}
          onClose={() => {
            setEditCourse(null);
            setNewSlot(null);
          }}
          onDelete={editCourse ? deleteCourse : undefined}
        />
      )}
    </div>
  );
}
