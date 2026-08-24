/* ============ TailorCV local tailoring engine (no LLM required) ============ */
(function (global) {
  'use strict';

  function workYears(work) {
    if (!work || !work.length) return 0;
    var start = null, endMax = null;
    work.forEach(function (w) {
      if (w.start && (!start || w.start < start)) start = w.start;
      if (w.end && w.end !== '至今' && (!endMax || w.end > endMax)) endMax = w.end;
    });
    var ref = endMax || TailorCV.today();
    var s = TailorCV.num(start ? start.slice(0, 4) : 0);
    var e = TailorCV.num(ref.slice(0, 4));
    return Math.max(0, e - s);
  }

  function topMatchedCategories(coverage) {
    var byCat = {};
    coverage.matched.forEach(function (t) { byCat[t.cat] = (byCat[t.cat] || 0) + t.count; });
    return Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; }).slice(0, 3);
  }

  function pickTerms(coverage, n) {
    return coverage.matched.slice(0, n).map(function (t) { return t.term; });
  }

  function buildSummary(state, coverage) {
    var out = [];
    var userSum = (state.summary || '').trim();
    var generated = '';
    var years = workYears(state.work);

    var parts = [];
    if (years > 0) parts.push(years + ' 年工作经验');
    var cats = topMatchedCategories(coverage);
    if (cats.length) parts.push('在' + cats.join('、') + '方向有扎实的实战积累');
    var terms = pickTerms(coverage, 3);
    if (terms.length) parts.push('熟悉' + terms.join('、'));
    if (parts.length) generated = parts.join('，') + '，结果导向，具备良好的跨部门协作与项目管理能力。';

    if (userSum) out.push(userSum);
    if (generated) {
      // avoid pure duplication: only append if user summary doesn't already cover the same terms
      var overlap = terms.filter(function (t) { return userSum.indexOf(t) !== -1; }).length;
      if (overlap < terms.length || !userSum) out.push(generated);
    }
    if (!out.length) out.push('暂无自我评价，可在「资料库」中补充，帮助生成更完整的简介。');
    return out.join(' ');
  }

  function orderSkills(skills, coverage) {
    var matchedSet = {};
    coverage.matched.forEach(function (t) { matchedSet[t.term] = true; });
    var seen = {}, ordered = [];
    var push = function (s) {
      s = (s || '').trim();
      if (!s || seen[s]) return;
      seen[s] = true;
      ordered.push({ name: s, hot: !!matchedSet[s] });
    };
    (skills || []).forEach(push);
    // append matched terms that aren't explicit skills but appear in work bullets
    coverage.matched.forEach(function (t) {
      if (t.cat === '英文') return;                 // raw english words, not skill names
      if (!seen[t.term] && t.term.length <= 12 && t.term.length >= 2) push(t.term);
    });
    // move hot to front, keep relative order
    var hot = ordered.filter(function (o) { return o.hot; });
    var rest = ordered.filter(function (o) { return !o.hot; });
    return hot.concat(rest).slice(0, 18);
  }

  function tailorWork(state, analyzed, coverage, maxBullets, grammarPreset) {
    return (state.work || []).map(function (w) {
      // 账本规则：不采用（rejected）的主张不进简历
      var usable = (w.bullets || []).filter(function (b) { return b.status !== 'rejected'; });
      var scored = usable.map(function (b) {
        var r = TailorKW.scoreBullet(b.text, analyzed.terms);
        var g = TailorKW.checkBulletGrammar(b.text, grammarPreset);
        return {
          id: b.id, text: b.text, tag: b.tag || 'duty', hits: r.hits, score: r.score,
          evidence: b.evidence || '', boundary: b.boundary || '', status: b.status || 'confirmed',
          grammar: g
        };
      });
      var bullets = scored.slice().sort(function (a, b) { return b.score - a.score; });
      if (maxBullets > 0) bullets = bullets.slice(0, maxBullets);
      bullets = bullets.sort(function (a, b) { return (a.hits.length > 0 ? 0 : 1) - (b.hits.length > 0 ? 0 : 1); });
      return {
        company: w.company || '未填写公司', title: w.title || '', industry: w.industry || '',
        start: w.start || '', end: w.end || '', endText: (!w.end || w.end === '至今') ? '至今' : w.end,
        bullets: bullets, noBullets: !scored.length
      };
    });
  }

  function tailorProjects(state, maxBullets) {
    return (state.projects || []).map(function (p) {
      var bullets = (p.bullets || []).slice();
      if (maxBullets > 0) bullets = bullets.slice(0, maxBullets);
      return { name: p.name || '未命名项目', role: p.role || '', start: p.start || '', end: p.end || '', desc: p.desc || '', bullets: bullets };
    });
  }

  /* ---- ledger & grammar stats over the final resume model ---- */
  function computeLedger(model) {
    var all = [];
    model.work.forEach(function (w) { (w.bullets || []).forEach(function (b) { all.push(b); }); });
    var pending = all.filter(function (b) { return b.status === 'pending'; });
    var noEvidence = all.filter(function (b) { return b.status !== 'rejected' && !(b.evidence || '').trim(); });
    var strong = all.filter(function (b) { return TailorKW.STRONG_CLAIM.test(b.text); });
    return {
      total: all.length,
      confirmed: all.filter(function (b) { return b.status === 'confirmed'; }).length,
      pending: pending,
      noEvidence: noEvidence,
      strong: strong,
      rejectedSkipped: model.meta.rejectedSkipped || 0
    };
  }

  function computeGrammar(model) {
    var bullets = [];
    model.work.forEach(function (w) { (w.bullets || []).forEach(function (b) { bullets.push(b); }); });
    if (!bullets.length) return { rate: 100, issues: [] };
    var okCount = bullets.filter(function (b) { return b.grammar && b.grammar.ok; }).length;
    var issues = bullets.filter(function (b) { return b.grammar && !b.grammar.ok; })
      .map(function (b) { return { text: b.text.slice(0, 40) + (b.text.length > 40 ? '…' : ''), issues: b.grammar.issues }; });
    return { rate: Math.round(okCount / bullets.length * 100), issues: issues };
  }

  /* ---- main entry: produce the full resume model ---- */
  function localTailor(state, opts) {
    opts = opts || {};
    var maxBullets = opts.maxBullets != null ? opts.maxBullets : (state.settings ? state.settings.maxBullets : 4);
    var grammarPreset = opts.grammar || (state.settings ? state.settings.grammar : 'standard');
    var analyzed = (state.jd && state.jd.analyzed) || TailorKW.analyzeJD(state.jd ? state.jd.raw : '');
    var corpus = TailorKW.buildCorpus(state.profile, state.work, state.projects, state.education, state.skills, state.summary);
    var coverage = TailorKW.computeCoverage(analyzed, corpus);

    var rejectedSkipped = 0;
    (state.work || []).forEach(function (w) {
      (w.bullets || []).forEach(function (b) { if (b.status === 'rejected') rejectedSkipped++; });
    });

    var work = tailorWork(state, analyzed, coverage, maxBullets, grammarPreset);
    var projects = tailorProjects(state, maxBullets);
    var summary = buildSummary(state, coverage);
    var skills = orderSkills(state.skills, coverage);

    // gaps: JD reqs not covered by materials
    var gaps = coverage.gap.slice().sort(function (a, b) { return b.count - a.count; }).slice(0, 12);

    var model = {
      meta: {
        mode: 'local',
        position: opts.position || analyzed.guess || '',
        generatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        keywordsUsed: pickTerms(coverage, 20),
        coverageRate: coverage.rate,
        grammarPreset: grammarPreset,
        rejectedSkipped: rejectedSkipped
      },
      header: {
        name: state.profile.name || '', phone: state.profile.phone || '', email: state.profile.email || '',
        city: state.profile.city || '', targetPosition: opts.position || state.profile.targetPosition || analyzed.guess || '',
        targetSalary: state.profile.targetSalary || ''
      },
      summary: summary,
      work: work,
      projects: projects,
      education: state.education || [],
      skills: skills,
      coverage: { rate: coverage.rate, matched: pickTerms(coverage, 20), gap: gaps.map(function (t) { return t.term; }) },
      gaps: gaps
    };
    model.ledger = computeLedger(model);
    model.grammar = computeGrammar(model);
    model.ats = TailorKW.atsScore(analyzed, coverage);
    model.gapSuggestions = TailorKW.gapSuggestions(gaps);
    var allBullets = [];
    work.forEach(function (w) { allBullets = allBullets.concat(w.bullets); });
    model.ownership = TailorKW.ownershipCheck(allBullets);
    return model;
  }

  var API = { localTailor: localTailor, workYears: workYears, computeLedger: computeLedger, computeGrammar: computeGrammar };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  global.TailorLocal = API;
})(typeof window !== 'undefined' ? window : globalThis);
