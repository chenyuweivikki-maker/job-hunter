/* ============ TailorCV LLM engine (OpenAI-compatible chat completions) ============ */
(function (global) {
  'use strict';

  var GRAMMAR_RULES = {
    standard: '每条工作经历要点采用「动作动词开头 → 具体做法/对象 → 量化结果」固定语法，控制在 80 字以内，最多 5 条；没有可靠数字时写可核验的定性结果，不编造百分比。',
    asu: '每条工作经历要点按「动作 → 系统能力 → 业务价值 → 结果证据 → 个人边界」五段式组织（不必逐段套模板，但必须包含动作、价值/结果、以及团队成果的个人边界），控制在 80 字以内，最多 5 条；强动词（主导/负责人/Owner）只用于有证据支撑的职责。'
  };

  function systemPrompt(grammarPreset) {
    var grammarRule = GRAMMAR_RULES[grammarPreset] || GRAMMAR_RULES.standard;
    return '你是一位资深的中国求职简历优化顾问，精通如何让候选人经历与岗位描述（JD）精准匹配。\n' +
      '你的任务：根据候选人提供的全部原始资料和 JD，产出一份「针对该 JD 定制」的中文简历内容。\n' +
      '铁律：\n' +
      '1. 只改写表达与调整侧重点，绝不编造任何业绩、数字、公司、职位；原始资料中没有的信息不要添加。\n' +
      '2. 自然融入 JD 中出现的核心能力词/关键词（融入句意，不要生硬堆砌）。\n' +
      '3. ' + grammarRule + '\n' +
      '4. 自我评价紧扣 JD 职责与要求，覆盖 2-3 个 JD 最看重的能力，2-3 句话。\n' +
      '5. skills 按与 JD 的匹配度从高到低排序，最多 15 个。\n' +
      '只输出 JSON，不要输出任何其他文字。JSON 结构：\n' +
      '{"summary":"...","work":[{"index":0,"bullets":["..."]}],"projects":[{"index":0,"bullets":["..."]}],"skills":["..."],"note":"给用户的简短说明（可选）"}\n' +
      '其中 work/projects 的 index 对应输入数据的数组下标；如果某段经历与 JD 完全无关且内容为空可省略该下标，但不要删减有内容的条目。';
  }

  function buildPayload(state) {
    var w = (state.work || []).map(function (job) {
      return {
        company: job.company, title: job.title, industry: job.industry,
        start: job.start, end: job.end,
        bullets: (job.bullets || []).filter(function (b) { return b.status !== 'rejected'; })
          .map(function (b) { return { text: b.text, tag: b.tag, evidence: b.evidence || '', boundary: b.boundary || '', status: b.status || 'confirmed' }; })
      };
    });
    return {
      jd: (state.jd && state.jd.raw) || '',
      profile: state.profile,
      summary: state.summary,
      education: state.education,
      work: w,
      projects: state.projects,
      skills: state.skills
    };
  }

  function callChat(config, messages, opts) {
    opts = opts || {};
    var base = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    var url = base + '/chat/completions';
    var body = {
      model: config.model || 'gpt-4o-mini',
      messages: messages,
      temperature: opts.temperature != null ? opts.temperature : 0.4,
      max_tokens: opts.maxTokens || 2400
    };
    if (opts.jsonMode) body.response_format = { type: 'json_object' };

    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 90000);
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (config.apiKey || '')
      },
      body: JSON.stringify(body),
      signal: ctrl.signal
    }).then(function (res) {
      clearTimeout(timer);
      return res.json().then(function (data) {
        if (!res.ok) {
          var err = new Error((data.error && data.error.message) || ('HTTP ' + res.status));
          err.status = res.status;
          throw err;
        }
        return data;
      });
    }).catch(function (e) {
      clearTimeout(timer);
      throw e;
    });
  }

  function parseJSON(text) {
    var t = String(text || '').trim();
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    var start = t.indexOf('{');
    var end = t.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('LLM 未返回有效 JSON');
    return JSON.parse(t.slice(start, end + 1));
  }

  function testLLM(config) {
    return callChat(config, [{ role: 'user', content: '回复 OK 两个字母即可。' }], { maxTokens: 10, jsonMode: false })
      .then(function () { return { ok: true }; })
      .catch(function (e) { return { ok: false, error: e.message || String(e) }; });
  }

  /* ---- main: LLM tailor, returns same resume model shape as localTailor ---- */
  function llmTailor(state, opts, config) {
    opts = opts || {};
    var grammarPreset = opts.grammar || (state.settings ? state.settings.grammar : 'standard');
    var payload = buildPayload(state);
    var userMsg = '候选人的原始资料（JSON）：\n' + JSON.stringify(payload, null, 1) +
      '\n\n目标岗位：' + (opts.position || state.profile.targetPosition || '') +
      '\n请按系统要求输出定制后的 JSON。';

    var attempt = function (jsonMode) {
      return callChat(config, [{ role: 'system', content: systemPrompt(grammarPreset) }, { role: 'user', content: userMsg }], { jsonMode: jsonMode })
        .then(function (data) {
          var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
          return parseJSON(content);
        });
    };

    return attempt(true).catch(function (e) {
      if (e && (e.status === 400 || /response_format|json_object/i.test(e.message || ''))) {
        return attempt(false); // provider doesn't support json mode -> retry
      }
      throw e;
    }).then(function (resp) {
      return assemble(resp, state, opts, config);
    });
  }

  function assemble(resp, state, opts, config) {
    var maxBullets = opts.maxBullets != null ? opts.maxBullets : (state.settings ? state.settings.maxBullets : 4);
    var grammarPreset = opts.grammar || (state.settings ? state.settings.grammar : 'standard');
    var analyzed = (state.jd && state.jd.analyzed) || TailorKW.analyzeJD(state.jd ? state.jd.raw : '');

    // 账本字段按源要点顺序透传给改写后的要点（index 对齐）
    var ledgerOf = {};
    (state.work || []).forEach(function (job, i) {
      (job.bullets || []).forEach(function (b, bi) {
        ledgerOf[i + ':' + bi] = { evidence: b.evidence || '', boundary: b.boundary || '', status: b.status || 'confirmed' };
      });
    });

    // work: map rewritten bullets by index
    var respWork = {};
    (resp.work || []).forEach(function (w) { if (w.index != null) respWork[w.index] = w.bullets || []; });
    var work = (state.work || []).map(function (job, i) {
      var srcBullets = (job.bullets || []).filter(function (b) { return b.status !== 'rejected'; });
      var bullets = respWork[i] || srcBullets.map(function (b) { return b.text; });
      bullets = bullets.slice(0, maxBullets);
      return {
        company: job.company || '未填写公司', title: job.title || '', industry: job.industry || '',
        start: job.start || '', end: job.end || '', endText: (!job.end || job.end === '至今') ? '至今' : job.end,
        bullets: bullets.map(function (text, bi) {
          var r = TailorKW.scoreBullet(text, analyzed.terms);
          var g = TailorKW.checkBulletGrammar(text, grammarPreset);
          var src = ledgerOf[i + ':' + bi] || {};
          return { text: text, tag: 'rewritten', hits: r.hits, score: r.score, grammar: g, evidence: src.evidence || '', boundary: src.boundary || '', status: src.status || 'confirmed' };
        }),
        noBullets: !srcBullets.length
      };
    });

    var respProj = {};
    (resp.projects || []).forEach(function (p) { if (p.index != null) respProj[p.index] = p.bullets || []; });
    var projects = (state.projects || []).map(function (p, i) {
      var bullets = (respProj[i] || p.bullets || []).slice(0, maxBullets);
      return { name: p.name || '未命名项目', role: p.role || '', start: p.start || '', end: p.end || '', desc: p.desc || '', bullets: bullets };
    });

    // skills from LLM
    var seen = {}, skillList = [];
    (resp.skills || []).forEach(function (s) {
      s = (s || '').trim(); if (!s || seen[s]) return; seen[s] = true; skillList.push(s);
    });
    var corpus = TailorKW.buildCorpus(state.profile, work, projects, state.education, skillList, resp.summary || '');
    var coverage = TailorKW.computeCoverage(analyzed, corpus);
    var skills = skillList.map(function (s) {
      var hot = false;
      analyzed.terms.forEach(function (t) { if (TailorKW.countOccurrences(s, t.term) > 0) hot = true; });
      return { name: s, hot: hot };
    }).slice(0, 15);

    var gaps = coverage.gap.slice().sort(function (a, b) { return b.count - a.count; }).slice(0, 12);

    var rejectedSkipped = 0;
    (state.work || []).forEach(function (job) {
      (job.bullets || []).forEach(function (b) { if (b.status === 'rejected') rejectedSkipped++; });
    });

    var model = {
      meta: {
        mode: 'llm',
        position: opts.position || analyzed.guess || '',
        generatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        model: config.model || '',
        keywordsUsed: coverage.matched.slice(0, 20).map(function (t) { return t.term; }),
        coverageRate: coverage.rate,
        grammarPreset: grammarPreset,
        rejectedSkipped: rejectedSkipped,
        llmNote: resp.note || ''
      },
      header: {
        name: state.profile.name || '', phone: state.profile.phone || '', email: state.profile.email || '',
        city: state.profile.city || '', targetPosition: opts.position || state.profile.targetPosition || analyzed.guess || '',
        targetSalary: state.profile.targetSalary || ''
      },
      summary: resp.summary || '',
      work: work,
      projects: projects,
      education: state.education || [],
      skills: skills,
      coverage: { rate: coverage.rate, matched: coverage.matched.slice(0, 20).map(function (t) { return t.term; }), gap: gaps.map(function (t) { return t.term; }) },
      gaps: gaps
    };
    model.ledger = TailorLocal.computeLedger(model);
    model.grammar = TailorLocal.computeGrammar(model);
    model.ats = TailorKW.atsScore(analyzed, coverage);
    model.gapSuggestions = TailorKW.gapSuggestions(gaps);
    var allBullets = [];
    work.forEach(function (w) { allBullets = allBullets.concat(w.bullets); });
    model.ownership = TailorKW.ownershipCheck(allBullets);
    return model;
  }

  /* ============ LLM 增值能力：HR 开场白 / 面试追问 ============ */
  function llmIntro(state, model, config) {
    var payload = {
      name: model.header.name, position: model.header.targetPosition,
      jd: (state.jd && state.jd.raw) || '',
      strongestBullet: (function () {
        var all = [];
        model.work.forEach(function (w) { (w.bullets || []).forEach(function (b) { all.push(b); }); });
        all.sort(function (a, b) { return (b.hits || []).length - (a.hits || []).length; });
        return all[0] ? all[0].text : '';
      })(),
      matchedKeywords: model.coverage.matched.slice(0, 6)
    };
    var prompt = '你是中文求职沟通顾问。请为候选人写 2 段文字：\n' +
      '1. HR 开场白（Boss直聘/微信，80-160 字）：先身份+方向，再一个真实成果，最后邀请沟通；\n' +
      '2. 求职信正文（150-250 字）：针对 JD，突出匹配点。\n' +
      '只用资料中真实存在的信息，不编造。资料：' + JSON.stringify(payload) + '\n只输出 JSON：{"hrIntro":"...","coverLetter":"..."}';
    return callChat(config, [{ role: 'system', content: '你输出严格 JSON，不输出其他文字。' }, { role: 'user', content: prompt }], { jsonMode: true, maxTokens: 800 })
      .then(function (data) {
        var c = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        return parseJSON(c);
      });
  }

  function llmInterview(state, model, config) {
    var payload = {
      jd: (state.jd && state.jd.raw) || '',
      summary: model.summary,
      work: model.work.map(function (w) {
        return { company: w.company, title: w.title, bullets: (w.bullets || []).map(function (b) { return b.text; }) };
      }),
      pendingClaims: model.ledger ? model.ledger.pending.map(function (b) { return b.text; }) : [],
      gapKeywords: (model.gaps || []).map(function (g) { return g.term; })
    };
    var prompt = '你是资深面试官。基于候选人简历与目标 JD，预测面试最可能被追问的问题。\n' +
      '输出 8-10 个问题，覆盖：最强经历的深度追问（个人贡献/决策/指标口径）、高风险主张核实、JD 要求的技能缺口、行为面试。\n' +
      '资料：' + JSON.stringify(payload) + '\n只输出 JSON：{"questions":[{"q":"...","why":"问这个的原因/期望听到什么"}]}';
    return callChat(config, [{ role: 'system', content: '你输出严格 JSON，不输出其他文字。' }, { role: 'user', content: prompt }], { jsonMode: true, maxTokens: 1200 })
      .then(function (data) {
        var c = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        var r = parseJSON(c);
        return Array.isArray(r.questions) ? r.questions : [];
      });
  }

  /* 本地规则版面试追问（无需 key）：强主张核实 + 技能缺口 + JD 职责 */
  function localInterview(model, state) {
    var qs = [];
    (model.ledger ? model.ledger.strong : []).slice(0, 3).forEach(function (b) {
      qs.push({ q: '请用 STAR 讲清楚「' + b.text.slice(0, 30) + '…」：你的个人贡献、当时的决策和结果口径是什么？', why: '强主张核实：面试官会要求你讲细节' });
    });
    (model.ledger ? model.ledger.pending : []).slice(0, 3).forEach(function (b) {
      qs.push({ q: '「' + b.text.slice(0, 30) + '…」这条目前标记为待确认——请准备好数据来源与计算口径。', why: '待确认主张：必须能现场给出证据' });
    });
    (model.gaps || []).slice(0, 3).forEach(function (g) {
      qs.push({ q: 'JD 要求「' + g.term + '」，你的经历里没有直接体现——你如何回答相关提问？是否有迁移经验可讲？', why: '技能缺口：准备好迁移故事或诚实说明' });
    });
    if (!qs.length) qs.push({ q: '请用 3 分钟介绍你与这个岗位最匹配的一段经历。', why: '通用开场' });
    return qs.slice(0, 10);
  }

  var API = { testLLM: testLLM, llmTailor: llmTailor, buildPayload: buildPayload, llmIntro: llmIntro, llmInterview: llmInterview, localInterview: localInterview };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  global.TailorLLM = API;
})(typeof window !== 'undefined' ? window : globalThis);
