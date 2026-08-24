/* ============ TailorCV UI controller ============ */
(function (global) {
 'use strict';
 var D = TailorCV;
 var KW = TailorKW;
 var state = D.state;

 var VIEWS = {
 profile: ['资料库', '一次录入全部工作经历，之后任意 JD 一键复用'],
 jd: ['JD 输入', '粘贴岗位描述，自动解析职责、要求与关键词'],
 generate: ['生成简历', '选择适配模式与排版，一键生成定制简历'],
 preview: ['简历预览', '默认「简介 · 宽排版」，支持打印导出']
 };

 var $ = function (sel, root) { return (root || document).querySelector(sel); };
 var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

 /* ---------- toast / modal ---------- */
 function toast(msg, type) {
 var root = $('#toast-root');
 var t = document.createElement('div');
 t.className = 'toast' + (type ? ' ' + type : '');
 t.textContent = msg;
 root.appendChild(t);
 setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(function () { t.remove(); }, 350); }, 2600);
 }

 function modal(html, footerBtns) {
 var root = $('#modal-root');
 var mask = document.createElement('div');
 mask.className = 'mask';
 mask.innerHTML = '<div class="modal"><div class="modal-h"></div><div class="modal-b"></div><div class="modal-f"></div></div>';
 var m = $('.modal', mask);
 var close = function () { mask.remove(); };
 mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
 $('.modal-h', m).innerHTML = html.title || '';
 $('.modal-h', m).appendChild(makeEl('<button class="chip x" style="font-size:15px">✕</button>')).addEventListener('click', close);
 $('.modal-b', m).innerHTML = html.body || '';
 var f = $('.modal-f', m);
 (footerBtns || []).forEach(function (b) {
 var btn = makeEl('<button class="btn ' + (b.cls || '') + '">' + b.label + '</button>');
 btn.addEventListener('click', function () { b.onClick && b.onClick(close); });
 f.appendChild(btn);
 });
 root.appendChild(mask);
 return { close: close, mask: mask, body: $('.modal-b', m) };
 }

 function makeEl(html) {
 var t = document.createElement('template');
 t.innerHTML = html.trim();
 return t.content.firstChild;
 }

 function confirmDlg(title, body, onOk) {
 modal({ title: title, body: body }, [
 { label: '取消', cls: 'ghost2', onClick: function (c) { c(); } },
 { label: '确定', cls: 'danger', onClick: function (c) { c(); onOk && onOk(); } }
 ]);
 }

 /* ---------- nav ---------- */
 function showView(name) {
 $$('.nav-item').forEach(function (n) { n.classList.toggle('active', n.dataset.view === name); });
 $$('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + name); });
 var meta = VIEWS[name];
 $('#viewTitle').textContent = meta[0];
 $('#viewSub').textContent = meta[1];
 var actions = $('#topbar-actions');
 actions.innerHTML = '';
 if (name === 'profile') {
 actions.appendChild(btn(' 填入示例数据', 'primary sm', function () { loadSample(); }));
 actions.appendChild(btn('清空', 'danger sm', function () {
 confirmDlg('清空全部资料', '将删除本机保存的所有资料与已生成简历，确定继续吗？', function () {
 D.store.clear();
 location.reload();
 });
 }));
 }
 if (name === 'generate') {
 actions.appendChild(btn(' 一键生成', 'primary', runGenerate));
 }
 if (name === 'preview') {
 actions.appendChild(btn(' 打印 / 导出 PDF', 'primary sm', function () { window.print(); }));
 actions.appendChild(btn(' 复制文本', 'ghost2 sm', copyResumeText));
 actions.appendChild(btn(' .doc', 'ghost2 sm', downloadResumeDoc));
 actions.appendChild(btn(' JSON', 'ghost2 sm', downloadResumeJSON));
 actions.appendChild(btn(' .md', 'ghost2 sm', downloadResumeMD));
 }
 renderers[name]();
 }

 function btn(label, cls, cb) {
 var b = makeEl('<button class="btn ' + (cls || '') + '">' + label + '</button>');
 b.addEventListener('click', cb);
 return b;
 }

 /* ---------- field helpers ---------- */
 function fld(label, inner, hint) {
 return '<div class="field"><label>' + label + '</label>' + inner + (hint ? '<span style="font-size:11px;color:var(--text-3)">' + hint + '</span>' : '') + '</div>';
 }

 var BULLET_TAGS = [['duty', '职责'], ['achievement', '成果'], ['data', '数据']];
 function tagName(t) { var x = BULLET_TAGS.filter(function (b) { return b[0] === t; }); return x.length ? x[1] : '职责'; }

 /* ---------- renderers ---------- */
 var renderers = {
 profile: renderProfile,
 jd: renderJD,
 generate: renderGenerate,
 preview: renderPreview
 };

 /* ============ PROFILE VIEW ============ */
 function renderProfile() {
 var v = $('#view-profile');
 v.innerHTML = '';

 var basic = '<div class="card"><div class="card-title"> 基本信息</div><div class="grid c4">' +
 fld('姓名', '<input class="inp" data-path="profile.name" value="' + D.esc(state.profile.name) + '">') +
 fld('电话', '<input class="inp" data-path="profile.phone" value="' + D.esc(state.profile.phone) + '">') +
 fld('邮箱', '<input class="inp" data-path="profile.email" value="' + D.esc(state.profile.email) + '">') +
 fld('城市', '<input class="inp" data-path="profile.city" value="' + D.esc(state.profile.city) + '">') +
 fld('意向岗位', '<input class="inp" data-path="profile.targetPosition" value="' + D.esc(state.profile.targetPosition) + '">') +
 fld('期望薪资', '<input class="inp" data-path="profile.targetSalary" placeholder="如 25-35K·14薪" value="' + D.esc(state.profile.targetSalary) + '">') +
 '</div></div>';
 v.insertAdjacentHTML('beforeend', basic);

 var sum = '<div class="card"><div class="card-title"> 自我评价 <span class="t-sub">生成时会结合 JD 自动强化匹配点</span></div>' +
 '<textarea class="txa" data-path="summary" placeholder="一句话介绍自己的核心优势（年限、领域、最擅长的 2-3 件事）" rows="3">' + D.esc(state.summary) + '</textarea></div>';
 v.insertAdjacentHTML('beforeend', sum);

 v.insertAdjacentHTML('beforeend', '<div class="card"><div class="card-title"> 教育经历</div><div id="edu-list"></div>' +
 '<button class="btn ghost2 sm" id="addEdu">＋ 添加教育经历</button></div>');
 renderEduList();

 v.insertAdjacentHTML('beforeend', '<div class="card"><div class="card-title"> 工作经历 <span class="t-sub">尽量多写细节，生成的简历会按 JD 自动筛选与侧重</span></div><div id="work-list"></div>' +
 '<button class="btn primary sm" id="addWork">＋ 添加一段工作经历</button></div>');
 renderWorkList();

 v.insertAdjacentHTML('beforeend', '<div class="card"><div class="card-title"> 项目经历 <span class="t-sub">可选，重要项目单独呈现</span></div><div id="proj-list"></div>' +
 '<button class="btn ghost2 sm" id="addProj">＋ 添加项目经历</button></div>');
 renderProjList();

 var skills = '<div class="card"><div class="card-title"> 技能标签 <span class="t-sub">用「逗号 / 顿号 / 空格」分隔</span></div>' +
 '<input class="inp" id="skillsInput" placeholder="如：需求分析, SQL, A/B 测试, 项目管理" value="' + D.esc(state.skills.join(', ')) + '">' +
 '<div class="card-note" style="margin-top:10px">生成简历时：与 JD 匹配的技能会<b style="color:var(--accent)">置顶并高亮</b>，未覆盖 JD 要求会提示缺口。</div></div>';
 v.insertAdjacentHTML('beforeend', skills);

 $('#addEdu').addEventListener('click', function () { state.education.push({ id: D.uid(), school: '', degree: '', major: '', start: '', end: '', note: '' }); D.save(); renderEduList(); });
 $('#addWork').addEventListener('click', function () { state.work.push({ id: D.uid(), company: '', title: '', industry: '', start: '', end: '', bullets: [{ id: D.uid(), tag: 'duty', text: '', evidence: '', boundary: '', status: 'confirmed' }] }); D.save(); renderWorkList(); });
 $('#addProj').addEventListener('click', function () { state.projects.push({ id: D.uid(), name: '', role: '', start: '', end: '', desc: '', bullets: [''] }); D.save(); renderProjList(); });

 bindPaths(v);
 $('#skillsInput').addEventListener('input', function () {
 state.skills = this.value.split(/[,，、\s/]+/).map(function (s) { return s.trim(); }).filter(Boolean);
 D.save(); markDirty();
 });
 }

 function bindPaths(root) {
 $$('[data-path]', root).forEach(function (el) {
 var path = el.dataset.path;
 el.addEventListener('input', function () {
 setPath(path, el.value);
 markDirty();
 });
 });
 }

 function setPath(path, value) {
 var parts = path.split('.');
 var o = state;
 for (var i = 0; i < parts.length - 1; i++) o = o[parts[i]];
 o[parts[parts.length - 1]] = value;
 D.save();
 }

 function renderEduList() {
 var box = $('#edu-list');
 if (!box) return;
 box.innerHTML = state.education.map(function (e, i) {
 return '<div class="entry"><div class="entry-head"><span class="e-title">教育经历 ' + (i + 1) + '</span>' +
 '<button class="btn danger sm" data-rm="' + i + '">删除</button></div>' +
 '<div class="grid c4">' +
 fld('学校', '<input class="inp" data-e="' + i + '" data-f="school" value="' + D.esc(e.school) + '">') +
 fld('学历', '<input class="inp" data-e="' + i + '" data-f="degree" placeholder="本科/硕士" value="' + D.esc(e.degree) + '">') +
 fld('专业', '<input class="inp" data-e="' + i + '" data-f="major" value="' + D.esc(e.major) + '">') +
 fld('时间段', '<div class="grid c2"><input type="month" class="inp" data-e="' + i + '" data-f="start" value="' + D.esc(e.start) + '"><input type="month" class="inp" data-e="' + i + '" data-f="end" value="' + D.esc(e.end) + '"></div>') +
 '</div></div>';
 }).join('');
 bindListInputs(box, 'education');
 $$('[data-rm]', box).forEach(function (b) {
 b.addEventListener('click', function () { state.education.splice(D.num(b.dataset.rm), 1); D.save(); renderEduList(); markDirty(); });
 });
 }

 function renderWorkList() {
 var box = $('#work-list');
 if (!box) return;
 box.innerHTML = state.work.map(function (w, i) {
 var endVal = (w.end && w.end !== '至今') ? w.end : '';
 var isNow = !w.end || w.end === '至今';
 var bullets = (w.bullets || []).map(function (b, bi) {
 var statusOpts = [['confirmed', '已确认'], ['pending', '待确认'], ['rejected', '不采用']];
 return '<div class="bullet-row">' +
 '<textarea class="txa" data-wi="' + i + '" data-bi="' + bi + '" placeholder="写一段具体职责或成果：动词开头 + 做法 + 量化结果" rows="2">' + D.esc(b.text) + '</textarea>' +
 '<select class="sel" data-wt="' + i + '" data-bi="' + bi + '">' + BULLET_TAGS.map(function (t) {
 return '<option value="' + t[0] + '"' + ((b.tag || 'duty') === t[0] ? ' selected' : '') + '>' + t[1] + '</option>';
 }).join('') + '</select></div>' +
 '<div class="ledger-grid">' +
 fld('证据 / 出处', '<input class="inp" data-le="' + i + '" data-bi="' + bi + '" placeholder="链接、截图、报表、材料名…" value="' + D.esc(b.evidence || '') + '">') +
 fld('边界', '<input class="inp" data-lb="' + i + '" data-bi="' + bi + '" placeholder="团队成果注明个人贡献" value="' + D.esc(b.boundary || '') + '">') +
 fld('核验状态', '<select class="sel" data-ls="' + i + '" data-bi="' + bi + '">' + statusOpts.map(function (s) {
 return '<option value="' + s[0] + '"' + ((b.status || 'confirmed') === s[0] ? ' selected' : '') + '>' + s[1] + '</option>';
 }).join('') + '</select>') +
 '</div>';
 }).join('');
 return '<div class="entry"><div class="entry-head"><span class="e-title">' + D.esc(w.company || '（未填写公司）') + '</span>' +
 '<button class="btn danger sm" data-wrm="' + i + '">删除</button></div>' +
 '<div class="grid c4">' +
 fld('公司', '<input class="inp" data-w="' + i + '" data-f="company" value="' + D.esc(w.company) + '">') +
 fld('职位', '<input class="inp" data-w="' + i + '" data-f="title" value="' + D.esc(w.title) + '">') +
 fld('行业', '<input class="inp" data-w="' + i + '" data-f="industry" placeholder="如 B端SaaS" value="' + D.esc(w.industry) + '">') +
 fld('时间段', '<div class="grid" style="grid-template-columns:1fr 1fr auto;align-items:end">' +
 '<input type="month" class="inp" data-w="' + i + '" data-f="start" value="' + D.esc(w.start) + '">' +
 '<input type="month" class="inp" data-w="' + i + '" data-f="end" value="' + D.esc(endVal) + '" ' + (isNow ? 'disabled' : '') + '>' +
 '<label style="font-size:11.5px;white-space:nowrap;color:var(--text-2)"><input type="checkbox" data-now="' + i + '"' + (isNow ? ' checked' : '') + '> 至今</label></div>') +
 '</div>' +
 '<div class="card-title" style="font-size:13px;margin:10px 0 8px">要点（按 JD 筛选，越具体越好）</div>' +
 bullets +
 '<button class="btn ghost2 sm" data-addb="' + i + '">＋ 添加要点</button></div>';
 }).join('');

 $$('[data-wrm]', box).forEach(function (b) {
 b.addEventListener('click', function () { state.work.splice(D.num(b.dataset.wrm), 1); D.save(); renderWorkList(); markDirty(); });
 });
 $$('[data-addb]', box).forEach(function (b) {
 b.addEventListener('click', function () {
 var w = state.work[D.num(b.dataset.addb)];
 w.bullets.push({ id: D.uid(), tag: 'duty', text: '', evidence: '', boundary: '', status: 'confirmed' });
 D.save(); renderWorkList(); markDirty();
 });
 });
 bindListInputs(box, 'work');
 bindBulletInputs(box);
 $$('[data-now]', box).forEach(function (cb) {
 cb.addEventListener('change', function () {
 var w = state.work[D.num(cb.dataset.now)];
 w.end = cb.checked ? '至今' : '';
 D.save(); renderWorkList(); markDirty();
 });
 });
 }

 function renderProjList() {
 var box = $('#proj-list');
 if (!box) return;
 box.innerHTML = state.projects.map(function (p, i) {
 var bullets = (p.bullets || []).map(function (b, bi) {
 return '<div class="bullet-row"><textarea class="txa" data-pi="' + i + '" data-bi="' + bi + '" placeholder="项目要点" rows="2">' + D.esc(b) + '</textarea></div>';
 }).join('');
 return '<div class="entry"><div class="entry-head"><span class="e-title">' + D.esc(p.name || '（未命名项目）') + '</span>' +
 '<button class="btn danger sm" data-prm="' + i + '">删除</button></div>' +
 '<div class="grid c3">' +
 fld('项目名称', '<input class="inp" data-p="' + i + '" data-f="name" value="' + D.esc(p.name) + '">') +
 fld('担任角色', '<input class="inp" data-p="' + i + '" data-f="role" value="' + D.esc(p.role) + '">') +
 fld('时间段', '<div class="grid c2"><input type="month" class="inp" data-p="' + i + '" data-f="start" value="' + D.esc(p.start) + '"><input type="month" class="inp" data-p="' + i + '" data-f="end" value="' + D.esc(p.end) + '"></div>') +
 '</div>' +
 fld('一句话简介', '<input class="inp" data-p="' + i + '" data-f="desc" value="' + D.esc(p.desc) + '">') +
 bullets +
 '<button class="btn ghost2 sm" data-addp="' + i + '">＋ 添加要点</button></div>';
 }).join('');
 $$('[data-prm]', box).forEach(function (b) {
 b.addEventListener('click', function () { state.projects.splice(D.num(b.dataset.prm), 1); D.save(); renderProjList(); markDirty(); });
 });
 $$('[data-addp]', box).forEach(function (b) {
 b.addEventListener('click', function () { state.projects[D.num(b.dataset.addp)].bullets.push(''); D.save(); renderProjList(); markDirty(); });
 });
 bindListInputs(box, 'projects');
 $$('[data-pi]', box).forEach(function (ta) {
 ta.addEventListener('input', function () {
 state.projects[D.num(ta.dataset.pi)].bullets[D.num(ta.dataset.bi)] = ta.value;
 D.save(); markDirty();
 });
 });
 }

 function bindListInputs(box, kind) {
 var key = kind === 'education' ? 'e' : (kind === 'work' ? 'w' : 'p');
 $$('[data-' + key + ']', box).forEach(function (inp) {
 inp.addEventListener('input', function () {
 var item = state[kind][D.num(inp.dataset[key])];
 item[inp.dataset.f] = inp.value;
 D.save(); markDirty();
 });
 });
 }

 function bindBulletInputs(box) {
 $$('[data-wi]', box).forEach(function (ta) {
 ta.addEventListener('input', function () {
 state.work[D.num(ta.dataset.wi)].bullets[D.num(ta.dataset.bi)].text = ta.value;
 D.save(); markDirty();
 });
 });
 $$('[data-wt]', box).forEach(function (sel) {
 sel.addEventListener('change', function () {
 state.work[D.num(sel.dataset.wt)].bullets[D.num(sel.dataset.bi)].tag = sel.value;
 D.save();
 });
 });
 // 证据账本字段：证据/出处、边界、核验状态
 $$('[data-le]', box).forEach(function (inp) {
 inp.addEventListener('input', function () {
 state.work[D.num(inp.dataset.le)].bullets[D.num(inp.dataset.bi)].evidence = inp.value;
 D.save(); markDirty();
 });
 });
 $$('[data-lb]', box).forEach(function (inp) {
 inp.addEventListener('input', function () {
 state.work[D.num(inp.dataset.lb)].bullets[D.num(inp.dataset.bi)].boundary = inp.value;
 D.save(); markDirty();
 });
 });
 $$('[data-ls]', box).forEach(function (sel) {
 sel.addEventListener('change', function () {
 state.work[D.num(sel.dataset.ls)].bullets[D.num(sel.dataset.bi)].status = sel.value;
 D.save(); markDirty();
 });
 });
 }

 function loadSample() {
 confirmDlg('填入示例数据', '会用一份「产品经理」示例资料（含 3 段工作经历 + 示例 JD）覆盖当前内容，方便直接体验全流程。确定？', function () {
 var s = D.sampleState();
 state.profile = s.profile; state.summary = s.summary; state.education = s.education;
 state.work = s.work; state.projects = s.projects; state.skills = s.skills;
 state.jds = s.jds; state.jd = s.jd; state.generated = null;
 D.save();
 toast('已填入示例数据，接下来去「JD 输入」看看解析效果', 'ok');
 showView('jd');
 });
 }

 /* ============ JD VIEW ============ */
 function renderJD() {
 var v = $('#view-jd');
 var analyzed = state.jd.analyzed;
 var raw = state.jd.raw;
 var corpus = KW.buildCorpus(state.profile, state.work, state.projects, state.education, state.skills, state.summary);
 var coverage = analyzed ? KW.computeCoverage(analyzed, corpus) : null;

 // ---- JD 档案栏 ----
 var STAGES = [['', '未投递'], ['applied', '已投递'], ['interview', '面试中'], ['offer', 'Offer'], ['rejected', '已拒绝']];
 var funnel = { applied: 0, interview: 0, offer: 0, rejected: 0, plan: 0 };
 state.jds.forEach(function (j) {
 var k = j.stage && funnel[j.stage] != null ? j.stage : 'plan';
 funnel[k] = (funnel[k] || 0) + 1;
 });
 var chips = state.jds.map(function (j, i) {
 var label = D.jdLabel(j, i);
 var hasResume = j.generated ? '<span style="font-size:10px;opacity:.8"></span> ' : '';
 var stageMark = j.stage === 'offer' ? ' ' : (j.stage === 'interview' ? ' ' : (j.stage === 'rejected' ? ' ' : (j.stage === 'applied' ? ' ' : '')));
 return '<button class="chip' + (j.id === state.jd.id ? '' : ' flat') + '" data-jd="' + j.id + '" style="cursor:pointer;padding:5px 12px">' + hasResume + D.esc(label) + stageMark + '</button>';
 }).join('');
 var stageOpts = STAGES.map(function (s) {
 return '<option value="' + s[0] + '"' + ((state.jd.stage || '') === s[0] ? ' selected' : '') + '>' + s[1] + '</option>';
 }).join('');
 var archiveCard = '<div class="card"><div class="card-title"> JD 档案 · 投递追踪 <span class="t-sub">每份 JD 独立保存分析与定制简历</span>' +
 '<span class="spacer"></span><button class="btn primary sm" id="btnNewJd">＋ 新建 JD</button></div>' +
 '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px">' + (chips || '<span style="font-size:12px;color:var(--text-3)">暂无档案</span>') +
 '<span style="font-size:11px;color:var(--text-3);margin-left:auto">漏斗：未投递 ' + funnel.plan + ' · 已投递 ' + funnel.applied + ' · 面试中 ' + funnel.interview + ' · Offer ' + funnel.offer + ' · 拒绝 ' + funnel.rejected + '</span></div>' +
 '<div class="grid c3">' +
 fld('当前 JD 名称', '<input class="inp" id="jdName" value="' + D.esc(state.jd.name || '') + '" placeholder="如：高级产品经理（字节跳动）">') +
 fld('公司', '<input class="inp" id="jdCompany" value="' + D.esc(state.jd.company || '') + '" placeholder="投递的公司">') +
 fld('投递阶段', '<select class="sel" id="jdStage">' + stageOpts + '</select>') +
 fld('投递日期', '<input type="date" class="inp" id="jdApplied" value="' + D.esc(state.jd.appliedAt || '') + '">') +
 fld('创建时间', '<input class="inp" value="' + D.esc(state.jd.createdAt || '') + '" disabled>') +
 fld('该 JD 简历', '<input class="inp" value="' + (state.jd.generated ? '已生成 · 匹配分 ' + (state.jd.generated.ats ? state.jd.generated.ats.score : state.jd.generated.coverage.rate) : '尚未生成') + '" disabled>') +
 '</div>' +
 fld('备注', '<input class="inp" id="jdNote" placeholder="投递渠道 / 联系人 / 下一步…" value="' + D.esc(state.jd.note || '') + '">') +
 (state.jds.length > 1 ? '<div style="margin-top:10px"><button class="btn danger sm" id="btnDelJd"> 删除当前 JD</button></div>' : '') +
 '</div>';

 var left = '<div class="card"><div class="card-title"> 岗位描述（JD）<span class="t-sub">支持中英文，可整段粘贴</span></div>' +
 '<textarea id="jdInput" class="txa mono" rows="14" placeholder="粘贴完整的 JD 文本…">' + D.esc(raw) + '</textarea>' +
 '<div style="display:flex;gap:8px;margin-top:12px">' +
 '<button class="btn primary" id="btnAnalyze"> 分析 JD</button>' +
 '<button class="btn success" id="btnGoGen"> 去生成简历</button></div></div>';

 var right = '<div class="card"><div class="card-title"> 解析结果</div><div id="jdResult">' +
 (analyzed ? jdResultHTML(analyzed, coverage) : '<div class="card-note">粘贴 JD 后点击「分析 JD」，这里会展示：目标岗位、高频关键词、职责清单、要求清单，以及<b>你当前资料对 JD 的覆盖度</b>。</div>') +
 '</div></div>';

 v.innerHTML = archiveCard + '<div class="jd-layout">' + left + right + '</div>';

 $('#jdInput').addEventListener('input', D.debounce(function () {
 state.jd.raw = this.value; D.save();
 }, 300));
 $('#jdName').addEventListener('input', D.debounce(function () {
 D.renameJd(state.jd.id, this.value);
 D.save();
 // 就地更新档案 chip，避免整页重渲染导致输入框丢焦点
 var activeChip = $('#view-jd').querySelector('[data-jd="' + state.jd.id + '"]');
 if (activeChip) activeChip.textContent = (state.jd.generated ? ' ' : '') + (this.value.trim() || D.jdLabel(state.jd));
 }, 400));
 // 投递追踪字段
 $('#jdCompany').addEventListener('input', D.debounce(function () { state.jd.company = this.value; D.save(); }, 300));
 $('#jdNote').addEventListener('input', D.debounce(function () { state.jd.note = this.value; D.save(); }, 300));
 $('#jdApplied').addEventListener('change', function () { state.jd.appliedAt = this.value; D.save(); toast('已记录投递日期', 'ok'); });
 $('#jdStage').addEventListener('change', function () {
 state.jd.stage = this.value; D.save();
 var mark = { offer: ' ', interview: ' ', rejected: ' ', applied: ' ', '': '' };
 var activeChip = $('#view-jd').querySelector('[data-jd="' + state.jd.id + '"]');
 if (activeChip) {
 var base = activeChip.textContent.replace(/ []$/, '');
 activeChip.textContent = base + (mark[this.value] || '');
 }
 toast('已更新投递阶段', 'ok');
 });
 $('#btnNewJd').addEventListener('click', function () {
 D.addJd('');
 toast('已新建 JD，粘贴岗位描述后即可分析', 'ok');
 renderJD();
 $('#jdInput').focus();
 });
 var delBtn = $('#btnDelJd');
 if (delBtn) delBtn.addEventListener('click', function () {
 confirmDlg('删除当前 JD', '将删除「' + D.esc(D.jdLabel(state.jd)) + '」的分析结果与其定制简历（资料库不受影响）。确定？', function () {
 D.removeJd(state.jd.id);
 toast('已删除', 'ok');
 renderJD();
 });
 });
 $$('[data-jd]', v).forEach(function (chip) {
 chip.addEventListener('click', function () {
 if (chip.dataset.jd !== state.jd.id) {
 D.switchJd(chip.dataset.jd);
 renderJD();
 }
 });
 });
 $('#btnAnalyze').addEventListener('click', function () {
 analyzeNow();
 });
 $('#btnGoGen').addEventListener('click', function () {
 analyzeNow(true);
 });
 }

 function analyzeNow(goGen) {
 if (!state.jd.raw.trim()) { toast('请先粘贴 JD 文本', 'err'); return; }
 state.jd.analyzed = KW.analyzeJD(state.jd.raw);
 if (!state.jd.name && state.jd.analyzed.guess) {
 state.jd.name = state.jd.analyzed.guess;
 }
 D.save();
 toast('JD 解析完成', 'ok');
 renderJD();
 if (goGen) showView('generate');
 else {
 // scroll to result
 var r = $('#jdResult');
 if (r) r.scrollIntoView({ behavior: 'smooth', block: 'center' });
 }
 }

 function jdResultHTML(analyzed, coverage) {
 var html = '';
 if (analyzed.guess) {
 html += '<div style="margin-bottom:12px"><span class="chip"> 目标岗位：' + D.esc(analyzed.guess) + '</span></div>';
 }
 var top = analyzed.terms.slice(0, 14);
 if (top.length) {
 var maxC = Math.max.apply(null, top.map(function (t) { return t.count; }));
 html += '<div class="card-title" style="font-size:13px">高频关键词</div><div>';
 html += top.map(function (t) {
 return '<div class="kw-row"><span class="kw-name">' + D.esc(t.term) + '</span><div class="kw-bar"><i style="width:' + Math.round(t.count / maxC * 100) + '%"></i></div><span class="kw-n">' + t.count + '</span></div>';
 }).join('');
 html += '</div>';
 }
 if (coverage) {
 var rate = coverage.rate;
 var rateCls = rate >= 60 ? 'ok' : (rate >= 35 ? 'warn' : '');
 html += '<div class="card-title" style="font-size:13px;margin-top:14px">你的资料覆盖度</div>';
 html += '<div class="stat-mini ' + rateCls + '" style="margin-bottom:8px"><div class="v">' + rate + '%</div><div class="l">覆盖 ' + coverage.matched.length + ' / ' + coverage.terms.length + ' 个 JD 关键词</div></div>';
 html += '<div class="progress-wrap" style="margin-bottom:10px"><i style="width:' + rate + '%"></i></div>';
 if (coverage.gap.length) {
 html += '<div style="font-size:11.5px;color:var(--text-3);margin-bottom:4px">资料中缺失的 JD 关键词（可去资料库补充）：</div><div style="display:flex;flex-wrap:wrap;gap:5px">' +
 coverage.gap.slice(0, 12).map(function (t) { return '<span class="chip gap">' + D.esc(t.term) + '</span>'; }).join('') + '</div>';
 }
 }
 if (analyzed.duties.length) {
 html += '<div class="card-title" style="font-size:13px;margin-top:14px">职责要点（' + analyzed.duties.length + '）</div><ul style="font-size:12.5px;color:var(--text-2);padding-left:16px">';
 html += analyzed.duties.slice(0, 8).map(function (s) { return '<li style="margin-bottom:4px">' + D.esc(s) + '</li>'; }).join('');
 html += '</ul>';
 }
 if (analyzed.reqs.length) {
 html += '<div class="card-title" style="font-size:13px;margin-top:14px">任职要求（' + analyzed.reqs.length + '）</div><ul style="font-size:12.5px;color:var(--text-2);padding-left:16px">';
 html += analyzed.reqs.slice(0, 8).map(function (s) { return '<li style="margin-bottom:4px">' + D.esc(s) + '</li>'; }).join('');
 html += '</ul>';
 }
 return html;
 }

 /* ============ GENERATE VIEW ============ */
 function renderGenerate() {
 var v = $('#view-generate');
 var s = state.settings;
 var st = state;
 var analyzed = st.jd.analyzed;

 var html = '';
 if (!st.jd.raw.trim()) {
 html += '<div class="empty"><div class="big"></div><h3>还没有 JD</h3><p>先生成一份定制简历，需要先粘贴目标岗位的 JD。</p></div>';
 v.innerHTML = html;
 var btn = makeEl('<button class="btn primary">去粘贴 JD</button>');
 btn.addEventListener('click', function () { showView('jd'); });
 $('.empty', v).appendChild(btn);
 return;
 }
 if (!st.work.length && !st.projects.length) {
 html += '<div class="empty"><div class="big"></div><h3>资料库还是空的</h3><p>先在「资料库」录入工作经历，或直接填入示例数据体验。</p></div>';
 v.innerHTML = html;
 var b2 = makeEl('<button class="btn primary">去填写资料</button>');
 b2.addEventListener('click', function () { showView('profile'); });
 $('.empty', v).appendChild(b2);
 return;
 }

 html += '<div class="card" style="padding:12px 16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
 '<span class="chip"> 当前 JD：' + D.esc(D.jdLabel(st.jd)) + '</span>' +
 '<span style="font-size:12px;color:var(--text-3)">已解析关键词 ' + (st.jd.analyzed ? st.jd.analyzed.terms.length : 0) + ' 个 · ' + (st.jd.generated ? '已有定制简历（覆盖度 ' + st.jd.generated.coverage.rate + '%）' : '尚未生成') + '</span>' +
 '<span class="spacer" style="flex:1"></span><button class="btn ghost2 sm" id="genSwitchJd"> 管理 JD 档案</button></div>';

 html += '<div class="card"><div class="card-title"> 适配模式</div><div class="opt-row">' +
 '<div class="seg" id="modeSeg">' +
 '<button data-m="local"' + (s.mode === 'local' ? ' class="on"' : '') + '> 本地智能（免费）</button>' +
 '<button data-m="llm"' + (s.mode === 'llm' ? ' class="on"' : '') + '> LLM 深度改写</button></div>' +
 '<span style="font-size:12px;color:var(--text-3)">本地：按 JD 关键词筛选、排序、标注，全程离线；LLM：在本地基础上用大模型重写表达，质量更高。</span></div>' +
 (s.mode === 'llm' && !s.llm.apiKey ? '<div style="margin-top:10px;font-size:12.5px;color:var(--warn)">⚠ 尚未配置 API Key，点击左下角「LLM 设置」填写后即可使用。</div>' : '') +
 '</div>';

 html += '<div class="card"><div class="card-title"> 简历排版 <span class="t-sub">默认「简介 · 宽排版」</span></div><div class="opt-row">' +
 '<div class="seg" id="styleSeg">' +
 '<button data-s="wide"' + (s.style === 'wide' ? ' class="on"' : '') + '>简介 · 宽排版（默认）</button>' +
 '<button data-s="classic"' + (s.style === 'classic' ? ' class="on"' : '') + '>经典标准</button>' +
 '<button data-s="modern"' + (s.style === 'modern' ? ' class="on"' : '') + '>现代侧栏</button>' +
 '<button data-s="dachang"' + (s.style === 'dachang' ? ' class="on"' : '') + '>大厂极简</button>' +
 '<button data-s="kendall"' + (s.style === 'kendall' ? ' class="on"' : '') + '>蓝调时间轴</button>' +
 '<button data-s="macchiato"' + (s.style === 'macchiato' ? ' class="on"' : '') + '>双栏咖啡风</button></div></div>' +
 '<div class="opt-row" style="margin-top:12px">' +
 '<div class="seg" id="detailSeg">' +
 '<button data-d="concise"' + (s.detail === 'concise' ? ' class="on"' : '') + '>简介（一页）</button>' +
 '<button data-d="full"' + (s.detail === 'full' ? ' class="on"' : '') + '>详细（多页）</button></div>' +
 '<div class="range-row" style="flex:1;min-width:240px"><label style="font-size:12px;color:var(--text-2)">每段经历要点数</label>' +
 '<input type="range" id="maxB" min="2" max="6" step="1" value="' + s.maxBullets + '"><span id="maxBv" style="font-size:13px;font-weight:700">' + s.maxBullets + '</span></div></div></div>';

 html += '<div class="card"><div class="card-title"> 固定语法 <span class="t-sub">生成时的要点句式规范（来自 ASu 经历酥化方法论）</span></div><div class="opt-row">' +
 '<div class="seg" id="grammarSeg">' +
 '<button data-g="standard"' + (s.grammar !== 'asu' ? ' class="on"' : '') + '>标准三要素</button>' +
 '<button data-g="asu"' + (s.grammar === 'asu' ? ' class="on"' : '') + '>ASu 五段式</button></div>' +
 '<span style="font-size:12px;color:var(--text-3)">' +
 (s.grammar === 'asu'
 ? '「动作 → 系统能力 → 业务价值 → 结果证据 → 个人边界」：LLM 模式强制按此句式重写，本地模式按此检查'
 : '「动作动词开头 → 具体做法 → 量化结果」：LLM 模式强制按此句式重写，本地模式按此检查') + '</span></div>' +
 '<div class="card-note" style="margin-bottom:0">生成后会显示<b>语法合规度</b>：以动作动词开头、≤80 字、含结果/价值描述。不合规的要点会逐条列出原因。</div></div>';

 html += '<div class="card"><div class="card-title"> 定制参数</div><div class="grid c2">' +
 fld('目标岗位（覆盖 JD 解析结果）', '<input class="inp" id="genPos" value="' + D.esc(analyzed && analyzed.guess ? analyzed.guess : st.profile.targetPosition) + '">') +
 fld('JD 覆盖度（生成前参考）', '<div class="progress-wrap" style="margin-top:9px"><i style="width:' + quickRate() + '%"></i></div><span style="font-size:11.5px;color:var(--text-3)">' + quickRate() + '% 关键词已能在你的资料中找到</span>') +
 '</div></div>';

 html += '<div class="card"><button class="btn primary" id="btnGen" style="width:100%;padding:12px"> 一键生成定制简历</button>' +
 '<div class="card-note" style="margin-top:10px;margin-bottom:0">生成逻辑：解析 JD 关键词 → 逐条工作要点与 JD 匹配打分 → 按岗位相关性排序筛选（不采用的主张自动剔除）→ 匹配词高亮标注 → 固定语法检查/重写 → 自我评价与技能排序。</div></div>';

 html += '<div id="genResult"></div>';
 v.innerHTML = html;

 bindSeg('#modeSeg', 'm', 'mode');
 bindSeg('#styleSeg', 's', 'style');
 bindSeg('#detailSeg', 'd', 'detail');
 bindSeg('#grammarSeg', 'g', 'grammar');
 $('#maxB').addEventListener('input', function () {
 s.maxBullets = D.num(this.value);
 $('#maxBv').textContent = this.value;
 D.save();
 });
 $('#genPos').addEventListener('input', function () { s.genPos = this.value; D.save(); });
 $('#btnGen').addEventListener('click', runGenerate);
 var gsw = $('#genSwitchJd');
 if (gsw) gsw.addEventListener('click', function () { showView('jd'); });

 if (st.generated) renderGenResult(st.generated);
 }

 function quickRate() {
 var st = state;
 if (!st.jd.analyzed) return 0;
 var corpus = KW.buildCorpus(st.profile, st.work, st.projects, st.education, st.skills, st.summary);
 return KW.computeCoverage(st.jd.analyzed, corpus).rate;
 }

 function bindSeg(sel, attr, settingKey, refresh) {
 refresh = refresh || renderGenerate;
 $$(sel + ' button').forEach(function (b) {
 b.addEventListener('click', function () {
 $$(sel + ' button').forEach(function (x) { x.classList.remove('on'); });
 b.classList.add('on');
 state.settings[settingKey] = b.dataset[attr];
 D.save();
 refresh();
 });
 });
 }

 function renderGenResult(model) {
 var box = $('#genResult');
 if (!box) return;
 var rate = model.coverage.rate;
 var rateCls = rate >= 60 ? 'ok' : (rate >= 35 ? 'warn' : '');
 var gRate = model.grammar ? model.grammar.rate : 100;
 var gCls = gRate >= 80 ? 'ok' : (gRate >= 50 ? 'warn' : '');
 var ats = model.ats || { score: rate, keywords: rate, duties: 0, verdict: '' };
 var atsCls = ats.score >= 80 ? 'ok' : (ats.score >= 55 ? 'warn' : '');
 var lg = model.ledger || { confirmed: 0, pending: [], noEvidence: [], strong: [], rejectedSkipped: 0 };
 var html = '<div class="card"><div class="card-title"> 生成完成 <span class="t-sub">' + model.meta.generatedAt + ' · ' + (model.meta.mode === 'llm' ? 'LLM 深度改写' : '本地智能适配') + (model.meta.grammarPreset === 'asu' ? ' · ASu 五段式' : ' · 标准三要素') + '</span></div>';
 html += '<div class="stat-row">' +
 '<div class="stat-mini ' + atsCls + '"><div class="v">' + ats.score + '</div><div class="l">职位匹配分（ATS）' + (ats.verdict ? ' · ' + ats.verdict : '') + '</div></div>' +
 '<div class="stat-mini ' + rateCls + '"><div class="v">' + rate + '%</div><div class="l">JD 关键词覆盖率</div></div>' +
 '<div class="stat-mini ' + gCls + '"><div class="v">' + gRate + '%</div><div class="l">要点语法合规度</div></div>' +
 '<div class="stat-mini' + (lg.pending.length ? ' warn' : ' ok') + '"><div class="v">' + lg.confirmed + ' / ' + lg.pending.length + '</div><div class="l">已确认 / 待确认主张</div></div></div>';
 if (model.meta.rejectedSkipped > 0) {
 html += '<div style="margin-top:10px;font-size:12px;color:var(--text-2)"> 已按账本规则剔除 <b>' + model.meta.rejectedSkipped + '</b> 条「不采用」的主张。</div>';
 }
 if (model.ownership && model.ownership.warnings && model.ownership.warnings.length) {
 html += '<div class="log-line" style="margin-top:10px"><span class="warn">⚠</span><div class="grammar-bad">' + model.ownership.warnings.map(D.esc).join('<br>') + '</div></div>';
 }
 if (model.grammar && model.grammar.issues && model.grammar.issues.length) {
 html += '<div class="card-title" style="font-size:13px;margin-top:12px"> 语法待改进（' + model.grammar.issues.length + ' 条）</div>';
 html += model.grammar.issues.slice(0, 5).map(function (it) {
 return '<div class="log-line"><span class="warn">✎</span><div><div>' + D.esc(it.text) + '</div><div class="grammar-bad">' + it.issues.map(D.esc).join(' · ') + '</div></div></div>';
 }).join('');
 }
 if (model.coverage.matched.length) {
 html += '<div class="card-title" style="font-size:13px;margin-top:12px">已命中的 JD 关键词（简历中将高亮）</div><div style="display:flex;flex-wrap:wrap;gap:5px">' +
 model.coverage.matched.map(function (t) { return '<span class="chip ok">' + D.esc(t) + '</span>'; }).join('') + '</div>';
 }
 if (model.gaps.length) {
 html += '<div class="card-title" style="font-size:13px;margin-top:12px">⚠ 资料缺口（' + model.gaps.length + '）</div><div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px">' +
 model.gaps.map(function (t) { return '<span class="chip gap">' + D.esc(t) + '</span>'; }).join('') + '</div>';
 if (model.gapSuggestions && model.gapSuggestions.length) {
 html += model.gapSuggestions.slice(0, 4).map(function (g) {
 return '<div class="log-line"><span class="ok"></span><div><b>' + D.esc(g.term) + '</b>：' + D.esc(g.suggestion) + '</div></div>';
 }).join('');
 }
 }
 html += '<div style="display:flex;gap:8px;margin-top:14px">' +
 '<button class="btn primary" id="genGoPreview"> 查看简历预览</button>' +
 '<button class="btn ghost2" id="genRegen"> 重新生成</button></div></div>';
 box.innerHTML = html;
 $('#genGoPreview').addEventListener('click', function () { showView('preview'); });
 $('#genRegen').addEventListener('click', runGenerate);
 }

 /* ============ GENERATION ============ */
 function runGenerate() {
 var st = state;
 if (!st.jd.raw.trim()) { toast('请先在「JD 输入」粘贴岗位描述', 'err'); showView('jd'); return; }
 if (!st.jd.analyzed) {
 st.jd.analyzed = KW.analyzeJD(st.jd.raw); D.save();
 }
 var posInput = $('#genPos');
 var position = posInput ? posInput.value.trim() : (st.settings.genPos || st.jd.analyzed.guess || '');
 var maxBullets = st.settings.detail === 'concise' ? Math.min(st.settings.maxBullets, 3) : st.settings.maxBullets;

 var btn = $('#btnGen');
 var orig = btn ? btn.innerHTML : '';
 if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span>正在生成…'; }

 var opts = { position: position, maxBullets: maxBullets, grammar: st.settings.grammar || 'standard' };

 function done() {
 if (btn) { btn.disabled = false; btn.innerHTML = orig; }
 }

 var p;
 if (st.settings.mode === 'llm') {
 var cfg = st.settings.llm;
 if (!cfg.apiKey) { toast('请先配置 LLM API Key（左下角「LLM 设置」）', 'err'); done(); return; }
 p = TailorLLM.llmTailor(st, opts, cfg);
 } else {
 p = Promise.resolve(TailorLocal.localTailor(st, opts));
 }

 p.then(function (model) {
 if (st.jd.generated) {
 st.jd.versions = st.jd.versions || [];
 st.jd.versions.push({ at: st.jd.generated.meta.generatedAt, model: st.jd.generated });
 if (st.jd.versions.length > 8) st.jd.versions.shift();
 }
 st.jd.generated = model;
 st.generated = model;
 st.generatedFp = fingerprint();
 D.save();
 done();
 toast(st.settings.mode === 'llm' ? 'LLM 改写完成' : '简历已生成', 'ok');
 renderGenResult(model);
 showView('preview');
 }).catch(function (e) {
 done();
 toast('生成失败：' + (e.message || e), 'err');
 });
 }

 function fingerprint() {
 var st = state;
 var s = [st.jd.id, st.profile.name, st.profile.targetPosition, st.summary,
 JSON.stringify(st.work), JSON.stringify(st.projects), JSON.stringify(st.education),
 JSON.stringify(st.skills), st.jd.raw, st.settings.style, st.settings.grammar].join('|');
 var h = 0;
 for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
 return h.toString(36);
 }

 /* ============ PREVIEW VIEW ============ */
 function renderPreview() {
 var v = $('#view-preview');
 if (!state.generated) {
 v.innerHTML = '<div class="empty"><div class="big"></div><h3>还没有生成简历</h3><p>在「生成简历」页选择模式与排版，一键生成针对 JD 定制的简历。</p></div>';
 var b = makeEl('<button class="btn primary">去生成</button>');
 b.addEventListener('click', function () { showView('generate'); });
 $('.empty', v).appendChild(b);
 return;
 }
 var model = state.generated;
 var stale = state.generatedFp && state.generatedFp !== fingerprint();
 var ats = model.ats || { score: model.coverage.rate, verdict: '' };
 var atsCls = ats.score >= 80 ? 'ok' : (ats.score >= 55 ? 'warn' : 'gap');

 var html = '';
 html += '<div class="card" style="padding:10px 16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
 '<span class="chip"> ' + D.esc(D.jdLabel(state.jd)) + '</span>' +
 '<span class="chip ' + atsCls + '">匹配分 ' + ats.score + (ats.verdict ? ' · ' + ats.verdict : '') + '</span>' +
 '<span style="font-size:12px;color:var(--text-3)">' + D.esc(state.jd.createdAt || '') + ' 创建</span>' +
 '<span class="spacer" style="flex:1"></span>' +
 '<button class="btn ghost2 sm" id="pvIntro"> HR 开场白</button>' +
 '<button class="btn ghost2 sm" id="pvInterview"> 面试预测</button>' +
 '<button class="btn ghost2 sm" id="pvSwitchJd"> 切换 JD</button></div>';
 if (stale) {
 html += '<div class="card" style="border-color:rgba(221,134,41,.4);background:#fef5e7"><div class="card-title">⚠ 资料或 JD 已变更</div>' +
 '<div style="display:flex;gap:8px"><button class="btn primary sm" id="pvRegen"> 按最新内容重新生成</button></div></div>';
 }

 // 版本历史
 var versions = state.jd.versions || [];
 if (versions.length) {
 var verChips = '<button class="ver-chip on" data-v="cur">当前版</button>';
 versions.slice().reverse().forEach(function (ver, idx) {
 verChips += '<button class="ver-chip" data-v="' + (versions.length - 1 - idx) + '">V' + (versions.length - idx) + ' · ' + D.esc((ver.at || '').slice(5, 16)) + '</button>';
 });
 html += '<div class="card" style="padding:12px 16px"><div class="card-title" style="margin-bottom:8px"> 版本历史 <span class="t-sub">每次生成自动存档（保留最近 8 版）</span></div>' +
 '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">' + verChips +
 '<button class="btn ghost2 sm" id="pvDiff" style="margin-left:auto"> 对比当前版</button></div>' +
 '<div id="pvDiffPanel"></div></div>';
 }

 html += '<div class="card" style="padding:14px 16px"><div class="card-title" style="margin-bottom:8px">排版</div>' +
 '<div class="opt-row"><div class="seg" id="pvStyle">' +
 '<button data-s="wide"' + (state.settings.style === 'wide' ? ' class="on"' : '') + '>简介 · 宽排版</button>' +
 '<button data-s="classic"' + (state.settings.style === 'classic' ? ' class="on"' : '') + '>经典标准</button>' +
 '<button data-s="modern"' + (state.settings.style === 'modern' ? ' class="on"' : '') + '>现代侧栏</button>' +
 '<button data-s="dachang"' + (state.settings.style === 'dachang' ? ' class="on"' : '') + '>大厂极简</button>' +
 '<button data-s="kendall"' + (state.settings.style === 'kendall' ? ' class="on"' : '') + '>蓝调时间轴</button>' +
 '<button data-s="macchiato"' + (state.settings.style === 'macchiato' ? ' class="on"' : '') + '>双栏咖啡风</button></div>' +
 '<span style="font-size:12px;color:var(--text-3)">黄色高亮 = 命中的 JD 关键词 · 橙色角标 = 待确认主张</span>' +
 '<span id="pvPageFit" style="font-size:12px;color:var(--text-3);font-weight:600"></span></div></div>';

 html += '<div class="preview-stage"><div id="resume-paper">' + TailorPreview.renderResume(model, state.settings.style) + '</div></div>';

 // 证据审计面板
 var lg = model.ledger || { confirmed: 0, pending: [], noEvidence: [], strong: [], rejectedSkipped: 0 };
 var audit = '';
 audit += '<div class="card" style="margin-top:14px"><div class="card-title"> 证据审计 <span class="t-sub">每条强主张都要能回指证据（借鉴 ASu 主张—证据账本）</span></div>';
 if (lg.pending.length) {
 audit += '<div class="card-note" style="border:1px dashed rgba(221,134,41,.5);background:#fef5e7;border-radius:9px;padding:9px 12px">⚠ 有 <b>' + lg.pending.length + '</b> 条「待确认」主张进入了当前简历（预览中带橙色角标）。导出最终 PDF 前请回到资料库核实或改标「不采用」。</div>';
 }
 audit += '<div class="stat-row" style="margin-bottom:10px">' +
 '<div class="stat-mini ok"><div class="v">' + lg.confirmed + '</div><div class="l">已确认主张</div></div>' +
 '<div class="stat-mini' + (lg.pending.length ? ' warn' : ' ok') + '"><div class="v">' + lg.pending.length + '</div><div class="l">待确认</div></div>' +
 '<div class="stat-mini' + (lg.noEvidence.length ? ' warn' : ' ok') + '"><div class="v">' + lg.noEvidence.length + '</div><div class="l">缺证据</div></div>' +
 '<div class="stat-mini"><div class="v">' + lg.strong.length + '</div><div class="l">强主张（需证据）</div></div></div>';
 var auditItems = [];
 lg.pending.forEach(function (b) { auditItems.push({ b: b, flag: 'pending', flagTxt: '待确认' }); });
 lg.strong.forEach(function (b) {
 if (b.status !== 'pending' && !(b.evidence || '').trim()) auditItems.push({ b: b, flag: 'no-evidence', flagTxt: '强主张缺证据' });
 });
 if (auditItems.length) {
 audit += auditItems.slice(0, 8).map(function (it) {
 var meta = [];
 if (it.b.evidence) meta.push('证据：' + it.b.evidence);
 if (it.b.boundary) meta.push('边界：' + it.b.boundary);
 return '<div class="audit-item"><div class="a-txt"><div>' + D.esc(it.b.text) + '</div>' +
 (meta.length ? '<div class="a-meta">' + meta.map(D.esc).join('　') + '</div>' : '<div class="a-meta">未填写证据/边界</div>') +
 '</div><span class="a-flag ' + it.flag + '">' + it.flagTxt + '</span></div>';
 }).join('');
 } else {
 audit += '<div class="grammar-ok" style="padding:4px 2px">✓ 本版简历所有要点均有证据支撑，无待确认主张。</div>';
 }
 audit += '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn ghost2 sm" id="pvEdit2"> 去资料库补证据</button></div></div>';
 html += audit;

 if (model.gaps.length) {
 html += '<div class="card" style="margin-top:14px"><div class="card-title"> 投递建议</div><div class="card-note">以下 JD 关键词在你的资料中暂未体现，若你有相关经验可在「资料库」补充后重新生成，覆盖度会更高：</div>' +
 '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px">' + model.gaps.map(function (t) { return '<span class="chip gap">' + D.esc(t) + '</span>'; }).join('') + '</div>';
 if (model.gapSuggestions && model.gapSuggestions.length) {
 html += model.gapSuggestions.slice(0, 4).map(function (g) {
 return '<div class="log-line"><span class="ok"></span><div><b>' + D.esc(g.term) + '</b>：' + D.esc(g.suggestion) + '</div></div>';
 }).join('');
 }
 html += '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn ghost2 sm" id="pvEdit"> 去补充资料</button></div></div>';
 }
 v.innerHTML = html;

 bindSeg('#pvStyle', 's', 'style', renderPreview);
 var r = $('#pvRegen');
 if (r) r.addEventListener('click', runGenerate);
 ['pvEdit', 'pvEdit2'].forEach(function (id) {
 var e = $('#' + id);
 if (e) e.addEventListener('click', function () { showView('profile'); });
 });
 var sw = $('#pvSwitchJd');
 if (sw) sw.addEventListener('click', function () { showView('jd'); });
 var intro = $('#pvIntro');
 if (intro) intro.addEventListener('click', showIntro);
 var iv = $('#pvInterview');
 if (iv) iv.addEventListener('click', showInterview);

 // 版本历史交互
 var diffPanel = $('#pvDiffPanel');
 var activeVer = null;
 $$('.ver-chip', v).forEach(function (chip) {
 chip.addEventListener('click', function () {
 var isCur = chip.dataset.v === 'cur';
 activeVer = isCur ? null : state.jd.versions[D.num(chip.dataset.v)];
 $$('.ver-chip', v).forEach(function (x) { x.classList.remove('on'); });
 chip.classList.add('on');
 var shown = activeVer ? activeVer.model : model;
 $('#resume-paper').innerHTML = TailorPreview.renderResume(shown, state.settings.style);
 if (diffPanel && activeVer) renderDiffPanel(diffPanel, activeVer.model, model);
 else if (diffPanel) diffPanel.innerHTML = '';
 });
 });
 var diffBtn = $('#pvDiff');
 if (diffBtn) diffBtn.addEventListener('click', function () {
 if (diffPanel) renderDiffPanel(diffPanel, versions[versions.length - 1].model, model);
 });

 // 页面占用预估（A4 高度约 1320px @ 940 宽）
 setTimeout(function () {
 var paper = $('#resume-paper');
 if (!paper) return;
 var h = paper.scrollHeight;
 var pages = Math.max(1, Math.ceil(h / 1320));
 var fitNote = $('#pvPageFit');
 if (fitNote) {
 fitNote.textContent = '预估 ' + pages + ' 页' + (pages === 1 ? '（单页 ）' : '（建议切「简介」或减少要点数）');
 }
 }, 60);
 }

 function renderDiffPanel(panel, oldModel, newModel) {
 var d = TailorPreview.diffModels(oldModel, newModel);
 var h = '<div style="margin-top:10px;font-size:12px;color:var(--text-3)">对比 ' + D.esc(oldModel.meta.generatedAt) + ' → 当前版</div>';
 if (!d.summaryChanged && !d.skillsAdded.length && !d.skillsRemoved.length && !d.work.length) {
 h += '<div class="grammar-ok" style="margin-top:6px">✓ 两个版本没有内容差异（仅排版/评分变化）。</div>';
 } else {
 if (d.summaryChanged) h += '<div class="diff-row add">自我评价已改写</div>';
 d.skillsAdded.forEach(function (s) { h += '<div class="diff-row add">＋ 技能：' + D.esc(s) + '</div>'; });
 d.skillsRemoved.forEach(function (s) { h += '<div class="diff-row del">－ 技能：' + D.esc(s) + '</div>'; });
 d.work.forEach(function (w) {
 h += '<div class="diff-row"><h4>' + D.esc(w.company) + (w.title ? ' · ' + D.esc(w.title) : '') + '</h4>';
 w.added.forEach(function (t) { h += '<div class="diff-row add">＋ ' + D.esc(t) + '</div>'; });
 w.removed.forEach(function (t) { h += '<div class="diff-row del">－ ' + D.esc(t) + '</div>'; });
 h += '</div>';
 });
 }
 panel.innerHTML = h;
 }

 /* ============ HR 开场白 / 面试预测 ============ */
 function showIntro() {
 var model = state.generated;
 if (!model) return;
 var cfg = state.settings.llm;
 var body = '<div id="introRes" style="min-height:40px"><span class="spin" style="border-color:rgba(0,0,0,.2);border-top-color:var(--accent)"></span> 生成中…</div>';
 var m = modal({
 title: ' HR 开场白 & 求职信',
 body: body
 }, [{ label: '复制全部', cls: 'primary', onClick: function () { copyIntro(); } }]);
 function render(res) {
 var h = '';
 if (res.hrIntro) {
 h += '<div class="card-title" style="font-size:13px">HR 开场白（Boss直聘/微信）</div><div class="log-line"><div style="white-space:pre-wrap">' + D.esc(res.hrIntro) + '</div></div>';
 }
 if (res.coverLetter) {
 h += '<div class="card-title" style="font-size:13px;margin-top:10px">求职信正文</div><div class="log-line"><div style="white-space:pre-wrap">' + D.esc(res.coverLetter) + '</div></div>';
 }
 if (!h) h = '<div class="grammar-bad">未生成成功，请稍后重试</div>';
 $('#introRes').innerHTML = h;
 window.__tailorIntro = res;
 }
 function copyIntro() {
 var r = window.__tailorIntro;
 if (!r) return;
 var txt = ['【HR 开场白】', r.hrIntro || '', '', '【求职信】', r.coverLetter || ''].join('\n');
 D.copyText(txt).then(function () { toast('已复制', 'ok'); });
 }
 if (cfg.apiKey) {
 TailorLLM.llmIntro(state, model, cfg).then(render).catch(function (e) {
 $('#introRes').innerHTML = '<div class="grammar-bad">LLM 生成失败：' + D.esc(e.message || e) + '（可先配置 Key 或稍后重试）</div>';
 });
 } else {
 // 本地模板兜底
 var best = null;
 model.work.forEach(function (w) { (w.bullets || []).forEach(function (b) { if (!best || (b.hits || []).length > (best.hits || []).length) best = b; }); });
 var years = model.work.length;
 var matched = (model.coverage.matched || []).slice(0, 4).join('、');
 var hrIntro = '您好，我是' + (model.header.name || '求职者') + '，' + (model.header.targetPosition ? '应聘' + model.header.targetPosition + '，' : '') +
 (years ? '有 ' + years + ' 段相关经历，' : '') + '熟悉' + (matched || '相关领域') + '。' +
 (best ? '最近一段经历中' + best.text.slice(0, 40) + '。' : '') + '方便的话希望进一步沟通，谢谢！';
 var coverLetter = '您好：\n我对贵司' + (model.header.targetPosition || '该岗位') + '非常感兴趣。我具备' + (matched || '相关经验') +
 '等能力，' + (best ? '其中' + best.text.slice(0, 60) + '。' : '') + '希望有机会参与面试，进一步介绍我的匹配度。';
 render({ hrIntro: hrIntro, coverLetter: coverLetter });
 }
 }

 function showInterview() {
 var model = state.generated;
 if (!model) return;
 var cfg = state.settings.llm;
 var body = '<div id="ivRes" style="min-height:40px"><span class="spin" style="border-color:rgba(0,0,0,.2);border-top-color:var(--accent)"></span> 生成中…</div>' +
 '<div class="card-note" style="margin-top:8px">无 Key 时用本地规则生成（强主张核实 + 缺口追问）；配置 LLM 后由模型生成更贴近 JD 的问题。</div>';
 modal({
 title: ' 面试追问预测',
 body: body
 }, [{ label: '关闭', cls: 'ghost2', onClick: function (c) { c(); } }]);
 function render(qs) {
 var h = qs.map(function (q, i) {
 return '<div class="audit-item"><div class="a-txt"><div><b>Q' + (i + 1) + '.</b> ' + D.esc(q.q) + '</div>' +
 (q.why ? '<div class="a-meta">' + D.esc(q.why) + '</div>' : '') + '</div></div>';
 }).join('');
 $('#ivRes').innerHTML = h || '<div class="grammar-bad">没有可预测的问题</div>';
 }
 if (cfg.apiKey) {
 TailorLLM.llmInterview(state, model, cfg).then(render).catch(function () {
 render(TailorLLM.localInterview(model, state));
 });
 } else {
 render(TailorLLM.localInterview(model, state));
 }
 }

 function downloadResumeJSON() {
 if (!state.generated) return;
 var name = state.generated.header.name || 'resume';
 D.download(name + '-resume.json', JSON.stringify(TailorPreview.resumeToJSON(state.generated), null, 2), 'application/json;charset=utf-8');
 toast('已下载 JSON Resume 格式', 'ok');
 }

 function downloadResumeDoc() {
 if (!state.generated) return;
 var name = state.generated.header.name || 'resume';
 D.download(name + '-resume.doc', TailorPreview.resumeToDocHTML(state.generated, state.settings.style), 'application/msword;charset=utf-8');
 toast('已下载 .doc（Word 可直接打开，另存为 PDF 更佳）', 'ok');
 }

 function copyResumeText() {
 if (!state.generated) return;
 D.copyText(TailorPreview.resumeToText(state.generated)).then(function () {
 toast('简历文本已复制', 'ok');
 }, function () { toast('复制失败，请手动复制', 'err'); });
 }

 function downloadResumeMD() {
 if (!state.generated) return;
 var name = state.generated.header.name || 'resume';
 D.download(name + '-tailored.md', TailorPreview.resumeToText(state.generated), 'text/markdown;charset=utf-8');
 toast('已下载 .md 文件', 'ok');
 }

 /* ============ LLM SETTINGS ============ */
 function openSettings() {
 var cfg = state.settings.llm;
 var m = modal({
 title: ' LLM 设置',
 body: '<div class="card-note" style="margin-top:0">接入任意 OpenAI 兼容接口（OpenAI / DeepSeek / Moonshot 等）进行深度改写。<b>密钥仅保存在本浏览器 localStorage</b>，不会上传到任何服务器。</div>' +
 '<div class="field" style="margin-bottom:10px"><label>API Base URL</label><input class="inp mono" id="cfgBase" value="' + D.esc(cfg.baseUrl) + '"></div>' +
 '<div class="field" style="margin-bottom:10px"><label>API Key</label><input class="inp" id="cfgKey" type="password" placeholder="sk-…" value="' + D.esc(cfg.apiKey) + '"><div style="font-size:11px;color:var(--text-3);margin-top:4px">示例：OpenAI sk-xxx；DeepSeek 用 https://api.deepseek.com/v1 + deepseek-chat；Kimi 用 https://api.moonshot.cn/v1</div></div>' +
 '<div class="field" style="margin-bottom:10px"><label>模型</label><input class="inp mono" id="cfgModel" value="' + D.esc(cfg.model) + '"></div>' +
 '<div id="llmTestRes"></div>'
 }, [
 { label: '测试连接', cls: 'ghost2', onClick: function () { testLLMFromModal(); } },
 { label: '保存', cls: 'primary', onClick: function (close) {
 cfg.baseUrl = $('#cfgBase').value.trim() || cfg.baseUrl;
 cfg.apiKey = $('#cfgKey').value.trim();
 cfg.model = $('#cfgModel').value.trim() || cfg.model;
 D.save();
 close();
 toast('LLM 设置已保存', 'ok');
 } }
 ]);
 function testLLMFromModal() {
 var t = $('#llmTestRes');
 t.innerHTML = '<span class="spin" style="border-color:rgba(0,0,0,.2);border-top-color:var(--accent)"></span> 正在测试…';
 TailorLLM.testLLM({
 baseUrl: $('#cfgBase').value.trim() || cfg.baseUrl,
 apiKey: $('#cfgKey').value.trim(),
 model: $('#cfgModel').value.trim() || cfg.model
 }).then(function (r) {
 t.innerHTML = r.ok
 ? '<div class="log-line"><span class="ok">✓</span>连接成功，模型可用</div>'
 : '<div class="log-line"><span class="warn">✗</span>' + D.esc(r.error) + '</div>';
 });
 }
 }

 /* ---------- dirty tracking ---------- */
 function markDirty() {
 // light touch: nothing heavy needed; fingerprint check happens on preview render
 }

 /* ---------- init ---------- */
 function init() {
 $$('.nav-item').forEach(function (n) {
 n.addEventListener('click', function () { showView(n.dataset.view); });
 });
 $('#btnSettings').addEventListener('click', openSettings);
 showView('profile');
 }

 document.addEventListener('DOMContentLoaded', init);
 if (document.readyState !== 'loading') init();

 global.TailorUI = {
 showView: showView, runGenerate: runGenerate, openSettings: openSettings,
 renderPreview: renderPreview, renderGenerate: renderGenerate, renderJD: renderJD
 };
})(typeof window !== 'undefined' ? window : globalThis);
