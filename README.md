# ❤️ 情侣课表

大学情侣课表 Web 应用（PWA），支持教务系统导入、双人课表叠加、共同空闲时间推荐。
**一套代码同时覆盖「安卓 + 纯血鸿蒙」**：安卓可安装为桌面 App，鸿蒙直接用浏览器打开。

## 功能

- 📅 双人课表叠加显示（两种颜色区分「我」和「Ta」）
- 💕 共同空闲时间推荐（自动算出两人都没课的节次，适合约会）
- 📥 教务系统导入：① 一键抓取（书签，推荐）② CSV/Excel 导入 ③ 粘贴正方教务课表源码解析 ④ 服务器代理自动登录（脚手架）
- 🔗 分享链接：复制一个链接发给对方，对方打开即自动合并课表
- 📤 导出：CSV / JSON 备份 / iCal 日历
- 📱 PWA：安卓「添加到主屏幕」后离线可用

## 快速开始

```bash
cd couple-timetable
npm install
npm run dev        # 本地开发
npm run build      # 构建到 dist/（会先做 TypeScript 类型检查）
npm run preview    # 预览构建产物
```

## 部署上线（让两人都能用）

构建产物在 `dist/`，可部署到任意静态托管，例如：

- **GitHub Pages**：仓库开启 Pages，指向 `dist/`
- **Vercel / Netlify**：把 `dist/` 作为输出目录即可
- 部署后把链接发给对方即可；安卓在 Chrome 打开 →「添加到主屏幕」

## 情侣同步（分享）

1. 「设置」→「复制分享链接（发给对方）」
2. 对方在浏览器打开该链接，自动弹出「是否导入并合并」
3. 合并规则：**本人永远是「我」、对方是「Ta」**，双方各自维护自己的课表再互相分享

## 教务系统导入说明

| 方式 | 是否需后端 | 说明 |
|------|-----------|------|
| 🔖 一键抓取（书签） | ❌ | 登录教务 → 课表页点书签，自动抓取并跳回 App 导入（推荐） |
| CSV/Excel 导入 | ❌ | 教务系统「导出课表」→ Excel 另存为 CSV → 导入 |
| 粘贴正方课表源码 | ❌ | 课表页右键「查看网页源代码」→ 全选复制 → 粘贴解析 |
| 自动登录抓取 | ✅ | 见 `server/`，需按你学校接口调整（CORS + 验证码限制） |

### 🔖 一键抓取（书签）用法

1. App「设置」→「教务系统一键抓取」→「生成书签代码」并复制
2. 浏览器新建书签/收藏：名称随意，网址粘贴这段代码
3. 登录教务系统 → 打开「我的课表」页 → 点该书签，课表自动跳回 App 并导入为「我」

原理：书签在教务页内抓取课表源码（同一站点，无 CORS 限制），base64 编码后跳转到 App 的 `#raw=` 哈希，App 用正方解析器解析。登录这步仍由你在浏览器正常完成，因此不受验证码/SSO 影响。书签里已包含 App 当前地址，手机和电脑需访问同一地址，建议先部署再生成。

正方教务课表源码解析逻辑参考 [miaotony/NUAA_ClassSchedule](https://github.com/miaotony/NUAA_ClassSchedule)，
核心是解析页面里的 `new TaskActivity(...)` 与 `index = day * unitCount + period`，
其中 `vaildWeeks` 为 53 位 "0/1" 字符串表示上课周次。各校接口略有差异，必要时微调 `src/lib/zhengfang.ts`。

## 测试

```bash
npm run typecheck              # 前端类型检查
npm run build                  # 构建
cd server && npm test          # 运行正方解析器单元测试
```

## 项目结构

```
src/
  App.tsx                  主应用与状态管理
  types.ts                 数据模型（Course/Person/AppState）
  lib/
    model.ts               周次解析、节次时间、日期工具
    storage.ts             localStorage 持久化
    freeTime.ts            共同空闲时间计算
    csv.ts                 CSV 导入/导出
    share.ts               分享码编解码 + 合并
    bookmarklet.ts         教务一键抓取书签生成 + #raw 哈希编解码
    zhengfang.ts           正方教务课表源码解析
    ical.ts                iCal 导出
  components/
    TimetableGrid.tsx      课表网格
    CourseForm.tsx         课程编辑弹窗
    FreeTimePanel.tsx      空闲时间
    SettingsPanel.tsx      设置/导入/导出
server/
  parser.mjs               正方解析器（可独立测试）
  index.mjs                代理服务器（可选）
  test.mjs                 解析器单元测试
```

## 技术栈

React 18 + TypeScript + Vite（纯前端、本地存储，无需后端即可运行）
