import { useRef, useState } from 'react';
import type { AppState, Course, PersonId } from '../types';
import { exportCSV, parseCSV } from '../lib/csv';
import { exportICS } from '../lib/ical';
import { parseZhengfangHtml } from '../lib/zhengfang';
import { buildBookmarklet } from '../lib/bookmarklet';
import { decodeShare, encodeShare, mergeSharedState, shareLink } from '../lib/share';
import { defaultState } from '../lib/storage';

interface Props {
  state: AppState;
  onStateChange: (s: AppState) => void;
}

export default function SettingsPanel({ state, onStateChange }: Props) {
  const [importPerson, setImportPerson] = useState<PersonId>('me');
  const [csvText, setCsvText] = useState('');
  const [zfText, setZfText] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [bmCode, setBmCode] = useState('');
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function updatePerson(id: PersonId, patch: Partial<{ name: string; color: string }>) {
    onStateChange({
      ...state,
      people: state.people.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  }

  function addCourses(courses: Course[]) {
    if (!courses.length) {
      setMsg('未识别到任何课程，请检查内容格式');
      return;
    }
    onStateChange({ ...state, courses: [...state.courses, ...courses] });
    setMsg(`✅ 已导入 ${courses.length} 门课程`);
  }

  function onCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => addCourses(parseCSV(String(reader.result), importPerson));
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }

  function download(filename: string, content: string, mime: string) {
    const blob = new Blob(['\ufeff' + content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copyShareLink() {
    const code = encodeShare(state);
    const link = shareLink(code);
    try {
      await navigator.clipboard.writeText(link);
      setMsg('✅ 分享链接已复制，发给对方即可同步');
    } catch {
      setMsg(link);
    }
  }

  function importShare() {
    const imported = decodeShare(shareCode.trim());
    if (!imported) {
      setMsg('分享码无效，请检查是否完整复制');
      return;
    }
    onStateChange(mergeSharedState(state, imported));
    setShareCode('');
    setMsg('✅ 已合并对方课表');
  }

  function clearAll() {
    if (window.confirm('确定清空全部课程和设置吗？此操作不可恢复。')) {
      onStateChange(defaultState());
      setMsg('已清空');
    }
  }

  function genBookmarklet() {
    setBmCode(buildBookmarklet(window.location.href.split('#')[0]));
  }

  async function copyBookmarklet() {
    try {
      await navigator.clipboard.writeText(bmCode);
      setMsg('✅ 书签代码已复制');
    } catch {
      setMsg('复制失败，请长按下方代码全选复制');
    }
  }

  const exportICSResult = exportICS(state);
  const meOnly = state.courses.filter((c) => c.personId === 'me');

  return (
    <div className="panel settings">
      <p className="msg">{msg}</p>

      <section className="section">
        <h3>👫 双方信息</h3>
        {state.people.map((p) => (
          <div className="person-card" key={p.id}>
            <input
              type="color"
              value={p.color}
              onChange={(e) => updatePerson(p.id, { color: e.target.value })}
              title="颜色"
            />
            <input
              className="name-input"
              value={p.name}
              placeholder={p.id === 'me' ? '我的名字' : 'Ta 的名字'}
              onChange={(e) => updatePerson(p.id, { name: e.target.value })}
            />
          </div>
        ))}
      </section>

      <section className="section">
        <h3>📅 学期设置</h3>
        <div className="field">
          <label>开学日期（第 1 周周一）</label>
          <input
            type="date"
            value={state.startDate}
            onChange={(e) => onStateChange({ ...state, startDate: e.target.value })}
          />
          <small>用于计算当前周数、导出 iCal 日历</small>
        </div>
        <div className="field">
          <label>每天节数</label>
          <select
            value={state.periodCount}
            onChange={(e) => onStateChange({ ...state, periodCount: Number(e.target.value) })}
          >
            {[8, 9, 10, 11, 12, 13, 14].map((n) => (
              <option key={n} value={n}>
                {n} 节
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="section">
        <h3>🔖 教务系统一键抓取（推荐）</h3>
        <p className="hint">不用复制源码：登录教务后，在课表页点一下书签，课表自动带回本 App。</p>
        <ol className="steps">
          <li>点下方「生成书签代码」并复制</li>
          <li>在浏览器新建书签（收藏），网址粘贴这段代码</li>
          <li>登录教务系统 → 打开「我的课表」页 → 点这个书签</li>
        </ol>
        <div className="btn-grid">
          <button className="btn primary" onClick={genBookmarklet}>
            生成书签代码
          </button>
        </div>
        {bmCode && (
          <div className="bm-code">
            <textarea
              className="textarea"
              rows={3}
              wrap="off"
              readOnly
              value={bmCode}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button className="btn" onClick={copyBookmarklet}>
              复制书签代码
            </button>
            <small>
              书签已包含本 App 当前地址（{window.location.href.split('#')[0]}）。手机和电脑需访问同一地址，建议先部署后再生成。
            </small>
          </div>
        )}
      </section>

      <section className="section">
        <h3>📥 导入课表</h3>
        <div className="field">
          <label>导入到谁名下</label>
          <select value={importPerson} onChange={(e) => setImportPerson(e.target.value as PersonId)}>
            {state.people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>教务系统导出 CSV/Excel 导入</label>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            选择 CSV 文件
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt" hidden onChange={onCsvFile} />
          <small>教务系统「导出课表」→ Excel 另存为 CSV → 在此导入</small>
        </div>

        <div className="field">
          <label>或直接粘贴 CSV 内容</label>
          <textarea
            className="textarea"
            rows={3}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={'课程名,教师,教室,星期,节次,周次\n高等数学,张三,教301,周一,1-2,1-16'}
          />
          <button
            className="btn"
            onClick={() => {
              addCourses(parseCSV(csvText, importPerson));
              setCsvText('');
            }}
          >
            解析粘贴的 CSV
          </button>
        </div>

        <div className="field">
          <label>正方教务系统课表源码（粘贴页面源码）</label>
          <textarea
            className="textarea"
            rows={4}
            value={zfText}
            onChange={(e) => setZfText(e.target.value)}
            placeholder="在教务系统课表页右键「查看网页源代码」→ 全选复制 → 粘贴到这里"
          />
          <button
            className="btn"
            onClick={() => {
              addCourses(parseZhengfangHtml(zfText, importPerson));
              setZfText('');
            }}
          >
            解析正方教务源码
          </button>
          <small>参考 miaotony/NUAA_ClassSchedule 的 TaskActivity 解析思路</small>
        </div>

        <div className="field">
          <label>通过分享码导入对方课表</label>
          <div className="row">
            <input
              value={shareCode}
              onChange={(e) => setShareCode(e.target.value)}
              placeholder="粘贴分享码或链接"
            />
            <button className="btn primary" onClick={importShare}>
              导入
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <h3>📤 导出 / 分享</h3>
        <div className="btn-grid">
          <button className="btn primary" onClick={copyShareLink}>
            复制分享链接（发给对方）
          </button>
          <button className="btn" onClick={() => download('我的课表.csv', exportCSV(meOnly), 'text/csv')}>
            导出 CSV
          </button>
          <button
            className="btn"
            onClick={() => download('我的课表.json', JSON.stringify(state, null, 2), 'application/json')}
          >
            导出 JSON 备份
          </button>
          <button
            className="btn"
            disabled={!exportICSResult}
            onClick={() => exportICSResult && download('我的课表.ics', exportICSResult, 'text/calendar')}
          >
            导出 iCal 日历{exportICSResult ? '' : '（需先设开学日期）'}
          </button>
        </div>
      </section>

      <section className="section">
        <h3>⚠️ 危险操作</h3>
        <button className="btn danger" onClick={clearAll}>
          清空全部数据
        </button>
      </section>
    </div>
  );
}
