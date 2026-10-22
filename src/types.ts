export type PersonId = 'me' | 'partner';

export interface Person {
  id: PersonId;
  name: string;
  color: string;
}

export interface Course {
  id: string;
  name: string; // 课程名
  teacher: string; // 教师
  location: string; // 教室/地点
  dayOfWeek: number; // 1=周一 ... 7=周日
  startPeriod: number; // 起始节次（1-based）
  endPeriod: number; // 结束节次
  weeks: number[]; // 上课周次，空数组表示每周都上
  personId: PersonId;
  color?: string; // 可选自定义颜色
  note?: string;
}

export interface AppState {
  people: Person[];
  courses: Course[];
  periodCount: number;
  startDate: string; // 第 1 周周一的日期（YYYY-MM-DD），为空则未设置
}
