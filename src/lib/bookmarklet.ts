/** base64url 编码（Unicode 安全） */
export function b64urlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** base64url 解码（Unicode 安全），失败返回 null */
export function b64urlDecode(code: string): string | null {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    const bin = atob(b64 + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/**
 * 生成「教务一键抓取」书签代码。
 *
 * 用法：在教务系统「课表」页面点击该书签，脚本抓取页面源码，
 * base64url 编码后跳转到 App 的 `#raw=` 哈希，App 解析并导入。
 * 这样规避了 CORS 与 SSO 自动登录的难题（登录这步仍由用户照常在浏览器完成）。
 */
export function buildBookmarklet(appUrl: string): string {
  const app = (appUrl || window.location.href.split('#')[0]).replace(/\/+$/, '');
  const code = [
    '(function(){',
    'try{',
    "var h=Array.prototype.map.call(document.querySelectorAll('script'),function(s){return s.textContent||'';}).join(String.fromCharCode(10));",
    "if(h.indexOf('TaskActivity')<0){h=document.documentElement.outerHTML;}",
    "if(h.indexOf('TaskActivity')<0){alert('未识别到课表：请先在教务系统里打开「课表」页面，再点这个书签。');return;}",
    'var b=new TextEncoder().encode(h);',
    "var s='';",
    'for(var i=0;i<b.length;i++){s+=String.fromCharCode(b[i]);}',
    "var b64=btoa(s).split('+').join('-').split('/').join('_').replace(/=+$/,'');",
    'location.href=' + JSON.stringify(app + '#raw=') + '+b64;',
    "}catch(e){alert('抓取失败：'+e);}",
    '})();',
  ].join('');
  // 整体 URL 编码，避免 #、中文、引号等在书签里被浏览器误解；浏览器执行前会自动解码
  return 'javascript:' + encodeURIComponent(code);
}

/** 从 URL hash 读取教务抓取的原始源码（若有） */
export function readRawFromHash(): string | null {
  const m = window.location.hash.match(/raw=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

export function clearRawFromHash(): void {
  if (window.location.hash.startsWith('#raw=')) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}
