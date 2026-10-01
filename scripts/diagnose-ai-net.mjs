// 用应用真正使用的路径测试：Electron 主进程里跑的是 Node 的 fetch（undici），
// 它默认不走系统代理，行为可能和 PowerShell/浏览器不同。
async function tryFetch(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    return 'HTTP ' + res.status
  } catch (e) {
    return 'FAIL: ' + (e && e.message ? e.message : String(e))
  }
}
console.log('api.deepseek.com  -> ' + await tryFetch('https://api.deepseek.com/v1/models'))
console.log('api.openai.com    -> ' + await tryFetch('https://api.openai.com/v1/models'))
console.log('api.siliconflow.cn -> ' + await tryFetch('https://api.siliconflow.cn/v1/models'))
