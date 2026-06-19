---
name: meoo-llm-ai
description: >
 【Role】Sole entry point for all text-based LLM capabilities in Meoo.Trigger: MUST load for ANY AI/LLM app development, chatbot/assistant creation, full-stack AI integration, frontend/backend AI features, or Meoo Cloud AI deployment. Also triggers on any model name (Qwen/Kimi/DeepSeek/GLM/MiniMax) or LLM API mention.Scope: End-to-end AI text workflows—chat UI, API/streaming setup, session management, prompt config, model routing & switching.Rule: NEVER use raw OpenAI/DashScope/third-party SDKs. ALL LLM calls MUST route through this skill.Models: qwen3.6-plus (default), kimi-k2.5, qwen3.5-plus, deepseek-v3.2, glm-5, MiniMax-M2.5.

 【BLOCKING】MUST first load meoo-cloud skill and initialize before use

---

# Meoo LLM 文本能力集成

在 Meoo 项目中接入纯文本 AI能力的标准指南。覆盖对话、生成、总结、改写、翻译、分类、抽取等全部文本智能场景。

## 技能定位

本技能只负责 AI相关代码——把文本 AI 能力作为现有业务的一个功能点接入，而不是重建整个工程。

典型目标：

-在页面嵌入智能客服
- 增加"AI 总结""AI 改写""AI 翻译"按钮
- 给现有表单、列表、详情页增加文本 AI辅助
- 给业务流程增加文本生成或文本分析能力

本技能不用来重写整个工程、重搭脚手架或设计完整业务系统。

## 和 meoo-agent既有规范的关系

- 工程结构、技术栈、页面组织、通用前后端实现方式，优先遵循 meoo-agent 原有规范。
-本技能不替代 meoo-agent的通用工程生成能力，只补充"如何把 Meoo AI文本能力接进现有项目"。
-当 meoo-agent 已经确定项目目录、页面结构、接口风格时，本技能只负责 AI相关部分的落点、请求格式、鉴权方式、交互模式和最小实现约束。

##模态边界与能力分工

根据用户意图选择正确的技能：

|用户意图 |应使用的技能 |
|---------|------------|
|**在用户应用里接入** AI（"加个 AI""做个智能XX""写个 AI助手页面") | **llm-ai**（本技能） |
| 图片输入（"分析这张图""识别图片""图文对话") | **vision-ai** |
| **在用户应用里接入**图片生成（"做个 AI 绘画工具""页面里加个生图按钮") | **image-gen-ai** |
| **当前对话中直接生成图片**（"生成一张猫的图""画一张赛博城市") | Bash 工具 `meoo-cli image-generate`（不加载任何技能） |
| **当前对话中直接回答文本**（普通问答、解释、总结） | 直接回答（不加载任何技能，agent 自身就是 LLM） |

**不该由 llm-ai 处理的情况：**

- 用户要求"看图""分析图片""识别图中内容" → 使用 vision-ai
-用户要求"画一张图""生成图片""文生图" → 看场景：要在应用里接入用 image-gen-ai；当前对话直接出图用 Bash `meoo-cli image-generate`
-用户要求"围绕图片多轮追问""图文混合聊天" → 使用 vision-ai（多轮模式）
- 用户要求处理音频、视频等非文本媒体 →超出当前技能覆盖范围，需明确告知
- 用户只是问问题、要答复 →直接回复即可，本技能仅在"把 AI 能力嵌入用户应用"时才加载

**关键判断**：本技能的边界是"**给用户应用接入 AI 能力**"。如果只是 agent 自己跟用户对话、答疑，不加载本技能；如果只是 agent 给用户生一张图，走 Bash 不加载本技能。

##前置检查

**必须先加载 meoo-cloud 技能并确认当前项目已初始化 Cloud 功能。**

1. 如果尚未加载 meoo-cloud 技能，必须先使用 Skill 工具加载：`skill: "meoo-cloud"`
2. 加载完成后，使用 `init` 命令检查并初始化 Cloud 功能。
3. Cloud 未初始化时，禁止继续生成 AI 接入代码。必须先让用户完成初始化。
4. 初始化失败时，明确提示用户先完成 Cloud 功能初始化。

## 凭证与接口

Meoo AI域名：

```
https://api.meoo.host
```

服务 AK **不写在前端**，由 Edge Function 从环境变量 `MEOO_PROJECT_API_KEY`读取。前端通过 Edge Function 间接调用 Meoo AI，无需接触 AK。

Meoo AI 文本接口路径：

```
POST /meoo-ai/compatible-mode/v1/chat/completions
```

请求头（Edge Function 内部使用）：

```http
Authorization: Bearer <MEOO_PROJECT_API_KEY>
Content-Type: application/json
```

不需要 Cookie。

##模型

默认：`qwen3.6-plus`

可选模型：

| 模型名 | 说明 |
|--------|------|
| `qwen3.6-plus` |默认模型，通义千问 Qwen3.6-Plus |
| `kimi-k2.5` | 综合能力强 |
| `qwen3.5-plus` |通义千问 Qwen3.5-Plus |
| `deepseek-v3.2` | DeepSeek V3.2 |
| `glm-5` | 智谱 GLM-5 |
| `MiniMax-M2.5` | MiniMax M2.5 |

除非用户明确要求切换模型，否则始终使用 `qwen3.6-plus`。模型名必须严格按上表填写，包括大小写和版本号后缀。

###模型严格限制

Meoo 平台只提供上表中列出的模型服务。**以下模型无法通过本技能接入，也无法通过 Meoo平台使用：**

- OpenAI 系列（GPT-4、GPT-4o、GPT-3.5 等）
- Anthropic系列（Claude3、Claude3.5、Claude 4 等）
-Google 系列（Gemini、Gemini Pro、Gemini Flash 等）
- Meta 系列（LLaMA 等）
- 其他任何不在上表中的模型

如果用户要求使用 GPT、Claude、Gemini或其他列表外的模型，必须明确告知：**Meoo 平台不提供这些模型的服务，无法接入。**可以建议用户从上表中选择一个替代模型。不要尝试通过 OpenAI SDK、Anthropic SDK或其他第三方 SDK 绕道接入这些模型——这既违反本技能的约束，也无法在 Meoo 架构下运行。

## Edge Function 服务端模板

文件位置：`/functions/ai-chat/index.ts`

```ts
const MEOO_AI_BASE_URL = 'https://api.meoo.host';
const MEOO_PROJECT_SERVICE_AK = Deno.env.get('MEOO_PROJECT_API_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const messages = body.messages || [];
    const model = body.model || 'qwen3.6-plus';

    // 调用 Meoo AI（强制流式）
    const response = await fetch(
      `${MEOO_AI_BASE_URL}/meoo-ai/compatible-mode/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MEOO_PROJECT_SERVICE_AK}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages, stream: true }),
      }
    );

    // 转发上游 HTTP 状态码，不吞掉 4xx/5xx
    if (!response.ok) {
      const errorBody = await response.text();
      return new Response(errorBody, {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 转发 SSE 流
    const reader = response.body!.getReader();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal Server Error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

部署：

```ts
CloudDeployFunction({ functionName: "ai-chat", verifyJwt: true })
```

## 请求格式

```json
{
  "model": "qwen3.6-plus",
  "messages": [
    { "role": "system", "content": "你是一个专业助手" },
    { "role": "user", "content": "请总结下面这段文本" }
  ]
}
```

## 前端调用方式


### Fetch 流式调用

统一使用流式调用，避免长文本生成时 HTTP 超时。

```ts
import { getSupabaseUrl } from 'src/supabase/client.ts';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function requestLLMStream(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  options?: {
    model?: string;
    signal?: AbortSignal;
  }
) {
  const { model = 'qwen3.6-plus', signal } = options ?? {};

  const response = await fetch(
    `${getSupabaseUrl()}/functions/v1/ai-chat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, model, stream: true }),
      signal,
    }
  );
  if (!response.ok) throw new Error(`请求失败: ${response.status}`);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const payload = trimmed.slice(6);
        if (payload === '[DONE]') return fullText;

        try {
          const json = JSON.parse(payload);
          const content = json.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            onChunk(content);
          }
        } catch {
          // 忽略非法 JSON 行
        }
      }
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return fullText;
    throw err;
  }

  return fullText;
}
```

**调用示例：**

```ts
// 基础流式调用
let result = '';
await requestLLMStream(
  [{ role: 'user', content: '你好' }],
  (chunk) => { result += chunk; updateUI(result); }
);

// 带中止控制
const controller = new AbortController();
await requestLLMStream(
  messages,
  (chunk) => { result += chunk; updateUI(result); },
  { signal: controller.signal }
);
// 需要取消时
controller.abort();
```




## SSE 流式协议要点

响应 Content-Type 为 `text/event-stream`。每条数据以 `data: ` 前缀开头，以双换行 `\n\n` 结尾。`data` 内容是 JSON 对象，结构与非流式一致，但用 `choices[0].delta` 替代 `choices[0].message`，`delta.content` 为本次增量文本片段。流结束标志为 `data: [DONE]`。


### SSE 关键注意事项

**buffer 拼接是必须的。** 网络传输可能将一条完整的 `data:` 行切割到两个 chunk 中。必须用 buffer 做行级拼接，不能逐 chunk 直接按行解析，否则会丢失被截断的消息。

**错误处理分两层。** HTTP 层面的错误（如 401、500）通过 `response.ok` 判断，在流开始前就能捕获。流传输过程中的中断通过 `reader.read()` 抛出的异常或 `done` 状态处理。用户主动取消时 `AbortError` 应静默处理，不作为业务错误上报。

**不要用 EventSource。** Edge Function 需要 POST + 自定义 Authorization Header，而浏览器原生 `EventSource` 只支持 GET 请求，无法满足需求。必须用 `fetch` + `ReadableStream` 手动解析 SSE。

**中止流的正确方式：** 通过 `AbortController` 传入 `requestLLMStream` 的 `signal` 参数。`AbortController` 可以从请求发起端干净地终止连接，覆盖面最广，能同时取消 fetch 本身和流读取。



##集成优先级

默认按下面优先级集成：

1.优先通过 Edge Function 调用 Meoo AI，AK 存放在服务端环境变量中。
2. 如果项目已有统一请求封装（如 supabase client），优先复用它。
3.如果项目已有现成页面，只在该页面上嵌入 AI能力，不要新造一整套无关页面。
4. 只有 AI 功能点本身需要的代码才产出，不扩展无关系统。

不要默认做这些事：

-不要重建整个工程目录
- 不要默认创建独立聊天站点或完整 AI子系统
- 不要默认创建完整 `/server`项目模板
-不要默认补 Swagger、脚手架说明、额外管理接口
-不要默认加数据库、登录、权限、工作流，除非用户明确要求
- 不要因为一个 AI 功能点就新建与需求无关的全局状态、路由层或页面骨架

##优先产出的代码

通常只需要产出和这个 AI功能点直接相关的代码。按需选择，不要求每次都全做：

-一个 Edge Function文件（`/functions/ai-chat/index.ts`）
- 一个前端 AI 请求封装文件
- 一个前端 AI 功能组件
- 必要的状态处理，例如 loading、error、result

常见落地路径：

- `/functions/ai-chat/index.ts`（Edge Function）
- `src/services/meooAI.ts`（前端请求封装）
- `src/components/ai/...`（AI 功能组件）
-现有页面中的一个 AI 面板 / AI 按钮 / AI抽屉

如果现有工程已经有对应位置，就直接修改原文件或在原目录补最小文件，不要为了"结构完整"额外造目录。

##执行步骤

1. 确认用户需求属于纯文本 AI能力。
2.定位现有项目中最合适的落点——优先复用已有页面、组件、请求封装。
3. 检查 Cloud 功能是否已初始化（未初始化则停止）。
4.创建或复用 Edge Function（`ai-chat`），确保 AK从环境变量读取。
5. 部署 Edge Function：`CloudDeployFunction({ functionName: "ai-chat", verifyJwt: true })`。

6. 前端通过 fetch 流式调用 Edge Function。


7. 默认使用流式调用，仅极短文本场景可选非流式。
8.完成请求接入、结果处理、错误处理和 loading状态。
9.自查：没有因接 AI 引入无关的大规模工程改造。

## 提示词建议

虽然接口是 `chat/completions`，但不只能做聊天。通过 system / user消息明确任务目标：

- 总结：`请总结下面文本，输出 3条要点`
- 改写：`请把下面内容改写成更正式的公告语气`
- 抽取：`请从下面文本中提取姓名、电话、邮箱，输出 JSON`
- 分类：`请判断下面工单属于售前、售后还是财务`
- 翻译：`请把下面中文翻译成英文，保留术语`

除非用户要求通用聊天助手，否则提示词应围绕具体业务动作来写。

##典型场景

###场景一：智能客服

优先交付：

-一个 Edge Function（`ai-chat`）处理对话请求
- 一个可嵌入页面的聊天组件
-一个前端请求封装调用 Edge Function
-基础会话渲染、发送中状态和报错提示

###场景二：总结 / 改写 / 翻译 /抽取

优先交付：

-复用已有 Edge Function（`ai-chat`），通过不同 system prompt区分任务
- 页面上的触发入口（按钮 / 面板）
- 输入内容到 AI请求体的映射
- 结果展示区域
- 重试、空态和错误提示

###场景三：表单 /列表 AI 辅助

优先交付：

-在现有表单旁增加"AI 建议"按钮
- 调用 Edge Function获取建议结果
- 将结果回填到表单字段或展示在辅助面板中

## UI集成建议

把 AI能力当成"现有页面的一个功能块"去实现，而不是当成一个独立产品去重做。

优先采用下面这些嵌入方式：

-页面中的 AI 按钮
- 页面侧边抽屉
-表单旁边的 AI 辅助面板
- 列表页上的批量 AI处理入口
- 详情页里的 AI 分析区域
- 客服对话框 /智能助手浮层

如果用户没有要求复杂交互，默认做最小闭环：

1. 输入区
2. 触发按钮
3. 结果展示区
4. loading状态
5. error 状态

## 默认策略

- 默认模型 `qwen3.6-plus`，统一流式输出
- 默认通过 Edge Function 调用，AK 不暴露在前端
- 默认复用现有页面和接口层
- 默认只实现当前 AI 功能点，不扩展成完整聊天产品

## 强约束

-必须先确认 Cloud 已初始化
- AK必须存放在 Edge Function环境变量中，禁止硬编码在前端
- 只使用文本接口 `POST /meoo-ai/compatible-mode/v1/chat/completions`
- 默认模型 `qwen3.6-plus`，模型名必须严格按模型表填写（含版本号后缀和大小写）
- 只允许使用模型表中列出的模型（kimi-k2.5、qwen3.5-plus、qwen3.6-plus、deepseek-v3.2、glm-5、MiniMax-M2.5），禁止接入 GPT、Claude、Gemini或任何列表外模型
- Edge Function 必须处理 CORS 预检请求（OPTIONS）
- Edge Function必须 try-catch，catch 返回 `{ error: string }` + 500
- Edge Function 必须转发上游 HTTP状态码，不得吞掉 4xx/5xx
- 部署后生效——代码修改必须重新 `CloudDeployFunction`
- 部署 Edge Function时使用 `CloudDeployFunction`
-不因接入 AI而切换框架、路由方案、构建工具或目录结构
- 不为一个 AI功能点重建整站或扩展无关系统能力

##异常处理

遇到下面情况时，按固定策略处理：

- 如果 Cloud 功能尚未初始化，立即停止当前 AI集成实现，明确告知用户"必须先初始化 Cloud 功能，否则禁止使用该能力"。
- 如果需求已经变成图片、音频、视频、多模态能力，不继续沿用本技能，明确说明超出范围，引导使用对应的 vision-ai或 image-gen-ai 技能。
- 如果用户没有指定模型，默认使用 `qwen3.6-plus`。
- 如果用户要求接入 GPT、Claude、Gemini或其他列表外的模型，明确告知 Meoo 平台不提供这些模型服务，无法接入，建议从可用模型列表中选择替代。
- 如果 Edge Function 部署失败，检查环境变量 `MEOO_PROJECT_API_KEY` 是否已配置。
- 如果请求返回 401，检查 Edge Function中的 AK是否正确读取。

##完成标准

- 已确认 Cloud 功能初始化
- Edge Function已创建并部署，AK 从环境变量读取
- 前端通过调用 Edge Function
- 只改动与 AI 功能点直接相关的代码
- 接口路径、请求头、请求体符合 Meoo 文本服务要求
- 具备基本的 loading、error、result处理
-没有因集成 AI无故扩展出整套聊天系统或无关基础设施
