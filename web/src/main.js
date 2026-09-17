// main.js — 网页入口：绑定事件，调用扫描引擎，渲染结果
import { scan } from './scanner.js';
import patterns from '@rules/patterns.json';

const LEVEL = {
  low: { label: '低', color: '#34c759' },
  medium: { label: '中', color: '#ff9f0a' },
  high: { label: '高', color: '#ff453a' },
};

const input = document.getElementById('input');
const btn = document.getElementById('btn');
const result = document.getElementById('result');

btn.addEventListener('click', run);
input.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run();
});

function run() {
  const text = input.value;
  if (!text.trim()) return;
  const r = scan(text, patterns);
  render(r, text);
}

function render(r, text) {
  const level = LEVEL[r.level];

  // 1. 浓度 + 色阶
  document.getElementById('score').textContent = r.concentration;
  document.getElementById('score').style.color = level.color;
  const badge = document.getElementById('badge');
  badge.textContent = `AI 味 ${level.label}`;
  badge.style.background = level.color;
  const barFill = document.getElementById('bar-fill');
  barFill.style.width = r.concentration + '%';
  barFill.style.background = level.color;

  // 2. 原文高亮（按句渲染，句内 replace 命中词）
  const hitsBySentence = {};
  for (const h of r.hits) {
    if (h.sentenceIndex < 0) continue; // 全文级命中不高亮
    (hitsBySentence[h.sentenceIndex] ||= []).push(h);
  }
  const parts = r.sentences.map((s, i) => {
    let html = escapeHtml(s.text);
    for (const h of hitsBySentence[i] || []) {
      const match = escapeHtml(h.matchedText);
      html = html.replace(match, `<mark title="${escapeHtml(h.patternName)}">${match}</mark>`);
    }
    return html;
  });
  document.getElementById('highlighted').innerHTML = parts.join('<br>');

  // 3. 命中清单
  const listEl = document.getElementById('hit-list');
  listEl.innerHTML = '';
  if (r.hits.length === 0) {
    listEl.innerHTML = '<li class="hit-item" style="color:#86868b">没发现明显的 AI 味，你的文字很干净。</li>';
  } else {
    for (const h of r.hits) {
      const li = document.createElement('li');
      li.className = 'hit-item';
      const sentenceLabel = h.sentenceIndex >= 0 ? `第 ${h.sentenceIndex + 1} 句` : '全文';
      li.innerHTML = `
        <div class="hit-head">
          <span class="hit-tag" style="background:${weightColor(h.weight)}">${h.patternName}</span>
          <span class="hit-sentence">${sentenceLabel}</span>
        </div>
        <div class="hit-match">「${escapeHtml(h.matchedText)}」</div>
        <div class="hit-comment">${escapeHtml(h.comment)}</div>
      `;
      listEl.appendChild(li);
    }
  }

  result.style.display = 'block';
  result.scrollIntoView({ behavior: 'smooth' });
}

function weightColor(weight) {
  return weight >= 3 ? '#ff453a' : weight === 2 ? '#ff9f0a' : '#34c759';
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
