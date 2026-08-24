/* ============ TailorCV keyword engine (local, no LLM needed) ============ */
(function (global) {
  'use strict';

  /* ---- skill dictionary: category -> terms ---- */
  var SKILL_DICT = {
    '产品': ['产品经理', '产品规划', '需求分析', '需求调研', '需求管理', 'PRD', '原型设计', '原型图', '用户研究', '用户访谈', '用户画像', '竞品分析', '竞品调研', 'Roadmap', '版本迭代', '迭代节奏', '敏捷开发', 'Scrum', '产品方案', '产品设计', 'B端', 'C端', 'SaaS', '企业服务', '商业化', '商业模式', '付费转化', '增值服务', '产品运营', '中台', '微服务', '体验设计', '交互设计', '埋点', '功能上线', '灰度发布', 'AI产品', '大模型'],
    '数据': ['数据分析', '数据驱动', '指标体系', '埋点体系', '漏斗分析', 'A/B测试', 'AB实验', 'A/B 实验', '数据复盘', '数据看板', '报表', 'BI', 'SQL', 'Excel', 'Python', 'R语言', '数据建模', '数据仓库', '增长分析', '留存分析', '转化率', 'GMV', 'DAU', 'MAU', '北极星指标', '实验设计'],
    '运营增长': ['用户增长', '用户运营', '内容运营', '活动运营', '私域运营', '社群运营', '会员体系', '积分体系', '用户留存', '拉新', '促活', '转化', '复购', '续费', '留存率', '激活率', '运营策略', '渠道运营', '直播运营', '小红书', '抖音', '公众号', 'SEO', 'SEM', '投放', '裂变'],
    '技术': ['前端', '后端', '全栈', 'Java', 'Go', 'Python开发', 'JavaScript', 'TypeScript', 'Vue', 'React', 'Node.js', '数据库', 'MySQL', 'Redis', 'Kafka', '微服务架构', '分布式', '高并发', '性能优化', '接口设计', 'API', '测试', '自动化测试', 'CI/CD', 'Docker', 'Kubernetes', 'Linux', '算法', '机器学习', '深度学习', 'NLP', '推荐系统', '搜索', '架构设计', '技术方案', '代码评审', '研发效能', '系统设计'],
    '市场销售': ['市场调研', '市场推广', '品牌营销', '品牌建设', '市场营销', '渠道拓展', '销售策略', '客户拓展', '大客户', 'KA客户', '商务谈判', '招投标', '售前', '售后', '客户成功', '销售支持', '商机', '报价', '合同管理', 'ROI', '线索', '获客'],
    '管理软技能': ['团队管理', '团队建设', '跨部门协作', '跨部门沟通', '项目管理', '资源协调', '风险管理', '沟通协调', '汇报', '向上管理', '目标管理', 'OKR', 'KPI', '复盘', '方法论沉淀', '培训', '导师', '面试官', '招聘', '新人培养', '执行力', '抗压', '自驱', 'ownership', 'ownership能力'],
    '人力': ['人力资源', 'HRBP', '招聘', '绩效管理', '薪酬', '组织发展', '员工关系', '培训体系', '人才梯队', '六大模块', '三支柱'],
    '财务法务': ['财务分析', '预算管理', '成本控制', '审计', '税务', '合规', '风控', '尽调', '投融资', 'IPO', '合同审核'],
    '行业': ['电商', '新零售', '消费', '金融', '教育', '医疗', '地产', '制造', '物流', '供应链', '汽车', '游戏', '广告', '传媒', '本地生活', '跨境', 'SaaS行业', '互联网', '物联网', '区块链']
  };

  var CATS = Object.keys(SKILL_DICT);
  var ALL_TERMS = [];
  CATS.forEach(function (c) { SKILL_DICT[c].forEach(function (t) { ALL_TERMS.push({ term: t, cat: c }); }); });

  var STOP = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'are', 'was', 'were', 'have', 'has', 'had', 'from', 'your', 'you', 'our', 'all', 'will', 'can', 'not', 'but', 'also', 'more', 'than', 'into', 'about', 'their', 'them', 'they', 'what', 'which', 'when', 'where', 'who', 'how', 'etc', 'year', 'years', 'plus', 'via', 'per', 'its', 'it', 'or', 'as', 'of', 'to', 'in', 'on', 'at', 'by', 'be', 'we', 'us', 'job', 'work', 'team', 'skills', 'skill', 'experience', 'ability', 'strong', 'good', 'excellent', 'related', 'preferred', 'required', 'etc', 'responsibilities', 'requirements']);

  /* ---- text utils ---- */
  function lower(s) { return s.toLowerCase(); }
  function hasWord(text, word) {
    var re = new RegExp('(^|[^a-z0-9])' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])', 'i');
    return re.test(text);
  }
  function countOccurrences(text, term) {
    if (!term) return 0;
    if (/^[a-zA-Z0-9.+\-/]+$/.test(term)) {
      var re = new RegExp('(^|[^a-z0-9])' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])', 'ig');
      var m = text.match(re);
      return m ? m.length : 0;
    }
    var idx = 0, n = 0;
    while ((idx = text.indexOf(term, idx)) !== -1) { n++; idx += term.length; }
    return n;
  }

  /* ---- extract English words frequency ---- */
  function englishWords(text) {
    var m = text.match(/[a-zA-Z][a-zA-Z0-9.+\-/]{1,}/g) || [];
    var freq = {};
    m.forEach(function (w) {
      var k = lower(w);
      if (STOP.has(k) || k.length < 2) return;
      freq[k] = (freq[k] || 0) + 1;
    });
    return Object.keys(freq).map(function (k) { return { term: k, count: freq[k] }; })
      .filter(function (f) { return f.count >= 2; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 25);
  }

  /* ---- sentence splitting + classification ---- */
  var DUTY_MARK = /负责|主导|推动|规划|设计|搭建|输出|管理|统筹|跟进|参与|协调|制定|落地|复盘|撰写|调研|访谈|挖掘|分析|协同|对接|优化|组织|开展|执行|交付|达成|梳理|完善|建立|维护|支持|协助|推进|实施|跟踪/;
  var REQ_MARK = /要求|任职|熟悉|掌握|精通|本科|硕士|博士|学历|年以上|优先|具备|了解|能够|能力|经验者|期望|加分项/;

  function splitSentences(text) {
    var cleaned = (text || '').replace(/\r/g, '').replace(/\n+/g, '\n');
    var parts = cleaned.split(/(?<=[。！？；;]|\n)/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 1; });
    return parts.map(function (s) {
      var kind = 'other';
      if (REQ_MARK.test(s)) kind = 'req';
      else if (DUTY_MARK.test(s)) kind = 'duty';
      return { text: s, kind: kind };
    });
  }

  /* ---- main analysis ---- */
  function analyzeJD(raw) {
    var text = raw || '';
    var sentences = splitSentences(text);

    var termFreq = ALL_TERMS.map(function (e) {
      var c = countOccurrences(text, e.term);
      return { term: e.term, cat: e.cat, count: c };
    }).filter(function (e) { return e.count > 0; });

    var extra = englishWords(text).map(function (e) { return { term: e.term, cat: '英文', count: e.count }; });

    // dedupe case-insensitively (SaaS vs saas)
    var seenTerm = {};
    var all = [];
    termFreq.concat(extra).sort(function (a, b) { return b.count - a.count; }).forEach(function (t) {
      var key = t.term.toLowerCase();
      if (seenTerm[key]) return;
      seenTerm[key] = true;
      all.push(t);
    });

    var duties = sentences.filter(function (s) { return s.kind === 'duty'; }).map(function (s) { return s.text; });
    var reqs = sentences.filter(function (s) { return s.kind === 'req'; }).map(function (s) { return s.text; });

    // guess target position: skip section-header lines, prefer lines mentioning a role title
    var HEADER = /(职位描述|岗位职责|任职要求|工作职责|岗位要求|岗位说明|职位要求|职位详情|公司介绍|公司简介|福利待遇|薪资待遇|我们提供|工作内容|岗位亮点)/;
    var ROLE = /(经理|工程师|专家|专员|主管|总监|运营|设计|开发|销售|顾问|助理|分析师|代表|合伙人|讲师|教练|主管)/;
    var lines = text.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    var guess = '';
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i];
      if (HEADER.test(L)) continue;
      if (/(职位|岗位|招聘|诚聘|急招)/.test(L) || ROLE.test(L)) {
        guess = L.replace(/^[#\-\s]*/, '').replace(/[：:].*$/, '').trim();
        break;
      }
    }
    if (!guess) {
      var tm = text.match(/([\u4e00-\u9fa5A-Za-z0-9]{2,20})(经理|工程师|专家|专员|主管|总监|运营|设计|开发|销售|顾问|助理)/);
      if (tm) guess = tm[0];
    }

    return { sentences: sentences, terms: all, duties: duties, reqs: reqs, guess: guess, raw: raw };
  }

  /* ---- coverage: which JD terms appear in the user's materials ---- */
  function buildCorpus(profile, work, projects, education, skills, summary) {
    var parts = [summary || ''];
    (skills || []).forEach(function (s) { parts.push(s); });
    (work || []).forEach(function (w) {
      parts.push(w.company || '', w.title || '', w.industry || '');
      (w.bullets || []).forEach(function (b) { parts.push(b.text || ''); });
    });
    (projects || []).forEach(function (p) {
      parts.push(p.name || '', p.role || '', p.desc || '');
      (p.bullets || []).forEach(function (b) { parts.push(b); });
    });
    (education || []).forEach(function (e) { parts.push(e.school || '', e.major || '', e.degree || ''); });
    return parts.join('\n');
  }

  function computeCoverage(analyzed, corpus) {
    var terms = analyzed.terms.map(function (t) {
      return { term: t.term, cat: t.cat, count: t.count, matched: synMatch(corpus, t.term) };
    });
    var matched = terms.filter(function (t) { return t.matched; });
    var gap = terms.filter(function (t) { return !t.matched; });
    var rate = terms.length ? Math.round(matched.length / terms.length * 100) : 0;
    return { terms: terms, matched: matched, gap: gap, rate: rate };
  }

  /* ============ 语义变体（同义词组，提升 ATS 匹配） ============ */
  var SYNONYM_GROUPS = [
    ['数据分析', '数据挖掘', '数据科学', '数据分析方法论'],
    ['A/B测试', 'AB实验', 'A/B 实验', 'AB 测试', '实验设计', 'A/B 测试'],
    ['用户增长', '增长', '拉新', '获客'],
    ['用户留存', '留存率', '留存', '复购'],
    ['项目管理', '项目交付', '项目统筹', '交付管理'],
    ['跨部门沟通', '跨部门协作', '协同', '多方协作'],
    ['用户研究', '用户调研', '用户访谈', '调研'],
    ['需求分析', '需求调研', '需求管理', '需求梳理'],
    ['商业化', '商业模式', '变现', '营收'],
    ['运营', '活动运营', '用户运营', '内容运营'],
    ['SQL', '数据库查询', 'MySQL', '数据库'],
    ['敏捷开发', 'Scrum', '双周迭代', '迭代'],
    ['KPI', 'OKR', '目标管理', '指标'],
    ['续费', '续费率', '客户留存', '续约'],
    ['转化率', '转化', '付费转化', '转化漏斗'],
    ['私域', '私域运营', '社群运营', '社群'],
    ['客户成功', 'KA客户', '大客户', 'KA'],
    ['用户画像', '目标用户', '人群分析']
  ];
  var SYN_LOOKUP = {}; // term -> group members
  SYNONYM_GROUPS.forEach(function (g) {
    g.forEach(function (t) { SYN_LOOKUP[t] = g; });
  });
  function synMatch(text, term) {
    if (!term) return false;
    if (countOccurrences(text, term) > 0) return true;
    var g = SYN_LOOKUP[term];
    if (g) {
      for (var i = 0; i < g.length; i++) {
        var m = g[i];
        if (countOccurrences(text, m) > 0) return true;
        // 中英混合术语常带空格差异（AB实验 vs AB 实验）：忽略空白再比一次
        if (m.indexOf(' ') !== -1 || /[a-zA-Z]/.test(m)) {
          var textCompact = text.replace(/\s+/g, '');
          var mCompact = m.replace(/\s+/g, '');
          if (mCompact.length >= 2 && textCompact.indexOf(mCompact) !== -1) return true;
        }
      }
    }
    return false;
  }

  /* ============ ATS 职位匹配总分（0-100，加权） ============ */
  var ATS_WEIGHTS = { '技术': 2, '数据': 2, '产品': 1.5, '运营增长': 1.5, '市场销售': 1.2, '管理软技能': 1.2, '人力': 1, '财务法务': 1, '行业': 1, '英文': 0.3 };
  function atsScore(analyzed, coverage) {
    var total = 0, hit = 0;
    coverage.terms.forEach(function (t) {
      var w = ATS_WEIGHTS[t.cat] || 1;
      total += w;
      if (t.matched) hit += w;
    });
    var kwRate = total ? Math.round(hit / total * 100) : 0;
    var dutyCovered = 0;
    (analyzed.duties || []).forEach(function (d) {
      var ok = coverage.terms.some(function (t) { return t.matched && countOccurrences(d, t.term) > 0; });
      if (ok) dutyCovered++;
    });
    var dutyRate = (analyzed.duties || []).length ? Math.round(dutyCovered / analyzed.duties.length * 100) : 0;
    var score = Math.round(kwRate * 0.7 + dutyRate * 0.3);
    return {
      score: score,
      keywords: kwRate,
      duties: dutyRate,
      verdict: score >= 80 ? '高匹配' : (score >= 55 ? '中匹配' : '低匹配，需补强')
    };
  }

  /* ============ 技能缺口学习建议 ============ */
  var TERM_OVERRIDES = {
    'SQL': '补 SQL 查询与数据看板实践：可先做一个小型数据分析项目写进经历',
    'A/B测试': '补 A/B 实验设计与显著性检验：整理一次真实实验的结论口径',
    'A/B 实验': '补 A/B 实验设计与显著性检验：整理一次真实实验的结论口径',
    '用户增长': '补增长方法论：读《增长黑客》，用现有数据做一次留存/转化复盘',
    '团队管理': '补管理证据：写明带人规模、目标拆解与结果',
    'Python': '补 Python 数据分析实战：处理一次真实数据集并沉淀为项目要点',
    '大模型': '补大模型应用实践：做一个 prompt 工程/Agent demo 并写进项目',
    '私域运营': '补私域案例：整理社群/企微的运营链路与转化数据',
    '直播运营': '补直播运营案例：单场直播的筹备、话术与 GMV 数据'
  };
  var CAT_SUGGESTIONS = {
    '数据': '补「SQL + 数据分析方法论」：完成一个小型数据分析项目并量化结果',
    '技术': '按 JD 技术栈补一个可展示的 demo 项目（如 GitHub 仓库），标注熟练度',
    '产品': '补「需求分析/PRD」实践：整理一份你经手的 PRD 或竞品分析作为作品',
    '运营增长': '补「增长方法论」：读《增长黑客》，用已有数据做一次留存/转化复盘',
    '市场销售': '补「客户/渠道」经验：梳理过往客户沟通案例并量化贡献',
    '管理软技能': '补「跨部门协作/项目管理」证据：在要点中写明协调角色与结果',
    '人力': '补 HR 实操案例：整理招聘/绩效/培训任一模块的完整闭环',
    '财务法务': '补财务/合规实践：用过往报表或风控案例说明能力',
    '行业': '补行业认知：调研目标行业 3 个标杆案例并写成要点',
    '英文': '补充对应中文能力描述，或附英文简历版本'
  };
  function gapSuggestions(gaps) {
    return (gaps || []).map(function (g) {
      return { term: g.term, cat: g.cat, suggestion: TERM_OVERRIDES[g.term] || CAT_SUGGESTIONS[g.cat] || '补充相关项目或课程经验，并在要点中体现' };
    });
  }

  /* ---- bullet scoring ---- */
  function scoreBullet(text, analyzedTerms) {
    var score = 0, hits = [];
    analyzedTerms.forEach(function (t) {
      if (synMatch(text, t.term)) { score += Math.min(t.count, 2); hits.push(t.term); }
    });
    // small bonus for quantifiable results
    if (/[\d]+%|[\d]+万|[\d]+家|提升|增长|降低|节省|减少/.test(text)) score += 1;
    return { score: score, hits: hits };
  }

  /* ============ fixed grammar (固定语法) ============ */
  var ACTION_VERBS = /^(负责|主导|推动|搭建|设计|规划|输出|制定|统筹|协调|优化|重构|建立|落地|达成|提升|降低|实现|完成|组织|开展|执行|交付|撰写|调研|访谈|挖掘|梳理|完善|维护|支持|协助|推进|实施|跟踪|组建|带领|管理|运营|打通|上线|发布|引入|改造|研发|开发|编写|驱动)/;

  // strong claims need evidence: 强主张
  var STRONG_CLAIM = /主导|负责人|Owner|0到1|0→1|从0|核心作者|核心开发|架构|首创|首个|第一|全部|唯一|独立负责|独立搭建|从零|重塑|翻倍|增长\d+倍/;

  var GRAMMAR_PRESETS = {
    standard: {
      name: '标准三要素',
      rule: '「动作动词开头 → 具体做法/对象 → 量化结果」',
      desc: '每条要点以动作动词开头，说明做了什么、怎么做，尽量带可量化的结果。'
    },
    asu: {
      name: 'ASu 五段式',
      rule: '「动作 → 系统能力 → 业务价值 → 结果证据 → 个人边界」',
      desc: '先写动作，再说明背后的能力与业务价值，结果用证据支撑，团队成果标注个人边界。'
    }
  };

  // 非破坏性语法检查：返回 ok / issues / score
  function checkBulletGrammar(text, preset) {
    text = (text || '').trim();
    var issues = [];
    if (!text) return { ok: false, issues: ['空要点'], score: 0 };
    if (!ACTION_VERBS.test(text)) issues.push('建议以动作动词开头（负责/主导/搭建/推动…）');
    if (text.length > 80) issues.push('超过 80 字，建议精简');
    var hasQuant = /[\d]+/.test(text);
    if (!hasQuant) issues.push('缺少量化数字（% / 万 / 次 / 家 等），建议至少 1 个数字');
    var hasResult = /[\d]+[%％万kK+倍]|提升|增长|降低|节省|减少|达成|突破|覆盖|上线|落地|复用|翻倍|从.{0,6}提升到/.test(text);
    if (!hasResult) issues.push('缺少结果/价值描述（量化结果或「提升/达成/落地」）');
    if (preset === 'asu') {
      var hasBoundary = /负责|独立|牵头|团队|协作|协同|共同|参与|主导/.test(text);
      if (!hasBoundary) issues.push('五段式建议明确个人边界（负责/独立/主导…）');
    }
    var score = 100;
    score -= issues.length * 25;
    if (hasQuant) score += 10;
    return { ok: issues.length === 0, issues: issues, score: Math.max(0, Math.min(100, score)) };
  }

  // 汇总级 ownership 检查：统计「负责/主导」开头的要点，≥3 条且多数无量化则提示
  function ownershipCheck(bullets) {
    var ba = bullets.filter(function (b) { return /^(负责|主导)/.test((b.text || '').trim()); });
    var withoutQuant = ba.filter(function (b) { return !/[\d]+/.test(b.text || ''); });
    var warnings = [];
    if (ba.length >= 3 && withoutQuant.length >= Math.max(2, Math.floor(ba.length / 2))) {
      warnings.push('有 ' + ba.length + ' 条要点以「负责/主导」开头且多数没有量化数字——补量化结果，或降级为「参与/协助」并写明边界');
    }
    return { count: ba.length, withoutQuant: withoutQuant.length, warnings: warnings };
  }

  var API = {
    SKILL_DICT: SKILL_DICT,
    CATS: CATS,
    ALL_TERMS: ALL_TERMS,
    analyzeJD: analyzeJD,
    buildCorpus: buildCorpus,
    computeCoverage: computeCoverage,
    scoreBullet: scoreBullet,
    countOccurrences: countOccurrences,
    splitSentences: splitSentences,
    GRAMMAR_PRESETS: GRAMMAR_PRESETS,
    checkBulletGrammar: checkBulletGrammar,
    ACTION_VERBS: ACTION_VERBS,
    STRONG_CLAIM: STRONG_CLAIM,
    SYNONYM_GROUPS: SYNONYM_GROUPS,
    synMatch: synMatch,
    atsScore: atsScore,
    gapSuggestions: gapSuggestions,
    ownershipCheck: ownershipCheck
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  global.TailorKW = API;
})(typeof window !== 'undefined' ? window : globalThis);
