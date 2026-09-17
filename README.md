# SlopLint

[English](README.en.md) | **简体中文**

检测中文里的 AI 味。粘贴一段文字，标出哪些句子像 AI 写的、为什么，再给一个 0–100 的浓度分。只检测，不改写。

**在线版：** https://dw-studio.github.io/sloplint/

## 做什么

SlopLint 指出哪些句子有 AI 味，并说明为什么。要不要改、怎么改，是你自己的事。

两种形态，共用一份规则：

- **网页版**：纯前端，不接 LLM，不用 API key。词表和正则在浏览器里跑，能抓规则能描述的特征：词表命中、句式套路、标点密度。
- **Skill 版**：一个 `SKILL.md`，装进支持 Agent Skills 的 agent（Claude Code、Cursor、Hermes）。由 LLM 执行规则，所以还能抓网页版抓不到的语义层特征：拟人化比喻、段落开头没头没尾的评价。

两版都读 `rules/patterns.json`。

## 网页版

打开 https://dw-studio.github.io/sloplint/ 粘贴文字。全部在浏览器本地跑，不上传。

本地运行：

```bash
cd web
npm install
npm run dev
```

浏览器打开 http://localhost:5173。

## Skill 版

把 `skill/SKILL.md` 复制到 agent 的 skills 目录，或直接当 system prompt 用。然后对它说：

```
检测这段文字的 AI 味
```

改完 `rules/patterns.json` 后重新生成：

```bash
cd skill
node build_skill.mjs
```

## 原理

语言模型按「统计上最可能的下一词」往下写，所以它会滑向最通用的句式：不是…而是…、只用来引列表的冒号、随着…的发展这种开场。SlopLint 把这些模式存成规则，按「AI 比真人多用多少」加权，然后扫文本。

评分是 `加权命中 ÷（加权命中 + 6）`，映射到 0–100。它是浓度分，不是判决：分高说明文字在套句式，0 分说明没扫到。

网页版只跑能写成正则或密度的规则。需要读懂语义才能判的模式（拟人化比喻、段落开头没头没尾的评价）放在 skill 里，交给 LLM。

## 规则

网页版能抓这些：

| 规则 | 抓什么 |
|---|---|
| 引列表的冒号 | 主要包括：、主要分为： |
| 提示式冒号 | 核心是：、说白了： |
| 不是…而是… | 不是 A，而是 B |
| 说白了式开场 | 说白了、说穿了 |
| 一二三式小标题 | 一、二、三 |
| 破折号太多 | —— |
| 翻译腔 | 当…时、对于…来说、这意味着 |
| 顿号成串 | 、排成一串 |
| 通篇没数字 | 全文没有数字、日期、数量 |
| 万能开头 | 随着…的发展、众所周知 |
| 每段都综上 | 综上所述、总而言之 |
| 没有立场 | 各有优缺点、因人而异 |
| 凑数成语 | 与时俱进、开拓创新 |
| 空形容词 | 显著提升、大幅改善 |

Skill 版多三条需要 LLM 判断的：

| 规则 | 抓什么 |
|---|---|
| 段落开头没头没尾的评价 | 开头抛一句评价，却不说是评价什么 |
| 拟人化比喻 | 像一位不知疲倦的助手 |
| 连着几句一个模子 | 相邻几句结构一模一样 |

完整清单、权重、证据都在 `rules/patterns.json`。

## 项目结构

```
rules/     规则库
web/       网页版（Vite + 原生 JS）
skill/     skill 版与生成脚本
test/      测试
DEV.md     开发文档
```

## 测试

```bash
node test/test-scanner.mjs
```

## 数据来源

经过语料验证的规则来自 [lieflat-less-ai-tone](https://github.com/larashero3-dotcom/lieflat-less-ai-tone)，一项 283 万字的中文人机对照写作研究（MIT 许可）。标为「语感」的规则是 SlopLint 自己补充的，尚未验证。

## 许可

MIT
