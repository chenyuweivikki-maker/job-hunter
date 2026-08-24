/* Smoke test for the TailorCV pipeline (node only) */
const path = require('path');
const root = path.join(__dirname, '..');
const D = require(path.join(root, 'js/data.js'));
const KW = require(path.join(root, 'js/keywords.js'));
const Local = require(path.join(root, 'js/engine-local.js'));
const Preview = require(path.join(root, 'js/preview.js'));

let failed = false;
function assert(cond, msg) {
  if (cond) console.log('  ✓ ' + msg);
  else { failed = true; console.log('  ✗ FAIL: ' + msg); }
}

console.log('== 1. JD analysis ==');
const jd = D.sampleState().jd.raw;
const analyzed = KW.analyzeJD(jd);
assert(analyzed.terms.length > 5, 'extracted ' + analyzed.terms.length + ' keywords');
assert(analyzed.duties.length > 0, 'classified ' + analyzed.duties.length + ' duty sentences');
assert(analyzed.reqs.length > 0, 'classified ' + analyzed.reqs.length + ' req sentences');
console.log('  guess position:', analyzed.guess);
console.log('  top terms:', analyzed.terms.slice(0, 8).map(t => t.term + 'x' + t.count).join(', '));

console.log('== 2. local tailor ==');
const s = D.sampleState();
s.jd.analyzed = analyzed;
const model = Local.localTailor(s, { position: '高级产品经理', maxBullets: 4 });
assert(model.meta.coverageRate >= 30, 'coverage rate ' + model.meta.coverageRate + '%');
assert(model.work.length === 3, 'kept 3 work entries');
assert(model.work[0].bullets.length <= 4, 'work[0] bullet cap ' + model.work[0].bullets.length);
assert(model.work.some(w => w.bullets.some(b => b.hits.length > 0)), 'some bullets carry JD hits');
assert(model.skills.some(x => x.hot), 'some skills marked hot');
assert(model.summary.indexOf('经验') !== -1 || model.summary.length > 10, 'summary generated: ' + model.summary.slice(0, 40) + '…');
console.log('  summary:', model.summary);
console.log('  hot skills:', model.skills.filter(x => x.hot).map(x => x.name).join(', '));
console.log('  gaps:', model.gaps.map(g => g.term).join(', ') || '(none)');

console.log('== 2b. ledger + grammar ==');
assert(model.ledger && model.ledger.total > 0, 'ledger computed, total=' + model.ledger.total);
assert(model.ledger.pending.length === 1, 'pending count 1 (sample 主导商业化 pending), got ' + model.ledger.pending.length);
assert(model.ledger.strong.length >= 2, 'strong claims detected >= 2, got ' + model.ledger.strong.length);
assert(model.grammar && typeof model.grammar.rate === 'number', 'grammar rate computed: ' + (model.grammar && model.grammar.rate));
assert(['confirmed', 'pending'].indexOf(model.work[0].bullets[0].status) !== -1, 'bullet carries ledger status');
console.log('  ledger: confirmed=' + model.ledger.confirmed + ' pending=' + model.ledger.pending.length + ' noEvidence=' + model.ledger.noEvidence.length + ' strong=' + model.ledger.strong.length);
console.log('  grammar rate: ' + model.grammar.rate + '%');
model.grammar.issues.slice(0, 3).forEach(it => console.log('    ✎', it.text, '→', it.issues.join(' / ')));

console.log('== 2c. asu grammar preset ==');
const modelAsu = Local.localTailor(s, { position: '高级产品经理', maxBullets: 4, grammar: 'asu' });
assert(modelAsu.meta.grammarPreset === 'asu', 'asu preset recorded');
assert(typeof modelAsu.grammar.rate === 'number', 'asu grammar rate ' + modelAsu.grammar.rate + '%');

console.log('== 2d. rejected bullets skipped ==');
const s2 = D.sampleState();
s2.jd.analyzed = analyzed;
const rejText = s2.work[0].bullets[0].text;
s2.work[0].bullets[0].status = 'rejected';
const m2 = Local.localTailor(s2, { maxBullets: 4 });
assert(m2.meta.rejectedSkipped === 1, 'rejectedSkipped=1, got ' + m2.meta.rejectedSkipped);
assert(!m2.work[0].bullets.some(b => b.text === rejText), 'rejected bullet absent from resume');

console.log('== 3. resume rendering ==');
const htmlWide = Preview.renderResume(model, 'wide');
const htmlModern = Preview.renderResume(model, 'modern');
const htmlClassic = Preview.renderResume(model, 'classic');
const htmlDachang = Preview.renderResume(model, 'dachang');
assert(htmlWide.includes('<mark>'), 'wide render marks keywords');
assert(htmlWide.includes(model.header.name), 'wide render includes name');
assert(htmlModern.includes('r-rail'), 'modern render has rail');
assert(htmlClassic.includes('res-classic'), 'classic render has class');
assert(htmlDachang.includes('res-dachang'), 'dachang render has class');
assert(htmlDachang.includes('r-sec-en') && htmlDachang.includes('EXPERIENCE'), 'dachang has EN section labels');
assert(htmlDachang.includes('r-photo'), 'dachang has photo placeholder');
assert(htmlWide.includes('r-pending'), 'wide render flags pending bullet');
const txt = Preview.resumeToText(model);
assert(txt.split('\n').length > 15, 'text export ' + txt.split('\n').length + ' lines');
console.log('  wide html length:', htmlWide.length, '| dachang html length:', htmlDachang.length, '| text lines:', txt.split('\n').length);

console.log('== 4. markTerms edge cases ==');
const mt = Preview.markTerms('负责数据分析与用户增长，使用 SQL 分析转化率，转化率提升 20%', ['转化率', '数据分析', 'SQL', '用户增长']);
assert((mt.match(/<mark>/g) || []).length === 5, 'marks 5 terms (转化率 x2), got: ' + mt);

console.log('== 5. LLM payload build ==');
const LLM = require(path.join(root, 'js/engine-llm.js'));
const p = LLM.buildPayload(s);
assert(p.work.length === 3 && p.jd.length > 50, 'LLM payload built');

console.log('== 6. JD archive ==');
const st = D.state;
const firstId = st.jd.id;
const j2 = D.addJd('岗位B');
assert(st.jds.length === 2, 'addJd -> 2 JDs in archive');
assert(st.jd.id === j2.id, 'addJd activates the new JD');
D.switchJd(firstId);
assert(st.jd.id === firstId, 'switchJd back to first');
D.renameJd(firstId, '改名JD');
assert(D.jdLabel(st.jd) === '改名JD', 'rename + jdLabel works');
st.jd.generated = { coverage: { rate: 66 } };
D.switchJd(j2.id);
assert(st.generated === null, 'generated is isolated per JD (JD-B has none)');
D.switchJd(firstId);
assert(st.generated && st.generated.coverage.rate === 66, 'generated restored after switching back');
assert(D.removeJd(firstId) === true && st.jds.length === 1 && st.jd.id === j2.id, 'removeJd + fallback to remaining');
console.log('  archive ops: add/switch/rename/isolate/remove OK');

console.log('== 7. legacy migration ==');
const legacy = {
  profile: {}, summary: '', education: [], work: [], projects: [], skills: [],
  jd: { raw: 'legacy jd text' },
  settings: { llm: {}, mode: 'local', style: 'wide', detail: 'concise', maxBullets: 4 },
  generated: { coverage: { rate: 50 } }
};
const migrated = D.normalizeState(legacy);
assert(migrated.jds.length === 1 && migrated.jd.raw === 'legacy jd text', 'legacy jd migrated into jds[0]');
assert(migrated.generated && migrated.generated.coverage.rate === 50, 'legacy generated migrated to active jd');
assert(migrated.settings.grammar === 'standard', 'grammar default backfilled');
const empty = D.emptyState();
assert(Array.isArray(empty.jds) && empty.jd === null, 'emptyState has jds array + null jd');
const fresh = D.normalizeState(null);
assert(fresh.jds.length === 1 && fresh.jd, 'normalizeState(null) auto-creates one JD');
console.log('  migration: OK');

console.log('== 8. ATS score + gap suggestions + ownership ==');
assert(model.ats && model.ats.score >= 0 && model.ats.score <= 100, 'ats score computed: ' + (model.ats && model.ats.score));
assert(model.ats.keywords >= 0 && model.ats.duties >= 0, 'ats breakdown present');
assert(model.gapSuggestions && model.gapSuggestions.length === model.gaps.length, 'gap suggestions 1:1 with gaps');
assert(model.gapSuggestions[0].suggestion && model.gapSuggestions[0].suggestion.length > 4, 'suggestion text present: ' + (model.gapSuggestions[0] && model.gapSuggestions[0].suggestion));
assert(model.ownership && typeof model.ownership.count === 'number', 'ownership check present: count=' + (model.ownership && model.ownership.count));
assert(KW.synMatch('我做了 AB 实验和数据分析', 'A/B测试'), 'synonym match: A/B测试 ~ AB实验');
assert(KW.synMatch('负责提升留存率', '用户留存'), 'synonym match: 留存率 ~ 用户留存');
console.log('  ats=' + model.ats.score + ' (kw:' + model.ats.keywords + ', duties:' + model.ats.duties + ') verdict=' + model.ats.verdict);
console.log('  first gap suggestion:', model.gapSuggestions[0].term, '→', model.gapSuggestions[0].suggestion);

console.log('== 9. new renders + exports + diff ==');
const htmlKendall = Preview.renderResume(model, 'kendall');
const htmlMacchiato = Preview.renderResume(model, 'macchiato');
assert(htmlKendall.includes('res-kendall') && htmlKendall.includes('k-avatar'), 'kendall render works');
assert(htmlMacchiato.includes('res-macchiato') && htmlMacchiato.includes('m-accent'), 'macchiato render works');
const jr = Preview.resumeToJSON(model);
assert(jr.basics && jr.basics.name === model.header.name, 'JSON Resume basics');
assert(Array.isArray(jr.work) && jr.work.length === model.work.length, 'JSON Resume work array');
assert(jr.work[0].highlights && jr.work[0].highlights.length > 0, 'JSON Resume highlights');
const doc = Preview.resumeToDocHTML(model, 'wide');
assert(doc.indexOf('<!doctype html>') === 0 && doc.includes(model.header.name), 'Word doc HTML wrapper');
const oldModel = Local.localTailor(s, { position: '高级产品经理', maxBullets: 2 });
const diff = Preview.diffModels(oldModel, model);
assert(typeof diff.summaryChanged === 'boolean' && Array.isArray(diff.work), 'diff structure');
console.log('  kendall len:', htmlKendall.length, '| macchiato len:', htmlMacchiato.length, '| diff work entries:', diff.work.length);

console.log(failed ? '\nSMOKE TEST: FAILED' : '\nSMOKE TEST: ALL PASSED');
process.exit(failed ? 1 : 0);
