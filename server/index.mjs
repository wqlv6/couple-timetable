/**
 * 正方教务系统课表抓取代理（可选）。
 *
 * 为什么需要后端？教务系统不允许跨域请求（CORS），浏览器里的网页无法直接
 * 登录并抓取课表，所以需要一个本地/服务器代理转发请求。
 *
 * 前端已支持「粘贴课表源码」的客户端解析（无需后端）。本代理用于「自动登录+抓取」，
 * 但各校登录接口/验证码差异较大，需按你学校实际情况调整下方 login/import 逻辑。
 *
 * 运行：node index.mjs   （Node 18+，自带 fetch）
 */
import { createServer } from 'node:http';
import { parseZhengfangHtml } from './parser.mjs';

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        reject(new Error('请求体不是合法 JSON'));
      }
    });
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 200, {});

  if (req.method === 'POST' && req.url === '/parse') {
    // 纯解析：把粘贴的课表源码解析成课程
    try {
      const { html, personId = 'me' } = await readBody(req);
      const courses = parseZhengfangHtml(html, personId);
      return json(res, 200, { courses });
    } catch (e) {
      return json(res, 400, { error: String(e) });
    }
  }

  if (req.method === 'POST' && req.url === '/import') {
    // 自动登录 + 抓取（TODO：需按你学校接口调整）
    try {
      const { loginUrl, scheduleUrl, username, password } = await readBody(req);
      if (!loginUrl || !scheduleUrl || !username || !password) {
        return json(res, 400, { error: '缺少 loginUrl/scheduleUrl/username/password' });
      }
      // 示例：常见正方登录流程（含验证码的学校需先请求验证码图片）
      const loginRes = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password }).toString(),
        redirect: 'manual',
      });
      const cookies = loginRes.headers.get('set-cookie') || '';
      const scheduleRes = await fetch(scheduleUrl, { headers: { Cookie: cookies } });
      const html = await scheduleRes.text();
      const courses = parseZhengfangHtml(html, 'me');
      return json(res, 200, { courses });
    } catch (e) {
      return json(res, 500, { error: String(e) });
    }
  }

  return json(res, 404, { error: 'not found' });
});

const PORT = process.env.PORT || 8787;
server.listen(PORT, () => {
  console.log(`课表代理已启动：http://localhost:${PORT}`);
  console.log('  POST /parse   解析粘贴的课表源码');
  console.log('  POST /import  自动登录抓取（需按学校接口调整）');
});
