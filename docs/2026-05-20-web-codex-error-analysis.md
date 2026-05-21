# Claudable Web 端 Codex 报错分析与解决方案

## 1. 文档状态

本文最初写于首轮排查阶段，现已根据 `2026-05-21` 最后一轮修复结果更新。

更新后，这份文档记录的是：

- 已被运行时证据确认的根因
- 已经落地的修复原理
- 前一版分析里已经被修正或降级的判断

## 2. 最终问题拆分

这次 Web 端问题最终不是单点故障，而是两条链路叠加：

1. Codex 后端执行链路本身不稳
2. Preview 链路会把失效的 `localhost` URL 长时间留在前端

所以用户感知到的“Web 上报错、一直转圈、localhost 拒绝连接”，并不全是同一个根因。

## 3. 最终确认的根因

### 3.1 Codex 直接启动方式不稳定

最早的主因判断是对的：Node 服务里直接 `spawn(codex, args)` 不稳定，而 shell 包装方式稳定。

最终落地方案是：

- 用 shell wrapper 启动 Codex，而不是直接 `spawn(codex, args)`
- POSIX 走 `sh -lc`
- Windows 走 `powershell.exe`

这部分修复已经落地在：

- `lib/services/cli/codex-shell.ts`
- `lib/services/cli/codex.ts`

### 3.2 `turn.completed` 之前不会立即把 request 收敛到 completed

这是最后一天补齐的关键修复点。

前一版问题里虽然已经注意到“请求可能长时间停在 running”，但当时还没有把根因完全落到代码细节上。最终确认的问题是：

- Codex 收到 `turn.completed` 时，原实现只改内存状态
- 真正的 `markUserRequestAsCompleted()` 要等 `stdout` 读到 EOF 后才执行
- 如果子进程没有立刻自然收尾，数据库就会长时间停在 `running`

最终修复原理是：

- 收到 `turn.completed` 后立即执行成功收敛
- 立即做 assistant flush
- 立即推送 `completed` status
- 立即落库 `markUserRequestAsCompleted()`
- 不再依赖 EOF 作为 request 进入 completed 的必要条件

这部分修复已经落地在：

- `lib/services/cli/codex.ts`
- `lib/services/cli/codex-terminal.ts`
- `tests/codex-terminal.test.ts`

### 3.3 Preview 会把过期或失效的 localhost 地址长期留给前端

这也是最后一天才完整锁定的第二条主链路。

之前用户看到“localhost 拒绝连接”，并不一定是主站没起来，而更可能是：

- 前端还拿着旧的 `previewUrl`
- 当前 preview 进程已经换端口，或者已经停掉
- iframe 继续访问旧的 `localhost:31xx`

最终确认的代码问题有两层：

1. 前端项目页初始化时不会主动用 `/preview/status` 校准当前 preview URL
2. iframe 报错时只会简单刷新同一个地址，不会探活或重启 preview

最终修复原理是：

- 页面初始化时主动读取 `/api/projects/:id/preview/status`
- 如果已有正在运行的 preview，就把真实 `url` 回填给前端
- iframe 报错或用户点击刷新时，不再简单复用旧 `src`
- 改为先同步 preview 状态，必要时自动重新拉起 preview，再把 iframe 指向新的有效 URL

这部分修复已经落地在：

- `app/[project_id]/chat/page.tsx`

### 3.4 Preview 后端之前会把“没 ready 的服务”也当成功返回

前一版分析里没有完全覆盖这点，最后一天补证据后确认这是 preview 假成功的关键原因之一。

原行为是：

- `waitForPreviewReady()` 超时后只记录日志
- 但 `previewManager.start()` 仍继续返回 `running`
- 同时把 `previewUrl` 持久化到数据库

这会把一个实际上不可用的 `localhost` URL 提前发给前端。

最终修复原理是：

- Preview 在超时未 ready 时不再继续成功返回
- 直接清理子进程和内存态
- 重置数据库中的 `previewUrl`、`previewPort`、`status`
- 以失败结束这次 preview 启动

这部分修复已经落地在：

- `lib/services/preview.ts`

## 4. 前一版里已修正的判断

### 4.1 “多个 request 长时间 running”不再作为当前常态结论

这个现象在排查早期确实存在，但不是当前代码状态下的最终结论。

最后一次核对时，之前那条长时间处于 `running` 的请求：

- `project-1779350230695-oozv7vk`

已经自然收敛到：

- `status = completed`

因此，当前更准确的说法是：

- 老实现确实可能让 request 长时间卡在 `running`
- 但最后一天已经补了“`turn.completed` 即刻收敛”的修复

### 4.2 “session 轮询协议不一致”不再作为本轮主根因

这类前端协议问题有排查价值，但不是这轮 Web 端 Codex/preview 故障的最终主根因。

最终真正落地并直接改善现象的，是：

- Codex shell wrapper
- `turn.completed` 即时 completed
- preview readiness 兜底
- preview status 同步与 iframe 恢复

### 4.3 “CLI 状态检测环境不一致”不再作为本轮主 blocker

这类问题理论上仍可能造成假阳性，但从最后拿到的证据看，本轮核心障碍并不是 CLI 可见性，而是：

- Codex 启动与完成收敛
- Preview 地址与状态同步

## 5. 最终已落地修复

### 5.1 Codex 执行链路

- 用 shell wrapper 替代 direct spawn
- Windows 使用 `powershell.exe` 包装
- 超时改为“无活动超时”
- `turn.completed` 到达时立即 completed 收敛

### 5.2 前端状态链路

- 正确消费 realtime `data.status`
- 把 `error` 视为终态
- 初始化项目页时同步 preview status
- iframe 报错时自动探活/重启 preview

### 5.3 Preview 后端链路

- 统一 preview fallback 目录
- preview 未 ready 时不再假成功
- 失败时回滚数据库中的 preview 状态

## 6. 当前建议排查顺序

如果后续再看到类似“Web 报错”：

1. 先看 request 是否真的已落成 `completed/failed`
2. 再看 `/api/projects/:id/preview/status` 返回的 `url` 是什么
3. 再看 `preview/start` 返回体里的 `logs`
4. 最后再看上游网络/代理问题

不要再默认把“浏览器里看到 localhost 拒绝连接”直接等同于“Codex CLI 不可用”。

## 7. 推荐命令

### 7.1 查 request 状态

```bash
rtk proxy node -e 'const {PrismaClient}=require("@prisma/client"); const prisma=new PrismaClient(); (async()=>{const id="替换为真实requestId"; console.log(JSON.stringify(await prisma.userRequest.findUnique({where:{id}}),null,2)); await prisma.$disconnect();})()'
```

### 7.2 查 preview 状态

```bash
rtk proxy curl -s http://127.0.0.1:3000/api/projects/<projectId>/preview/status
```

### 7.3 强制重新拉起 preview 并直接看日志

```bash
rtk proxy curl -s -X POST http://127.0.0.1:3000/api/projects/<projectId>/preview/start
```

## 8. 最终判断

当前仓库里，最后一轮真正有价值的修复原理不是“多加几个兜底判断”，而是把状态机改正确：

- Codex 在逻辑完成时就立即 completed
- Preview 只有真正 ready 时才允许把 URL 暴露给前端
- 前端不能盲信旧的 `localhost` 地址，而要主动回查真实 preview 状态

这三点，是这次最后一天修复的核心。
