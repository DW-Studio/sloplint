// build_skill.mjs — 从 rules/patterns.json 生成 skill/SKILL.md（保持两版规则同步）
import { readFileSync, writeFileSync } from 'fs';

const patterns = JSON.parse(readFileSync(new URL('../rules/patterns.json', import.meta.url), 'utf8'));

const corpus = patterns.patterns.filter((p) => p.evidence === 'corpus');
const heuristic = patterns.patterns.filter((p) => p.evidence === 'heuristic');
const corpusForward = corpus.filter((p) => p.type !== 'density-below');
const corpusReverse = corpus.filter((p) => p.type === 'density-below');
const llm = patterns.llm_patterns || [];

const parseR = (r) => parseFloat(String(r).split('-')[0]);
corpusForward.sort((a, b) => parseR(b.R) - parseR(a.R));
llm.sort((a, b) => parseR(b.R) - parseR(a.R));

function corpusRow(p) {
  const trigger =
    p.type === 'density' || p.type === 'density-below'
      ? '（全文密度）'
      : p.keywords && p.keywords.length
        ? p.keywords.join('、')
        : '（正则句式）';
  return `| ${p.name} | ${p.R} | ${trigger} | ${p.comment} |`;
}

function heuristicRow(p) {
  const trigger = p.keywords && p.keywords.length ? p.keywords.join('、') : '（正则句式）';
  return `| ${p.name} | ${trigger} | ${p.comment} |`;
}

const skill = `---
name: sloplint
description: 检测中文写作里的"AI 味"。当用户要求检测 AI 味、判断文字是否像 AI 写的、审查 AI 写作痕迹、去 AI 味时使用。
---

# SlopLint · 中文 AI 味检测

检测中文文字里的 AI 味，指出"哪几句、为什么像 AI 写的"。

**只检测和点评，不替人改写**（除非用户明确要求改写）。

核心判断：LLM 写的是"统计上最可能的下一个词"，所以 AI 味是一堆可枚举的固定模式。找出这些模式，就能判断一段文字像不像 AI 写的。

规则库有两类来源，可靠性不同，优先看重数据验证的特征。

## 数据验证 · 显著特征

以下特征经过 283 万字对照语料检验（R = AI 频率 ÷ 人类频率，R≥2 为显著，数据来自 lieflat-less-ai-tone 研究）。

| 特征 | R | 触发词 / 句式 | 说明 |
|---|---|---|---|
${corpusForward.map(corpusRow).join('\n')}

## 数据验证 · 反向规则

以下特征方向相反：不是"AI 用得多"，而是"AI 用得少"暴露了它。

| 特征 | R | 触发词 / 句式 | 说明 |
|---|---|---|---|
${corpusReverse.map(corpusRow).join('\n')}

## 语义层特征（仅 LLM 能判断，正则无法实现）

| 特征 | R | 说明 |
|---|---|---|
${llm.map((p) => `| ${p.name} | ${p.R} | ${p.comment} |`).join('\n')}

## 语感特征（未经语料检验，仅作弱信号）

以下来自写作社区共识，未被语料对照验证，判为 AI 味时要谨慎，别误伤正常表达。

| 特征 | 触发词 | 点评 |
|---|---|---|
${heuristic.map(heuristicRow).join('\n')}

## 评分

- 权重分三档：数据验证显著 = 3，数据验证较弱 / 反向 = 2，语感待验证 = 1
- 浓度 = 100 × 加权命中分 /（加权命中分 + 6）
- 0–30 低 / 30–60 中 / 60–100 高

## 工作流

1. 逐句读用户给的文字
2. 对照上面的规则，找出所有 AI 味命中（标出：第几句、哪个模式、触发词）
3. 算浓度评分
4. 输出评分 + 逐句命中清单 + 每个命中的点评

## 输出格式

\`\`\`
浓度：XX/100（高/中/低）

第 N 句 [模式名]：「触发词」—— 点评
第 M 句 [模式名]：「触发词」—— 点评
...

整体判断：一句话总结哪里最像 AI，最该先改哪里。
\`\`\`

## 注意

- 宁可漏，不可错。误伤真人写作（把人的表达当成 AI 味）比漏报更糟。
- 语感特征（弱信号）单看不足以判 AI，要和其他特征一起看。
- 破折号是模型差异最大的特征（DeepSeek 多、GPT 少），单独出现不要判死。
- 公文、法律、学术论文里的"总分总"和规范用语不是 AI 味，这类文本要保守。
- 如果文字很干净，明确说"没检测到明显 AI 味"。
`;

writeFileSync(new URL('../skill/SKILL.md', import.meta.url), skill, 'utf8');
console.log('✅ skill/SKILL.md 已从 patterns.json 重新生成');
