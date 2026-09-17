// scanner.js — SlopLint 扫描引擎（纯函数，无 import 依赖，浏览器与 node 通用）
//
// 输入：text（待检测文字）、patterns（规则库对象，来自 patterns.json）
// 输出：{ concentration, weightedScore, sentenceCount, sentences, hits, level }
//
// 支持四种特征类型（pattern.type）：
//   "regex"          词表 + 正则单次命中（默认）
//   "line-start"     正则匹配行首（多行模式，如序数词小标题）
//   "density"        统计密度 > threshold 命中（如破折号、顿号过密）
//   "density-below"  统计密度 < threshold 命中（如缺数据支撑）

const SENTENCE_RE = /[^。！？；\n]+/g;

function splitSentences(text) {
  const sentences = [];
  for (const m of text.matchAll(SENTENCE_RE)) {
    const t = m[0].trim();
    if (t.length > 0) {
      sentences.push({ text: t, start: m.index, end: m.index + m[0].length });
    }
  }
  return sentences;
}

function findSentenceIndex(sentences, charIndex) {
  for (let i = 0; i < sentences.length; i++) {
    if (charIndex >= sentences[i].start && charIndex < sentences[i].end) return i;
  }
  for (let i = 0; i < sentences.length; i++) {
    if (charIndex >= sentences[i].end && (i === sentences.length - 1 || charIndex < sentences[i + 1].start)) return i;
  }
  return sentences.length - 1;
}

export function scan(text, patterns) {
  const sentences = splitSentences(text);
  const hits = [];
  let weightedScore = 0;
  const perK = text.length / 1000; // 千字数，用于密度计算

  for (const pattern of patterns.patterns || []) {
    const type = pattern.type || 'regex';

    if (type === 'regex') {
      scanRegex(pattern, text, sentences, hits, (w) => (weightedScore += w));
    } else if (type === 'line-start') {
      scanLineStart(pattern, text, sentences, hits, (w) => (weightedScore += w));
    } else if (type === 'density' || type === 'density-below') {
      const count = countMatches(pattern.regex, text);
      const density = perK > 0 ? count / perK : 0;
      const triggered = type === 'density' ? (count >= 2 && density > pattern.threshold) : density < pattern.threshold;
      if (triggered) {
        hits.push({
          sentenceIndex: -1,
          patternId: pattern.id,
          patternName: pattern.name,
          weight: pattern.weight,
          matchedText: `密度 ${density.toFixed(1)}/千字（阈值 ${pattern.threshold}）`,
          comment: pattern.comment,
        });
        weightedScore += pattern.weight;
      }
    }
  }

  const calibration = patterns.calibration || 6.0;
  const concentration = Math.round((100 * weightedScore) / (weightedScore + calibration));
  const level = concentration < 30 ? 'low' : concentration < 60 ? 'medium' : 'high';

  hits.sort((a, b) => {
    if (a.sentenceIndex === b.sentenceIndex) return (a.matchedText || '').localeCompare(b.matchedText || '');
    return a.sentenceIndex - b.sentenceIndex;
  });

  return { concentration, weightedScore, sentenceCount: sentences.length, sentences, hits, level };
}

function scanRegex(pattern, text, sentences, hits, addScore) {
  const regexCovered = [];

  if (pattern.regex) {
    let regex;
    try {
      regex = new RegExp(pattern.regex, 'g');
    } catch (e) {
      console.error(`[SlopLint] 正则错误 [${pattern.id}]: ${e.message}`);
      return;
    }
    let m;
    while ((m = regex.exec(text)) !== null) {
      const matchedText = m[0];
      if (matchedText.trim().length === 0) continue;
      regexCovered.push([m.index, m.index + matchedText.length]);
      hits.push(makeHit(pattern, matchedText, m.index, sentences));
      addScore(pattern.weight);
      if (m.index === regex.lastIndex) regex.lastIndex++;
    }
  }

  for (const kw of pattern.keywords || []) {
    if (!kw) continue;
    let idx = text.indexOf(kw);
    while (idx !== -1) {
      const kwEnd = idx + kw.length;
      const covered = regexCovered.some(([s, e]) => idx >= s && kwEnd <= e);
      if (!covered) {
        hits.push(makeHit(pattern, kw, idx, sentences));
        addScore(pattern.weight);
      }
      idx = text.indexOf(kw, idx + 1);
    }
  }
}

function scanLineStart(pattern, text, sentences, hits, addScore) {
  if (!pattern.regex) return;
  let regex;
  try {
    regex = new RegExp(pattern.regex, 'gm');
  } catch (e) {
    console.error(`[SlopLint] 正则错误 [${pattern.id}]: ${e.message}`);
    return;
  }
  let m;
  while ((m = regex.exec(text)) !== null) {
    const matchedText = m[0];
    if (matchedText.trim().length === 0) continue;
    hits.push(makeHit(pattern, matchedText, m.index, sentences));
    addScore(pattern.weight);
    if (m.index === regex.lastIndex) regex.lastIndex++;
  }
}

function countMatches(regexStr, text) {
  if (!regexStr) return 0;
  let regex;
  try {
    regex = new RegExp(regexStr, 'g');
  } catch (e) {
    return 0;
  }
  let count = 0;
  let m;
  while ((m = regex.exec(text)) !== null) {
    count++;
    if (m.index === regex.lastIndex) regex.lastIndex++;
  }
  return count;
}

function makeHit(pattern, matchedText, index, sentences) {
  return {
    sentenceIndex: findSentenceIndex(sentences, index),
    start: index,
    end: index + matchedText.length,
    patternId: pattern.id,
    patternName: pattern.name,
    weight: pattern.weight,
    matchedText,
    comment: pattern.comment,
  };
}
