# Companion Agent 产品与技术方案 V0.1

> 面向 `note` 项目的长期桌面 Companion Agent  
> 核心目标：**Live2D 形象 + 熟悉/喜欢且有权使用的声音 + 长期陪伴 + 任务上下文**，形成一个**低打扰、强存在、可私人定制、轻量化**的桌面伙伴。  
> 本方案结合 Hello-Agents 的 Agent 范式、工具系统、记忆、上下文工程、协议与评估知识，作为后续 Codex 开发的统一依据。

---

## 1. 产品目标

### 1.1 一句话定义

一个长期驻留桌面的私人 Companion Agent：

- 有固定 Live2D 形象与声音；
- 不聊天时也有自然存在感；
- 能理解 `note` 中的今日任务、进度和专注状态；
- 只在合适时机主动出现；
- 能跨会话记住必要的信息；
- 能通过安全 Tool 真正操作任务；
- Agent、语音、Live2D 均采用可替换接口；
- 默认轻量运行，**不让 LLM、ASR、视觉模型持续后台工作**。

### 1.2 V1 不做

为了控制复杂度和资源占用，V1 明确不做：

- 全屏持续视觉理解；
- 摄像头持续感知；
- 常驻语音唤醒；
- 自动控制任意软件；
- Shell / Python 任意执行；
- 多 Agent 协作；
- 重型向量数据库；
- 每个桌面事件都调用 LLM；
- 自动训练 Live2D 模型。

---

# 2. Hello-Agents 知识映射

| Companion 模块 | Hello-Agents 知识点 | 项目中的实际用途 |
|---|---|---|
| CompanionAgent | 第 4 章：ReAct / Plan-and-Solve / Reflection | 决定什么时候直接回复、什么时候调用 Tool、什么时候规划 |
| Agent Core | 第 7 章：Agent Framework | 统一 LLM、Message、Tool Registry、Agent Loop |
| Task Tools | 第 7 章：Tool System | 获取/创建/完成/延期任务，启动/停止专注 |
| Working Memory | 第 8 章：Memory | 保存当前会话、最近工具结果、当前任务 |
| Episodic Memory | 第 8 章：Memory | 保存重要经历，例如重要任务完成、用户反复拒绝提醒 |
| Semantic Memory | 第 8 章：Memory | 提炼长期偏好、称呼、工作习惯 |
| Note 检索 | 第 8 章：RAG | V2 用于检索用户笔记，不在 V1 强制上线 |
| ContextBuilder | 第 9 章：Context Engineering | 每次只给模型当前真正需要的任务、记忆和状态 |
| GSSC 思路 | 第 9 章：Gather-Select-Structure-Compress | 控制上下文体积，降低 Token 和延迟 |
| MCP 扩展层 | 第 10 章：Agent Communication Protocols | V2/V3 接 Calendar、GitHub、外部服务 |
| Evaluation | 第 12 章：Agent Evaluation | Tool 正确率、记忆准确率、打扰率、延迟等 |
| Capstone 思路 | 第 16 章 | 将 Agent 理论落到完整 Companion 产品 |

Hello-Agents 参考：
- https://hello-agents.datawhale.cc/
- https://github.com/datawhalechina/hello-agents

---

# 3. 总体架构

```text
                   Companion Agent
                         │
       ┌─────────────────┼──────────────────┐
       │                 │                  │
       ▼                 ▼                  ▼
    Live2D Body       Voice Engine       Persona
       │                 │                  │
       └─────────────────┼──────────────────┘
                         ▼
                 Companion Runtime
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
      Behavior        Attention       Event Bus
       Engine          Engine
          │              │
          └──────────────┼──────────────┐
                         ▼              ▼
                    Agent Brain      Task Context
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
            Tools      Memory     ContextBuilder
```

## 核心原则

### 原则 A：LLM 不是整个 Companion

以下行为全部本地规则完成，不调用 LLM：

- 眨眼；
- 呼吸；
- 看鼠标；
- Idle 动作；
- 睡眠；
- 鼠标点击反馈；
- Task 完成庆祝；
- Focus 状态切换；
- 勿扰判断；
- 冷却时间。

LLM 只用于：

- 理解自然语言；
- 生成回复；
- Tool 选择；
- 复杂规划；
- 需要语义理解的记忆提炼。

### 原则 B：事件驱动，不轮询大模型

```text
TaskCompleted
      ↓
Event Bus
      ↓
Attention Engine
      ↓
Behavior Engine
      ↓
必要时才唤醒 Agent
```

### 原则 C：默认轻量

- Idle 时 Agent 不调用模型；
- Idle 时 ASR 不运行；
- V1 不持续截图；
- TTS/声音克隆模型按需启动；
- Memory 首选 SQLite；
- Context 按需拼装；
- 只保留有限近期会话；
- Live2D 动画走状态机，不依赖 LLM。

---

# 4. 核心模块设计

## 4.1 CompanionAgent

**对应 Hello-Agents：第 4、7 章。**

### V1 路由策略

```text
普通闲聊
  → Direct Response

涉及任务读取/修改
  → ReAct

复杂日程规划
  → Plan-and-Solve

高风险或复杂结果检查
  → Reflection（低频）
```

### 示例

用户：

> 今天还有什么没做？

执行：

```text
Agent
 → get_today_tasks()
 → Observation
 → 组织自然语言回答
```

用户：

> 把论文这个任务完成掉。

执行：

```text
Agent
 → search_tasks("论文")
 → complete_task(task_id)
 → ToolResponse
 → EventBus(TaskCompleted)
 → Celebrate
```

---

## 4.2 Tool System

**对应 Hello-Agents：第 7 章。**

V1 只开放 `note` 自己的安全工具。

### Read Tools

```text
get_today_tasks()
get_task(id)
search_tasks(query)
get_today_progress()
get_focus_status()
```

允许 Agent 自主调用。

### Write Tools

```text
create_task(...)
update_task(...)
complete_task(id)
reschedule_task(id, time)
start_focus(task_id?)
stop_focus()
```

默认原则：

- 用户明确要求时才调用；
- Tool 必须结构化返回；
- 不开放 Shell；
- 不开放任意文件写入；
- 不开放任意系统控制。

### ToolResponse

```json
{
  "status": "SUCCESS",
  "message": "任务已完成",
  "data": {
    "task_id": "281",
    "title": "修改论文摘要"
  }
}
```

状态固定：

```text
SUCCESS
PARTIAL
ERROR
```

---

## 4.3 Memory

**对应 Hello-Agents：第 8 章。**

V1 不使用复杂数据库，优先：

```text
SQLite + JSON 字段
```

### Working Memory

保存：

- 最近 N 轮对话；
- 当前任务；
- 最近 Tool 结果；
- 当前 Focus；
- 当前 Companion 状态。

生命周期：

```text
当前 Session
```

### Episodic Memory

保存“值得记住的事件”：

```text
用户完成一个重要任务
用户连续拒绝某类提醒
一次重要对话
用户主动要求记住的信息
```

### Semantic Memory

从多次事件中提炼：

```text
用户晚上不喜欢语音提醒
用户习惯 50 分钟专注
用户希望 Companion 称呼自己为……
```

### Memory Gate

任何内容进入长期记忆前必须判断：

```text
importance
future_value
repetition
user_intent
```

低价值信息直接丢弃。

---

## 4.4 ContextBuilder

**对应 Hello-Agents：第 9 章。**

采用 Hello-Agents 的 **GSSC** 思想：

```text
Gather
  ↓
Select
  ↓
Structure
  ↓
Compress
```

每次 LLM 调用只组装需要的信息。

### 固定结构

```text
[Role & Policies]
Companion Persona + 权限 + 低打扰规则

[Task]
用户当前请求

[State]
当前时间
当前 Focus
当前 Companion 状态

[Task Context]
只放相关 Todo

[Memory]
只放相关长期记忆

[Recent Dialogue]
最近少量会话

[Tools]
当前允许调用的工具

[Output]
输出约束
```

### 轻量原则

普通“你好”：

```text
不加载 Todo
不加载长期 Memory
不加载 Note
```

询问论文任务：

```text
只加载相关 Task
+ 最近相关 Memory
```

不要把所有数据塞给模型。

---

## 4.5 Event Bus

这是 `note` 和 Companion 的主要连接层。

### V1 事件

```text
TaskCreated
TaskUpdated
TaskStarted
TaskCompleted
TaskOverdue

FocusStarted
FocusEnded

UserIdle
UserReturned

CompanionClicked
CompanionDragged
```

事件示例：

```json
{
  "type": "TaskCompleted",
  "payload": {
    "task_id": "281",
    "title": "修改论文摘要"
  }
}
```

---

## 4.6 Attention Engine

这是“低打扰”的核心，不属于 Hello-Agents 原生模块，是本项目核心产品逻辑。

任何主动行为先经过它。

### 输入

```text
event_importance
urgency
focus_state
typing_activity
fullscreen_state
time_since_last_interrupt
user_proactive_level
quiet_hours
```

### 输出等级

```text
0 = 忽略
1 = 仅动作
2 = 动作 + 气泡
3 = 动作 + TTS
4 = 唤醒 Agent
```

### 示例

```text
TaskCompleted
→ Level 1~2
→ 默认只庆祝，不一定说话
```

```text
重要任务 10 分钟后截止
→ Level 2~3
```

```text
用户正在 Focus
→ 主动语音强制降级
```

### 必须有 Cooldown

避免：

```text
5 分钟提醒一次
连续多个事件连续说话
```

---

## 4.7 Behavior Engine

负责“强存在”。

完全本地状态机：

```text
IDLE
RELAX
WATCHING
FOCUS
SLEEP
THINKING
TALKING
HAPPY
CELEBRATE
```

示例：

```text
FocusStarted
 → FOCUS

TaskCompleted
 → CELEBRATE
 → 3~5 秒后回 IDLE

UserIdle 10 min
 → RELAX

QuietHours
 → SLEEP
```

LLM 只能输出高级语义：

```json
{
  "emotion": "happy",
  "intensity": 0.7
}
```

Behavior Engine 再映射到具体 Live2D：

```text
happy
 → Expression_Happy
 → Motion_Cheer
```

禁止 LLM 直接操作具体 motion 文件。

---

## 4.8 Live2D Body

V1：

- 导入 Live2D 模型；
- 透明窗口；
- Always-on-top；
- 拖拽；
- 缩放；
- 鼠标点击；
- 视线跟随；
- Idle Motion；
- Expression；
- Lip Sync；
- Motion Queue。

统一接口：

```text
AvatarController

setExpression()
playMotion()
setLipValue()
lookAt()
setState()
```

这样 Agent 层完全不知道具体 Live2D SDK。

---

## 4.9 Voice Engine

目标：

```text
喜欢的声音
+ 可替换 TTS
+ 按需运行
```

接口：

```text
VoiceProvider

synthesize(text, voice_id)
stop()
load()
unload()
```

可实现：

```text
SystemTTS
CloudTTS
CosyVoice
GPT-SoVITS
```

### 轻量策略

- 默认不常驻声音克隆模型；
- 第一次说话时 Lazy Load；
- N 分钟无语音后卸载；
- 支持云端 TTS 作为低配置方案；
- TTS 与 Live2D Lip Sync 流式联动；
- V1 不常驻 ASR。

---

# 5. CompanionProfile

一个 Companion 是完整实体，不是单独 Live2D。

```text
CompanionProfile
├─ id
├─ name
├─ avatar
├─ voice
├─ personality
├─ speaking_style
├─ relationship
├─ nickname
├─ proactive_level
├─ voice_frequency
├─ quiet_hours
├─ memory_policy
└─ task_permission
```

---

# 6. 推荐目录边界

> 最终目录需根据现有 `note` 技术栈调整；以下仅规定职责，不强制语言。

```text
companion/
├─ agent/
│  ├─ companion_agent
│  ├─ router
│  └─ prompts
│
├─ tools/
│  ├─ registry
│  ├─ task_tools
│  ├─ focus_tools
│  └─ response
│
├─ memory/
│  ├─ working
│  ├─ episodic
│  ├─ semantic
│  └─ gate
│
├─ context/
│  └─ context_builder
│
├─ runtime/
│  ├─ event_bus
│  ├─ behavior_engine
│  ├─ attention_engine
│  └─ state
│
├─ avatar/
│  └─ live2d_controller
│
├─ voice/
│  ├─ provider
│  └─ lipsync
│
├─ persona/
│  └─ companion_profile
│
└─ evaluation/
   └─ companion_bench
```

---

# 7. 轻量化硬约束

这是开发过程中必须长期遵守的规则。

## 7.1 Runtime

空闲状态：

```text
LLM = OFF
ASR = OFF
Screen Vision = OFF
TTS Model = 可卸载
Behavior = 本地状态机
Attention = 本地规则
```

## 7.2 数据

V1：

```text
SQLite
```

不先引入：

```text
Qdrant
Neo4j
Elasticsearch
```

只有数据量和检索质量证明需要时再升级。

## 7.3 Context

每次模型调用设 Token Budget。

优先级：

```text
当前用户请求
> 当前任务
> 最近对话
> 相关记忆
> 其他信息
```

## 7.4 模型调用

禁止：

```text
固定每 N 秒调用 LLM
```

必须：

```text
用户触发
或
高价值事件触发
```

## 7.5 语音

声音克隆模型与主 UI 解耦。

如果本地模型较重：

```text
独立进程 / 服务
按需启动
空闲卸载
```

## 7.6 建议性能目标

以下为“增量资源占用目标”，不含用户主动运行的大模型：

```text
Idle CPU       < 3%
Idle GPU       < 5%
Companion RAM  尽量 < 250 MB
无 LLM 请求时网络请求 = 0
```

若现有技术栈导致 RAM 无法达到，优先保证：

```text
CPU/GPU 空闲占用低
无持续模型推理
```

---

# 8. 开发阶段

## Phase 0：PoC

目标：

```text
Live2D
 + TTS
 + Lip Sync
```

验收：

- Live2D 稳定悬浮；
- 输入文字可以说话；
- 嘴型跟随；
- Idle 不调用 LLM。

---

## Phase 1：Hello-Agents Agent 基础

学习：

```text
第 4 章
第 7 章
```

实现：

```text
CompanionAgent
ReAct
ToolRegistry
Task Tools
```

验收：

```text
“今天还有什么？”
→ 能读取任务

“把论文任务完成”
→ 能正确调用 Tool
```

---

## Phase 2：Runtime

实现：

```text
Event Bus
Behavior Engine
Attention Engine
```

验收：

```text
不开 LLM
也能完成：
Idle / Focus / TaskComplete / Sleep
```

这是关键验收点：

> **没有 AI 对话时，它也应该像一个完整桌宠。**

---

## Phase 3：Memory

学习：

```text
第 8 章
```

实现：

```text
Working Memory
Episodic Memory
Semantic Memory
Memory Gate
```

验收：

- 重启后保留必要偏好；
- 不保存大量无价值聊天；
- 可删除记忆。

---

## Phase 4：Context Engineering

学习：

```text
第 9 章
```

实现：

```text
ContextBuilder
GSSC
Token Budget
Task Context
Memory Retrieval
```

验收：

- 普通聊天不加载全部任务；
- 任务问题只加载相关上下文；
- 长对话不无限增长。

---

## Phase 5：产品化

实现：

```text
CompanionProfile
声音设置
Live2D 导入
主动程度
勿扰
权限
错误恢复
```

---

## Phase 6：Evaluation

学习：

```text
第 12 章
```

建立：

```text
CompanionBench
```

指标：

```text
Tool Accuracy
Memory Precision
Memory Recall
Proactive Precision
Interruption Rate
Persona Consistency
Agent Latency
TTS Latency
Token Usage
```

---

# 9. V1 验收标准

V1 完成必须同时满足：

### 身体

- [ ] Live2D 稳定驻留桌面
- [ ] 点击/拖动/缩放
- [ ] Idle Motion
- [ ] Expression
- [ ] Lip Sync

### 声音

- [ ] 至少一种自定义 TTS
- [ ] 支持声音克隆 Provider
- [ ] 可中断语音
- [ ] 模型按需加载

### Agent

- [ ] 文本对话
- [ ] ReAct Tool Calling
- [ ] 读取今日任务
- [ ] 创建/完成/延期任务
- [ ] Focus Tool

### 陪伴

- [ ] Behavior Engine
- [ ] Attention Engine
- [ ] 主动等级
- [ ] 勿扰
- [ ] Cooldown

### Memory

- [ ] Working Memory
- [ ] 基础长期 Memory
- [ ] Memory Gate
- [ ] 可查看/删除

### 轻量

- [ ] Idle 不调用 LLM
- [ ] Idle 不持续 ASR
- [ ] 无持续屏幕截图
- [ ] 本地 Event 驱动
- [ ] SQLite 优先
- [ ] Voice 模型可卸载

---

# 10. 给 Codex 的开发规则

Codex 开发此模块时必须遵循：

1. **先读本文档，再改代码。**
2. 不允许为了方便把所有逻辑塞进一个 `CompanionService`。
3. Agent 不直接依赖 Live2D SDK。
4. Agent 不直接读写任务数据库，必须通过 Tool。
5. Live2D 不直接调用 LLM。
6. 主动行为必须经过 Attention Engine。
7. 普通动画禁止调用 LLM。
8. Memory 写入必须经过 Memory Gate。
9. Context 禁止每次加载全部 Todo / Memory。
10. V1 禁止引入重型向量数据库。
11. 新增后台循环必须说明：
    - 执行频率；
    - CPU 开销；
    - 为什么不能 Event Driven。
12. 新增模型必须支持：
    - Lazy Load；
    - Cancel；
    - Unload。
13. 每完成一个 Phase，先过验收再进入下一阶段。
14. 不要一次实现 V2/V3 预留功能。
15. 优先“小接口 + 可替换 Provider”，不要过度抽象。

---

# 11. 学习与开发顺序

```text
Hello-Agents 第4章
    ↓
理解 ReAct / Plan-and-Solve / Reflection
    ↓
实现 Task Agent
    ↓
第7章 Tool / Agent Framework
    ↓
规范 Tool 系统
    ↓
第8章 Memory
    ↓
加入长期陪伴
    ↓
第9章 Context Engineering
    ↓
降低 Token + 提高准确性
    ↓
第12章 Evaluation
    ↓
建立 CompanionBench
```

第 10 章 MCP：

```text
先学习
后接入
```

V1 内部 `note` Task 不需要为了 MCP 而 MCP。

---

# 12. V1 最终用户体验

用户创建：

```text
Live2D
  +
喜欢的声音
  +
Persona
```

运行后：

```text
平时
→ 安静待在桌面
→ 自己眨眼、休息、看鼠标

开始任务
→ 自动进入 Focus 陪伴状态

完成任务
→ 开心动作
→ 偶尔一句简短语音

用户主动聊天
→ Agent 唤醒
→ 必要时调用 Task Tool

第二天重新打开
→ 仍记得必要的称呼、偏好和重要经历
```

最终目标不是：

> “桌面上放一个会说话的 ChatGPT。”

而是：

> **“桌面上有一个喜欢的角色，它大多数时候很安静，但知道我今天在做什么，也记得我们之间真正重要的事情。”**

---

## 参考章节

- Hello-Agents 第 4 章：智能体经典范式
- Hello-Agents 第 7 章：构建 Agent Framework / Tool System
- Hello-Agents 第 8 章：Memory 与 Retrieval
- Hello-Agents 第 9 章：Context Engineering / GSSC
- Hello-Agents 第 10 章：MCP / Agent Protocol
- Hello-Agents 第 12 章：Agent Evaluation
- Hello-Agents 第 16 章：综合项目

> 文档版本：V0.1  
> 当前优先级：**轻量化 > 稳定性 > 陪伴体验 > Agent 功能数量**
