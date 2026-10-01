import { detectGroup, parseStreakDays } from '../src/main/automation/detect.ts'
import { readFileSync } from 'node:fs'

let pass = 0
let fail = 0
function check(name, actual, expected) {
  const ok = actual === expected
  if (ok) pass++; else fail++
  console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + ' -> ' + actual + (ok ? '' : '  (expected ' + expected + ')'))
}

console.log('--- 回归：v0.1.0 的 bug（1v1 的 participantCount 就是 2）---')
check('1v1 (0:1:) 成员数=2 应判为非群聊', detectGroup('0:1:123:456', 2).isGroup, false)
check('成员数=2 且无 convId 应判为非群聊', detectGroup(null, 2).isGroup, false)
check('成员数=1 应判为非群聊', detectGroup(null, 1).isGroup, false)

console.log('--- 群聊识别 ---')
check('0:2: 前缀 应判为群聊', detectGroup('0:2:111:222:333', 3).isGroup, true)
check('纯数字 ID 应判为群聊', detectGroup('7209265235419514000', 9).isGroup, true)
check('成员数=9 应判为群聊', detectGroup(null, 9).isGroup, true)
check('成员数=3 应判为群聊', detectGroup(null, 3).isGroup, true)

console.log('--- 保守默认：信息不足时不猜成群聊 ---')
check('无 ID 无成员数 应判为非群聊', detectGroup(null, null).isGroup, false)
check('空串 ID + 成员数=2 应判为非群聊', detectGroup('', 2).isGroup, false)

console.log('--- 火花天数 ---')
check('parseStreakDays(845)', parseStreakDays('845'), 845)
check('parseStreakDays(1 天后消失)', parseStreakDays('1 天后消失'), 1)
check('parseStreakDays(null)', parseStreakDays(null), null)
check('parseStreakDays(空串)', parseStreakDays(''), null)

console.log('--- 静态回归：禁止 evaluate(JS_X, arg) 反模式 ---')
// 实测：page.evaluate('((x) => {...})', arg) 不会调用函数，返回 undefined 且不报错。
// 带参数的脚本必须走 evalWithArg() 拼成自执行表达式。
const src = readFileSync(new URL('../src/main/automation/douyin.ts', import.meta.url), 'utf8')
const badCalls = [...src.matchAll(/page\.evaluate\(\s*JS_[A-Z_]+\s*,/g)]
check('douyin.ts 中无 evaluate(JS_X, arg) 调用', badCalls.length, 0)
check('douyin.ts 使用 evalWithArg', src.includes('evalWithArg('), true)
check('detect.ts 无 DOM 依赖（可在纯 Node 下测试）', readFileSync(new URL('../src/main/automation/detect.ts', import.meta.url), 'utf8').includes('document.'), false)

console.log('')
console.log(pass + ' passed, ' + fail + ' failed')
process.exit(fail ? 1 : 0)
