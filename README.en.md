# SlopLint

**English** | [简体中文](README.md)

Flags AI-sounding Chinese writing. Paste text and it highlights the lines that read machine-written, with a 0–100 slop score. It detects; it does not rewrite.

**Live demo:** https://dw-studio.github.io/sloplint/

## What it does

SlopLint points at the sentences that sound like AI and says why. Fixing them is your call.

Two forms, one rule set:

- **Web app** — pure frontend. No LLM, no API key. Word lists and regex rules run in the browser, so it catches what a rule can describe: word-list hits, sentence formulas, punctuation density.
- **Skill** — a `SKILL.md` for agents that support Agent Skills (Claude Code, Cursor, Hermes). The agent runs the rules with an LLM, which lets it also catch semantic tells the browser cannot: an anthropomorphic metaphor, or a paragraph that opens with an evaluation naming nothing.

Both read `rules/patterns.json`.

## Web app

Open https://dw-studio.github.io/sloplint/ and paste text. Everything runs in the browser; nothing is uploaded.

Run locally:

```bash
cd web
npm install
npm run dev
```

Then open http://localhost:5173.

## Skill

Copy `skill/SKILL.md` into your agent's skills directory, or load it as a system prompt. Then ask:

```
检测这段文字的 AI 味
```

After editing `rules/patterns.json`, regenerate the skill:

```bash
cd skill
node build_skill.mjs
```

## How it works

A language model writes the most statistically likely next word, so it drifts toward the formulas that fit the widest range of readers: the "not X but Y" contrast, the colon that only introduces a list, the "as technology develops" opener. SlopLint keeps a list of these patterns, each weighted by how much more often models use it than people, and scans text for them.

The score is `weighted hits / (weighted hits + 6)`, scaled to 0–100. It is a concentration score: high means the writing leans on formulaic phrasing, zero means none was found.

The web app runs the patterns that can be written as regex or density rules. Patterns that need reading for meaning are listed in the skill, where an LLM can apply them.

## The rules

The browser can flag these patterns:

| Rule | Flags |
|---|---|
| List-introducing colon | 主要包括：、主要分为： |
| Announcing colon | 核心是：、说白了： |
| "Not X but Y" contrast | 不是…而是… |
| "Frankly" opener | 说白了、说穿了 |
| Numbered subheadings | 一、二、三 |
| Em-dash overuse | —— |
| Translationese | 当…时、对于…来说、这意味着 |
| Punctuation pile-up | 、顿号成串 |
| No numbers anywhere | 全文没有数字 |
| Template opener | 随着…的发展、众所周知 |
| Recurring "in summary" | 综上所述、总而言之 |
| No stance | 各有优缺点、因人而异 |
| Filler idioms | 与时俱进、开拓创新 |
| Empty adjectives | 显著提升、大幅改善 |

The skill adds three patterns that need an LLM:

| Rule | Flags |
|---|---|
| Floating evaluation | a paragraph that opens with an evaluation naming nothing |
| Anthropomorphic metaphor | 像一位不知疲倦的助手 |
| Same-mold sentences | adjacent sentences cast in the same shape |

The full list, weights, and evidence live in `rules/patterns.json`.

## Project layout

```
rules/     the rule set
web/       web app (Vite + plain JS)
skill/     the skill and its generator
test/      tests
DEV.md     development notes
```

## Test

```bash
node test/test-scanner.mjs
```

## Sources

The corpus-verified patterns come from [lieflat-less-ai-tone](https://github.com/larashero3-dotcom/lieflat-less-ai-tone), a study of 2.83 million characters of paired human and model-written Chinese, MIT-licensed. Patterns marked heuristic are SlopLint's own additions and are not yet verified.

## License

MIT
