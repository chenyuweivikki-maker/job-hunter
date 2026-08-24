/* ============ TailorCV data layer ============ */
(function (global) {
  'use strict';

  var KEY = 'tailorcv-state-v1';

  /* ---- utils ---- */
  function uid() { return 'id' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function num(s) { var n = parseFloat(s); return isNaN(n) ? 0 : n; }
  function today() { return new Date().toISOString().slice(0, 7); }
  function yearsBetween(start, end) {
    if (!start) return 0;
    var e = (end && end !== '至今') ? end : today();
    var sy = num(start.slice(0, 4)), ey = num(e.slice(0, 4));
    var sm = num(start.slice(5, 7) || 1), em = num(e.slice(5, 7) || 1);
    return Math.max(0, (ey - sy) + (em - sm) / 12);
  }
  function debounce(fn, ms) {
    var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); };
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return Promise.resolve();
  }
  function download(filename, content, mime) {
    var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 200);
  }

  /* ---- storage (browser only; node falls back to memory) ---- */
  var memory = null;
  var store = {
    load: function () {
      if (memory) return memory;
      try {
        if (typeof localStorage !== 'undefined') {
          var raw = localStorage.getItem(KEY);
          if (raw) return JSON.parse(raw);
        }
      } catch (e) {}
      return null;
    },
    save: function (state) {
      memory = state;
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(state));
      } catch (e) {}
    },
    clear: function () {
      memory = null;
      try { if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY); } catch (e) {}
    }
  };

  /* ---- default state ---- */
  function emptyState() {
    return {
      profile: { name: '', phone: '', email: '', city: '', targetPosition: '', targetSalary: '' },
      summary: '',
      education: [],
      work: [],
      projects: [],
      skills: [],
      jds: [],            // JD 档案：每份 JD 一条 {id,name,raw,analyzed,generated,createdAt}
      jd: null,           // 活动 JD（指向 jds 中的对象引用）
      settings: {
        llm: { baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini' },
        mode: 'local',
        style: 'wide',
        detail: 'concise',       // concise(简介) | full(详细)
        maxBullets: 4,
        grammar: 'standard'      // standard(标准三要素) | asu(ASu五段式)
      },
      generated: null,    // 活动 JD 的已生成简历（与 jd.generated 同步）
      generatedFp: null
    };
  }

  function newJd(name) {
    return {
      id: uid(),
      name: (name || '').trim(),
      raw: '',
      analyzed: null,
      generated: null,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      // 投递追踪字段
      company: '',
      stage: '',          // plan | applied | interview | offer | rejected
      appliedAt: '',
      note: ''
    };
  }

  /* 兼容迁移：老版本只有单一 jd.raw / generated —— 升级为档案的第一份 JD */
  function normalizeState(s) {
    s = s || emptyState();
    s.jds = Array.isArray(s.jds) ? s.jds : [];
    s.jds.forEach(function (j) {
      if (j.company == null) j.company = '';
      if (j.stage == null) j.stage = '';
      if (j.appliedAt == null) j.appliedAt = '';
      if (j.note == null) j.note = '';
    });
    if (s.jd && !s.jds.some(function (j) { return j.id === s.jd.id; })) s.jds.push(s.jd);
    if (!s.jds.length) {
      if (s.jd && (s.jd.raw || s.jd.analyzed)) {
        s.jds.push(s.jd);
      } else {
        var fresh = newJd('');
        s.jds.push(fresh);
        s.jd = fresh;
      }
    }
    if (!s.jd) s.jd = s.jds[0] || newJd('');
    // 老数据：state.generated 迁移到活动 JD
    if (s.jd && !s.jd.generated && s.generated) s.jd.generated = s.generated;
    s.generated = (s.jd && s.jd.generated) || null;
    if (!s.settings.grammar) s.settings.grammar = 'standard';
    return s;
  }

  /* ---- sample data (真实的示例，方便立刻体验全流程) ---- */
  function sampleWork() {
    return [
      {
        id: uid(), company: '杭州云启科技有限公司', title: '高级产品经理', industry: 'B端 SaaS / 企业服务',
        start: '2021-03', end: '至今',
        bullets: [
          { id: uid(), tag: 'achievement', text: '负责「智能客服平台」从 0 到 1 的产品规划与落地，主导需求调研、PRD 撰写与敏捷迭代节奏管理，产品上线 6 个月签约 40+ 家企业客户，年化合同额突破 800 万', evidence: '公司 CRM 合同台账（2021.09-2022.03 签约记录）', boundary: '本人负责产品规划与交付，签约由销售团队执行', status: 'confirmed' },
          { id: uid(), tag: 'data', text: '通过埋点体系与漏斗分析优化新用户激活流程，激活率从 32% 提升至 58%，关键功能留存率提升 21%', evidence: '埋点看板截图 + 季度复盘 PPT（2022Q2）', boundary: '数据指标为全链路团队共同达成', status: 'confirmed' },
          { id: uid(), tag: 'duty', text: '管理 5 人产品团队，制定季度 Roadmap，协调研发、设计、测试资源，保障双周迭代按时交付', evidence: '', boundary: '', status: 'confirmed' },
          { id: uid(), tag: 'duty', text: '搭建客户成功反馈闭环，定期访谈 KA 客户，输出需求优先级矩阵，推动 20+ 项高优需求上线', evidence: '', boundary: '', status: 'confirmed' },
          { id: uid(), tag: 'achievement', text: '主导商业化方案设计（订阅 + 增值包），客单价提升 35%，续费率维持在 92% 以上', evidence: '财务月度订阅报表', boundary: '定价策略由管理层共同决策，本人主导方案设计', status: 'pending' }
        ]
      },
      {
        id: uid(), company: '上海麦穗电子商务有限公司', title: '产品经理', industry: '电商 / 消费零售',
        start: '2018-07', end: '2021-02',
        bullets: [
          { id: uid(), tag: 'achievement', text: '负责大促会场与营销工具产品（优惠券、拼团、秒杀），2019 双十一活动 GMV 同比增长 67%' },
          { id: uid(), tag: 'data', text: '搭建 A/B 测试实验体系，覆盖 30+ 个核心页面，累计实验 120+ 次，为决策提供数据依据' },
          { id: uid(), tag: 'duty', text: '对接运营、客服、供应链多方需求，独立完成需求分析、原型设计与评审排期' },
          { id: uid(), tag: 'duty', text: '输出竞品分析报告与用户研究报告 40+ 份，驱动营销玩法迭代 3 个大版本' }
        ]
      },
      {
        id: uid(), company: '苏州微光信息技术有限公司', title: '产品助理', industry: '软件 / 互联网',
        start: '2016-07', end: '2018-06',
        bullets: [
          { id: uid(), tag: 'duty', text: '协助高级产品经理完成需求收集、原型绘制与文档维护，参与 2 个客户端产品的版本迭代' },
          { id: uid(), tag: 'duty', text: '跟进线上问题与用户反馈，整理 bug 清单并推动修复，产品好评率稳定在 4.7/5' }
        ]
      }
    ];
  }

  function sampleProjects() {
    return [
      {
        id: uid(), name: '智能客服知识库重构', role: '产品负责人', start: '2022-06', end: '2023-01',
        desc: '重构客服机器人知识库管理后台，支持批量导入、自动分类与效果看板。',
        bullets: [
          '设计知识库 Schema 与导入工具，人工维护成本降低 70%',
          '上线语义检索 + 兜底转人工策略，机器人独立解决率从 41% 提升至 66%'
        ]
      },
      {
        id: uid(), name: '会员积分商城 2.0', role: '产品经理', start: '2020-03', end: '2020-09',
        desc: '积分商城改版，打通订单与营销系统。',
        bullets: [
          '重构积分获取/消耗规则，月均活跃会员数提升 38%',
          '接入 3 家第三方权益供应商，丰富兑换商品池至 200+ SKU'
        ]
      }
    ];
  }

  function sampleState() {
    var s = emptyState();
    s.profile = { name: '张明远', phone: '138-0000-1234', email: 'zhangmingyuan@example.com', city: '杭州', targetPosition: '高级产品经理', targetSalary: '25-35K·14薪' };
    s.summary = '6 年 B 端与 C 端产品经验，擅长从 0 到 1 与商业化落地，具备数据驱动决策和跨部门协作能力。';
    s.education = [{ id: uid(), school: '浙江大学', degree: '本科', major: '计算机科学与技术', start: '2012-09', end: '2016-06', note: '' }];
    s.work = sampleWork();
    s.projects = sampleProjects();
    s.skills = ['需求分析', 'PRD', 'Axure / Figma', '用户研究', '数据分析', 'SQL', 'A/B 测试', '项目管理', '敏捷开发', '跨部门协作', 'Roadmap 规划', '商业分析'];
    var jd = newJd('高级产品经理（B 端 SaaS）');
    jd.raw = '高级产品经理（B 端 SaaS）\n' +
      '职位描述：\n' +
      '1. 负责公司核心 SaaS 产品线的规划与迭代，主导需求分析、PRD 撰写与版本节奏管理；\n' +
      '2. 深入客户一线，通过用户访谈与数据分析挖掘痛点，输出可落地的产品方案；\n' +
      '3. 协同研发、设计、销售与客户成功团队，推动产品从需求到交付的全流程落地；\n' +
      '4. 关注行业竞品与市场趋势，制定产品 Roadmap，对产品商业化结果负责。\n' +
      '任职要求：\n' +
      '1. 本科及以上学历，5 年以上 B 端产品经验，有 SaaS / 企业服务背景优先；\n' +
      '2. 熟悉 SQL、数据分析方法论，能独立完成 A/B 实验设计与数据复盘；\n' +
      '3. 具备优秀的跨部门沟通与项目管理能力，有团队管理经验者优先；\n' +
      '4. 对用户增长、续费留存、商业化指标有深入理解，结果导向。';
    s.jds.push(jd);
    var jd2 = newJd('数据分析师（增长方向）');
    jd2.raw = '数据分析师（用户增长方向）\n' +
      '职位描述：\n' +
      '1. 负责增长业务的数据指标体系搭建与看板维护，通过漏斗分析定位转化瓶颈；\n' +
      '2. 设计并分析 A/B 实验，输出实验结论与优化建议，推动业务策略迭代；\n' +
      '3. 与产品、运营协作，用数据驱动用户增长与留存提升，定期输出数据复盘报告。\n' +
      '任职要求：\n' +
      '1. 本科及以上学历，3 年以上数据分析经验，精通 SQL 与 Excel，熟练使用 Python 优先；\n' +
      '2. 熟悉 A/B 实验设计与显著性检验，有增长/电商/互联网行业背景优先；\n' +
      '3. 具备优秀的跨部门沟通与数据可视化能力，能独立输出分析结论。';
    s.jds.push(jd2);
    s.jd = jd;
    return s;
  }

  /* ---- state container ---- */
  var state = normalizeState(store.load() || emptyState());
  function saveState() { store.save(state); }

  /* ---- JD 档案操作 ---- */
  function syncGenerated() {
    state.generated = (state.jd && state.jd.generated) || null;
  }
  function addJd(name) {
    var j = newJd(name);
    state.jds.push(j);
    state.jd = j;
    syncGenerated();
    saveState();
    return j;
  }
  function switchJd(id) {
    var j = null;
    state.jds.forEach(function (x) { if (x.id === id) j = x; });
    if (!j) return false;
    state.jd = j;
    syncGenerated();
    saveState();
    return true;
  }
  function removeJd(id) {
    var idx = -1;
    state.jds.forEach(function (x, i) { if (x.id === id) idx = i; });
    if (idx === -1) return false;
    state.jds.splice(idx, 1);
    if (state.jd && state.jd.id === id) {
      state.jd = state.jds[0] || addJd('');
      syncGenerated();
    }
    saveState();
    return true;
  }
  function renameJd(id, name) {
    state.jds.forEach(function (x) { if (x.id === id) x.name = (name || '').trim(); });
    saveState();
  }
  function jdLabel(j, i) {
    return (j && j.name) ? j.name : ('JD ' + ((i != null ? i : state.jds.indexOf(j)) + 1));
  }

  var API = {
    KEY: KEY,
    state: state,
    save: saveState,
    store: store,
    uid: uid,
    esc: esc,
    num: num,
    today: today,
    yearsBetween: yearsBetween,
    debounce: debounce,
    copyText: copyText,
    download: download,
    emptyState: emptyState,
    normalizeState: normalizeState,
    sampleState: sampleState,
    newJd: newJd,
    addJd: addJd,
    switchJd: switchJd,
    removeJd: removeJd,
    renameJd: renameJd,
    jdLabel: jdLabel,
    syncGenerated: syncGenerated
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  global.TailorCV = API;
})(typeof window !== 'undefined' ? window : globalThis);
