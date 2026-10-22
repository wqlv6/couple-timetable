import { parseZhengfangHtml } from './parser.mjs';

// 程序化生成 53 位周次字符串，避免手写出错
function weeksStr(weeks) {
  const a = new Array(53).fill('0');
  for (const w of weeks) a[w - 1] = '1';
  return a.join('');
}
const course1Weeks = weeksStr(Array.from({ length: 16 }, (_, i) => i + 1)); // 1-16 周
const course2Weeks = weeksStr([1, 3, 5, 7, 9, 11, 13, 15]); // 单周

const sample = `
<html><body><script>
var unitCount = 12;
var teachers = [ { id : 2270, name : "任艳芳", lab : false } ];
var actTeachers = [ { id : 2270, name : "任艳芳", lab : false } ];

activity = new TaskActivity("2270", "任艳芳", "8340", "信息检索与利用", "548", "10302(将军路)", "${course1Weeks}", "", null, "", "", "", "");
index = 0 * unitCount + 8;
table0.activities[index][table0.activities[index].length] = activity;
index = 0 * unitCount + 9;
table0.activities[index][table0.activities[index].length] = activity;

activity = new TaskActivity("1001", "李老师", "1002", "高等数学", "101", "教101", "${course2Weeks}", "", null, "", "", "", "");
index = 1 * unitCount + 0;
table0.activities[index][table0.activities[index].length] = activity;
</script></body></html>
`;

const courses = parseZhengfangHtml(sample, 'me');

console.log('解析结果：');
for (const c of courses) {
  console.log(`- ${c.name}｜教师 ${c.teacher}｜${c.location}｜周${c.dayOfWeek} 第${c.startPeriod}-${c.endPeriod}节｜周次 ${c.weeks.join(',')}`);
}

let pass = true;
function assert(cond, msg) {
  if (!cond) {
    pass = false;
    console.error('❌ 断言失败：' + msg);
  } else {
    console.log('✅ ' + msg);
  }
}

assert(courses.length === 2, '应解析出 2 门课');
const a = courses[0];
const b = courses[1];
assert(a && a.name === '信息检索与利用', '课程1名称正确');
assert(a && a.dayOfWeek === 1, '课程1 = 周一');
assert(a && a.startPeriod === 9 && a.endPeriod === 10, '课程1 = 第9-10节（跨节合并）');
assert(a && a.weeks.length === 16 && a.weeks[0] === 1 && a.weeks[15] === 16, '课程1 = 1-16周');
assert(a && a.teacher === '任艳芳' && a.location === '10302(将军路)', '课程1 教师/教室正确');

assert(b && b.name === '高等数学', '课程2名称正确');
assert(b && b.dayOfWeek === 2, '课程2 = 周二');
assert(b && b.startPeriod === 1 && b.endPeriod === 1, '课程2 = 第1节');
assert(b && b.weeks.join(',') === '1,3,5,7,9,11,13,15', '课程2 = 单周（1,3,5,...）');

process.exit(pass ? 0 : 1);
