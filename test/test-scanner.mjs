// test-scanner.mjs — 验证重构后的扫描引擎：正则编译、AI 文本高分、真人文本低分
import { readFileSync } from 'fs';
import { scan } from '../web/src/scanner.js';

const patterns = JSON.parse(readFileSync(new URL('../rules/patterns.json', import.meta.url), 'utf8'));

// 1. 正则编译检查（含 line-start / density）
console.log('=== 1. 正则编译检查 ===');
let bad = 0;
for (const p of patterns.patterns) {
  if (!p.regex) continue;
  try {
    const flags = p.type === 'line-start' ? 'gm' : 'g';
    new RegExp(p.regex, flags);
  } catch (e) {
    bad++;
    console.log(`✗ [${p.id}] ${p.name}: ${e.message}`);
  }
}
console.log(bad === 0 ? `✓ 全部 ${patterns.patterns.length} 个正则可编译` : `✗ ${bad} 个正则错误`);

// 2. AI 味文本（含对举、冒号空转、翻译腔、破折号过密等新特征）
const aiText = '在当今这个时代，AI 不是一种工具，而是一种思维方式。说白了，它主要有以下几个方面的优势：一是显著提升工作效率——这是最明显的，二是大幅降低运营成本——这是最实际的。当人们使用 AI 时，往往会发现它确实很强大。这意味着，我们需要重新思考工作的意义。然而，很多人仍然保持观望。综上所述，AI 的应用将产生深远影响。';

// 3. 真人文本
const humanText = '上周我把一件攒了半年的破事，用 AI 半小时干完了。之前一直拖着，是因为想到要处理它就觉得烦。结果真做起来，也就那样。AI 能提效，这谁都知道，但成本能降下来是另一码事。我算了下，光这一件事就省了两个下午。';

function report(label, r) {
  console.log(`\n=== ${label} ===`);
  console.log(`浓度: ${r.concentration}/100  等级: ${r.level}  加权分: ${r.weightedScore}`);
  for (const h of r.hits) {
    const loc = h.sentenceIndex >= 0 ? `句${h.sentenceIndex + 1}` : '全文';
    console.log(`  ${loc} [${h.patternName}] 「${h.matchedText}」`);
  }
}

report('2. AI 味文本', scan(aiText, patterns));
report('3. 真人文本', scan(humanText, patterns));

console.log('\n=== 验收 ===');
const ai = scan(aiText, patterns);
const human = scan(humanText, patterns);
console.log(`AI 味文本 > 60? ${ai.concentration > 60 ? '✓ 通过' : '✗ 未通过 (' + ai.concentration + ')'}`);
console.log(`真人文本 < 30? ${human.concentration < 30 ? '✓ 通过' : '✗ 未通过 (' + human.concentration + ')'}`);
