import { detectGroup, parseStreakDays } from '../src/main/automation/detect.ts'

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

console.log('')
console.log(pass + ' passed, ' + fail + ' failed')
process.exit(fail ? 1 : 0)
