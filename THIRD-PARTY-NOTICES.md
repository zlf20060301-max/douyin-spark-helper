# 第三方来源与署名 / Third-Party Notices

本项目的实现建立在多个开源项目的公开成果之上。下面逐项说明**参考了什么**、**用在了哪些文件**，
以及对应的许可证。凡属直接改编的代码，均按原许可证要求保留原始版权声明。

---

## 1. 2061360308/DouYinSparkFlow — MIT

- 仓库：https://github.com/2061360308/DouYinSparkFlow
- 许可证：MIT
- 原版权声明：`Copyright (c) 2026 2061360308 盧瞳`

**参考内容：**

| 本项目的文件 | 参考了什么 |
|---|---|
| `src/main/automation/selectors.ts` | 页面选择器常量（`[data-e2e="conversation-item"]`、`.conversationConversationItemtitle`、`.conversationConversationListwrapper`、`.conversationConversationItemcurConversation`、`[data-e2e="login-container"]`、`[data-e2e="user-avatar-card"]`、`[data-e2e="msg-item-content"]`、`.MessageBoxContentisFromMe`、`.messageMsgInputpublishBtn`、`EDITOR_CANDIDATES`）——均来自其 HAR 抓包分析的实测结果 |
| `src/main/automation/scripts/collect.js` | **改编自其 `JS_COLLECT`**：通过 React fiber / props 遍历取出内部 conversation 模型；标题中 U+00A0 不换行空格需要还原为普通空格 |
| `src/main/automation/scripts/scrollProbe.js`、`scrollTo.js` | 虚拟列表的滚动容器探针与按绝对像素 `scrollTo` 的分页扫描思路 |
| `src/main/automation/scripts/currentConv.js` | 用当前选中态 + 右侧会话标题做交叉校验 |
| `src/main/automation/douyin.ts` | 登录态判定的优先级（监听/SSR → 页面 DOM → sessionid cookie 佐证 → 判为「已失效」而非「未登录」） |

其 MIT 许可证全文：

```
MIT License

Copyright (c) 2026 2061360308 盧瞳

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 2. Xiaowu-0916/douyin-spark — MIT

- 仓库：https://github.com/Xiaowu-0916/douyin-spark
- 许可证：MIT
- 原版权声明：`Copyright (c) 2026 Douyin Spark Keeper contributors`

**参考内容：**

| 本项目的文件 | 参考了什么 |
|---|---|
| `src/main/automation/douyin.ts` | **发送流程的加固策略**（改编自其 `core/automation.py`）：点击联系人后必须校验右侧会话标题确实切换、否则用搜索兜底，防止限流时错发给上一个人；限流/验证关键词命中立即中止本轮；以「输入框文字被清空」作为真正发出的判据；失败自动重试一次 |
| `src/main/automation/scripts/collect.js` | 火花天数取自 `.commonStreaknormalText` |
| `src/main/automation/selectors.ts` | 风控关键词表与登录提示文案 |
| `src/main/scheduler.ts` / `src/main/index.ts` | 定时窗口 + 好友间随机间隔、当日失败补发的产品思路 |

其 MIT 许可证全文：

```
MIT License

Copyright (c) 2026 Douyin Spark Keeper contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 3. halfwaystudent/douyin-sparkflow — PolyForm Noncommercial 1.0.0

- 仓库：https://github.com/halfwaystudent/douyin-sparkflow
- 许可证：PolyForm Noncommercial License 1.0.0（**禁止商业用途**）

**参考内容：** 仅作为架构与产品形态的调研对象阅读（多账号 Web 控制台的信息架构：概览/登录/账号/日志/设置，
以及「发送状态机」的思路：pending → in_flight → send_confirmed → streak_verified）。
**本项目未使用、未改编其任何代码**，也未复制其界面资源。列出仅为来源说明。

---

## 4. baiyingawa/AutoDouyinSpark

- 仓库：https://github.com/baiyingawa/AutoDouyinSpark
- 许可证：仓库未声明许可证

**参考内容：** 仅阅读其 README，用于功能取舍参考（识别群聊并跳过、登录态过期邮件提醒、发送后截图存档）。
**本项目未使用、未改编其任何代码**。

---

## 5. 其它仅在调研中比较过的同类项目

调研阶段用于技术路线选型的横向对比，**未使用其中任何代码**：

- [Yuriz132/douyin-cloud-streak](https://github.com/Yuriz132/douyin-cloud-streak)
- [xianyulolo8/douyin-spark](https://github.com/xianyulolo8/douyin-spark) — 纯 HTTP Protobuf 方案
- [Quan-Robin/douyin-spark](https://github.com/Quan-Robin/douyin-spark) — Android 无障碍方案
- [iosyyds/DouYinFireTool](https://github.com/iosyyds/DouYinFireTool) — 油猴脚本方案
- [xuezhangjam/DouyinSparkAssistant](https://github.com/xuezhangjam/DouyinSparkAssistant)
- [BTHawake/DouYinSpark-ALL](https://github.com/BTHawake/DouYinSpark-ALL)
- [lvfengfree/douyin-bond-maintainer](https://github.com/lvfengfree/douyin-bond-maintainer)
- [Wh1t3Zz77/douyin-spark-keeper](https://github.com/Wh1t3Zz77/douyin-spark-keeper)
- [FROZZEENN/douyin-huohua-keeper](https://github.com/FROZZEENN/douyin-huohua-keeper)

---

## 依赖项

运行期第三方依赖及其许可证：

| 依赖 | 许可证 |
|---|---|
| [Electron](https://github.com/electron/electron) | MIT |
| [Playwright](https://github.com/microsoft/playwright)（`playwright-core`） | Apache-2.0 |
| [React](https://github.com/facebook/react) | MIT |
| [electron-vite](https://github.com/alex8088/electron-vite) | MIT |
| [electron-builder](https://github.com/electron-userland/electron-builder) | MIT |
| [Vite](https://github.com/vitejs/vite) | MIT |

完整依赖树见 `package.json` 与 `package-lock.json`。
