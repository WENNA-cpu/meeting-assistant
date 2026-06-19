$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
function Export-Mermaid($name, $content) {
    $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($content.Trim()))
    $url = "https://mermaid.ink/img/$b64"
    $out = Join-Path $dir "$name.png"
    Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
    Write-Host "OK $name"
}

Export-Mermaid "01-reporter-journey" @'
flowchart LR
    subgraph S1[会前准备]
        S1A[上传录音] --> S1B[关联会议信息] --> S1C[会议导入]
    end
    subgraph S2[会议进行]
        S2A[实时转写] --> S2B[标记重点] --> S2C[智能纪要转写流]
    end
    subgraph S3[会后处理]
        S3A[审阅AI纪要] --> S3B[编辑确认] --> S3C[智能纪要结构化]
    end
    subgraph S4[任务分发]
        S4A[调整优先级] --> S4B[指定责任人] --> S4C[同步飞书钉钉] --> S4D[任务优先级看板]
    end
    subgraph S5[向上汇报]
        S5A[结论转话术] --> S5B[导出文档] --> S5C[汇报优化]
    end
    S1 ==> S2 ==> S3 ==> S4 ==> S5
'@

Export-Mermaid "02-manager-journey" @'
flowchart LR
    subgraph M1[订阅关注]
        M1A[关注议题类型] --> M1B[决策风险资源] --> M1C[会议列表通知]
    end
    subgraph M2[快速查阅]
        M2A[阅读结构化纪要] --> M2B[跳过原始转写] --> M2C[智能纪要]
    end
    subgraph M3[确认决策]
        M3A[审阅决策点] --> M3B[批注驳回确认] --> M3C[纪要确认流]
    end
    subgraph M4[追踪任务]
        M4A[四象限分布] --> M4B[逾期完成率] --> M4C[任务中心]
    end
    subgraph M5[审阅汇报]
        M5A[阅读汇报稿] --> M5B[核对重点] --> M5C[汇报优化导出]
    end
    M1 ==> M2 ==> M3 ==> M4 ==> M5
'@

Export-Mermaid "03-architecture-layers" @'
flowchart TB
    subgraph APP[应用层]
        direction LR
        A1[会议导入] --- A2[智能纪要] --- A3[任务优先级] --- A4[汇报优化] --- A5[任务中心]
    end
    subgraph RULE[规则引擎层]
        direction LR
        R1[结构化校验] --- R2[优先级计算] --- R3[汇报格式约束] --- R4[同步前置校验]
    end
    subgraph LLM[大模型语义理解层]
        direction LR
        L1[议题边界识别] --- L2[意图分类抽取] --- L3[话术风格改写]
    end
    subgraph ASR[语音转写层]
        direction LR
        S1[实时流式转写] --- S2[离线文件转写] --- S3[说话人分离]
    end
    subgraph EXT[外部服务与数据存储]
        direction LR
        E1[ASR API] --- E2[LLM API] --- E3[Supabase] --- E4[飞书钉钉API]
    end
    ASR --> LLM --> RULE --> APP
    ASR -.-> EXT
    LLM -.-> EXT
    APP -.-> EXT
'@

Export-Mermaid "04-data-flow" @'
flowchart LR
    A[音频输入] --> B[ASR转写] --> C[带时间戳文本] --> D[LLM结构化] --> E[规则校验] --> F[应用展示]
    E -->|不通过| G[标记待确认] --> F
    E -->|通过| H[任务抽取]
    G --> I[人工编辑确认] --> H
    H --> J[四象限分级] --> K[协作同步]
'@

Export-Mermaid "05-mechanism-structural" @'
flowchart TD
    A[LLM输出: 搜索功能比较重要] --> B[规则检测: 未命中决策结论词]
    B --> C[处理结果: type=issue 待确认]
    C --> D[用户界面: 待确认标签提示编辑]
'@

Export-Mermaid "06-mechanism-four-elements" @'
flowchart TD
    A[LLM输出: 李四来做需求文档] --> B[规则检测四要素]
    B --> B1[责任人: 李四]
    B --> B2[动作: 做]
    B --> B3[时间: 缺失]
    B1 --> C[confirmed=false 截止日期必填]
    B2 --> C
    B3 --> C
    C --> D[用户补全: 预计下周完成] --> E[规则通过 允许同步]
'@

Export-Mermaid "07-mechanism-confidence" @'
flowchart TD
    A[LLM建议: Q1 置信度0.72] --> B[规则检测: 置信度低于阈值]
    B --> C[标记AI建议请确认]
    C --> D[用户拖拽或确认]
    D --> E[记录人工修正反馈模型]
'@

Export-Mermaid "08-mechanism-sync" @'
flowchart TD
    A[点击同步至飞书] --> B[遍历任务列表校验]
    B --> B1[任务3 责任人空 拦截]
    B --> B2[任务5 截止日期空 拦截]
    B --> B3[其余任务通过]
    B1 --> C[弹窗提示补全 不调用API]
    B2 --> C
    B3 --> C
'@

Export-Mermaid "09-core-interaction-flow" @'
flowchart TD
    A[会议录音] --> B[语音转写层]
    B --> F[实时转写文本]
    F --> G[大模型语义理解]
    G --> H[结构化抽取]
    H --> I[规则引擎校验]
    I -->|通过| K[自动标记已确认]
    I -->|不通过| L[标记待确认]
    K --> M[智能纪要展示]
    L --> M
    M --> P[人工确认]
    P --> S[任务自动拆解]
    S --> U[四象限优先级初判]
    U --> V[AI任务看板]
    V --> Y[同步前置校验]
    Y -->|通过| AC[飞书钉钉同步]
    Y -->|不通过| Z[提示补全字段]
    AC --> AG[任务中心追踪]
'@

Write-Host "All diagrams exported."
