# 简历写作方法论的 skill / 提示词 / 规则集调研报告

> 目的：把「简历写作方法论」固化成可复用的 skill / 提示词 / 规则集，吸收进一个中文简历生成应用（本地规则引擎 + LLM 提示词）。
> 调研方式：web_search + GitHub API + raw 文件实际抓取。以下所有内容均来自实际请求到的响应，附来源 URL；搜不到或无法访问的注明「未找到」。

---

## 〇、一句话结论

市面上已有**成形的「简历方法论即 skill」资产**可整体吸收，其中最具价值的是三个中文向/中英双语 skill 包：
- `zhanfoguang/high-density-resume`（高密度证据链简历法：英文写方法、附完整中文评分表/模板/压力测试，规则最系统）
- `Hisn00w/ASu-skills`（中文「阿酥」技能包：经历酥化 + 主张—证据账本 + 可编辑 HTML 简历 + A4 页面平衡 QA）
- `Paramchoudhary/ResumeSkills`（英文 20 个子 skill：bullet 写法、量化、ATS 优化、排版、tailoring，可裁剪成中文规则）

ATS 打分/匹配工具多为**关键词字符串匹配**（国内 Moka/北森等 ATS 也以字符串匹配为主），本地可低成本复刻；「重写增强」部分则适合交给 LLM 提示词。

---

## 一、简历写作规则清单表

| # | 规则 | 出处（URL） | 可落地方式 |
|---|---|---|---|
| R1 | **证据单元公式**：`动作 + 工具/方法 + 结果`（可吸收 STAR/CAR/PAR/XYZ，公式只是挖掘事实的透镜，不得反客为主） | zhanfoguang/high-density-resume [`references/method.md`](https://github.com/zhanfoguang/high-density-resume/blob/main/docs/method.md)、[`references/common-frameworks.md`](https://github.com/zhanfoguang/high-density-resume/blob/main/skills/high-density-resume/references/common-frameworks.md) | LLM 提示词强制（结构化生成模板 + 逐 bullet 校验） |
| R2 | **STAR / CAR / PAR 适配**：Situation/Task→上下文；Action→个人动作；Result→结果。bullet 不宜塞全 STAR，压缩为 action+对象+方法+结果 | 同上 [`common-frameworks.md`](https://github.com/zhanfoguang/high-density-resume/blob/main/skills/high-density-resume/references/common-frameworks.md)；[`AI ResumeGuru STAR/XYZ`](https://airesume.guru/blog/star-method-resume-bullets)；[`resume.io XYZ`](https://resume.io/blog/xyz-resume-format) | LLM 提示词强制 + 需人工复述确认上下文 |
| R3 | **XYZ 公式**：`Accomplished X as measured by Y by doing Z`；中文版 `通过[动作/工具/方法]完成[交付物/结果]，[数字/范围/反馈/排名]可验证`。Y 缺失时不得虚构指标，改用交付物/反馈等非数字证明 | 同上 [`common-frameworks.md`](https://github.com/zhanfoguang/high-density-resume/blob/main/skills/high-density-resume/references/common-frameworks.md)；[`resume.io XYZ`](https://resume.io/blog/xyz-resume-format) | LLM 提示词强制 + 本地正则（检出"提升/显著/大量"等无基准的模糊词） |
| R4 | **每条 bullet 至少一个数字**：钱/百分比/时间/规模/前后对比；无精确数时用 `~` 近似、区间 `X-Y`、下界 `X+`、保守估算（宁愿说 400+），且数字必须能在面试解释 | [`ResumeSkills/resume-quantifier`](https://github.com/Paramchoudhary/ResumeSkills/blob/main/skills/resume-quantifier/SKILL.md)；[`resumestart action verbs`](https://resumestart.ai/blog/action-verbs-for-resumes) | LLM 提示词强制 + 本地正则（统计无数字 bullet） |
| R5 | **量化五类来源**：百分比、绝对量、时间、范围；引导但**绝不替用户编**，拿不到写 `[待确认]` 或定性影响 | [`yanliudesign/offer-toolkit-skill/resume-skill/guides/writing-tips.md`](https://github.com/yanliudesign/offer-toolkit-skill/blob/main/resume-skill/guides/writing-tips.md) | LLM 提示词强制 + 校验占位符 |
| R6 | **强动词（英文）**：按类别用 Led/Directed/Spearheaded；Grew/Boosted/Scaled；Created/Designed/Launched；Streamlined/Optimized/Automated；Analyzed/Diagnosed；Resolved/Mitigated；Collaborated/Influenced。**避开** "Responsible for / Helped / Worked on / Participated in" | [`ResumeSkills/resume-bullet-writer`](https://github.com/Paramchoudhary/ResumeSkills/blob/main/skills/resume-bullet-writer/SKILL.md)；[`ResumeSkills/tech-resume-optimizer`](https://github.com/Paramchoudhary/ResumeSkills/blob/main/skills/tech-resume-optimizer/SKILL.md)；[`250+ Resume Action Verbs`](https://resumestart.ai/blog/action-verbs-for-resumes) | 本地正则黑名单（检出 used/responsible for/helped）+ LLM 提示词强制替换 |
| R7 | **中文强动词替换**：`负责`→主导/领导/统筹/驱动/独立完成/协调；`参与`→核心参与/承担XX模块/协助完成；`熟练使用`→具体动作；`学习能力强`→用动词证明（如"零基础自学 SQL，2 周…"）。一份简历 ≥3 次"负责"会被 HR 判为缺量化贡献 | [`2026春招HR：简历开头写"负责"，直接判不匹配-新东方网`](https://cet4-6.xdf.cn/202605/15185216.html)；[`动词+数字替换形容词-新东方网`](https://cet4-6.xdf.cn/202605/15185213.html) | 本地正则（统计"负责/参与/熟练使用/具备较强"出现次数）+ LLM 提示词强制替换 |
| R8 | **形容词是观点，动词+数字是证据**：删掉"工作认真负责/学习能力强/团队合作强/有一定了解/锻炼了能力"等无证据评价；无证据的判断一律不加 | 同上 [`动词+数字替换形容词`](https://cet4-6.xdf.cn/202605/15185213.html)；[high-density `review-checklist.md`](https://github.com/zhanfoguang/high-density-resume/blob/main/templates/review-checklist.md) | 本地正则 套话黑名单 + LLM 提示词强制 |
| R9 | **ATS 关键词：真实自然嵌入证据句**，不只放技能栏；勿隐藏关键词/堆砌/伪造职位名；关键命中关键词 2–4 次，重要词 1–2 次，措辞可变化 | [`ResumeSkills/resume-ats-optimizer`](https://github.com/Paramchoudhary/ResumeSkills/blob/main/skills/resume-ats-optimizer/SKILL.md)；[high-density `common-frameworks.md`](https://github.com/zhanfoguang/high-density-resume/blob/main/skills/high-density-resume/references/common-frameworks.md) | 本地正则（JD 关键词 vs 简历命中矩阵、频次统计）+ LLM 提示词改写 |
| R10 | **ATS 排版**：单栏、标准板块标题（Experience/Education/Skills）、纯文本联系方式、勿关键信息入图/表格/文本框/页眉页脚、PDF 需文本可选中可搜索、标准字体 10–12pt 正文 14–16pt 标题、统一日期格式 MM/YYYY、文件名 `FirstName_LastName_Resume.pdf` | [`ResumeSkills/resume-ats-optimizer`](https://github.com/Paramchoudhary/ResumeSkills/blob/main/skills/resume-ats-optimizer/SKILL.md)；[`面灵AI ATS优化指南`](https://www.mianlingai.com/blog/resume-ats-optimization-guide-2026/) | 本地规则（HTML/PDF 结构检查：是否有 table/多栏/图片/页眉页脚；文本可抽取性） |
| R11 | **页数**：应届/0–5年 1 页；5–15 年 1–2 页；15+ 年/高管 2 页（最多 3）。**单页优先**，内容能一页就一页；双页先填实第一页 | [`ResumeSkills/resume-formatter`](https://github.com/Paramchoudhary/ResumeSkills/blob/main/skills/resume-formatter/SKILL.md)；(中文语境 1–2 页以内的说法见 [`面灵AI ATS优化指南`](https://www.mianlingai.com/blog/resume-ats-optimization-guide-2026/)) | 本地规则（页高/行数估算） |
| R12 | **A4 页面平衡 & 视觉密度 QA（可量化）**：单页正文占用可用高度 ≈82–96%（过低重排、过高查页尾拥挤）；多页的每个非末页 ≈88–98%；末页 <70% 则前移/合并分区/改回单页。正文 9.5–10.5pt、行距 1.24–1.36；不要靠编数据/放大字号填版面 | `ASu-skills` [`skills/resume/references/page-balance-qa.md`](https://github.com/Hisn00w/ASu-skills/blob/main/skills/resume/references/page-balance-qa.md) | **本地可脚本化**（附 JS 测量代码：遍历 `.sheet` 计算 fill 百分比 + overflowPx）——最适合做成应用内 QA 工具 |
| R13 | **负责/主导用词边界（ownership）**：只能对能说明决策、交付、结果的内容用"主导/负责人/Owner/0→1/核心作者"；否则用"参与/协助/负责XX模块/团队负责/待确认"。不得把"参与/在场"改写成"主导"以显得更强 | [high-density `method.md` ownership levels](https://github.com/zhanfoguang/high-density-resume/blob/main/docs/method.md)；`ASu-skills` [`skills/asu/SKILL.md`](https://github.com/Hisn00w/ASu-skills/blob/main/skills/asu/SKILL.md) | LLM 提示词强制 + 需人工判断（语义上到底是主导还是参与） |
| R14 | **可追问性/压力测试**：随机指认任一工具名/数字/项目/强动词，用户须 5 秒内讲出背景、动作、方法、难点、结果；答不出就降级或删除。风险按高/中/低分级，附"若无法证明 X 就改成 Y 或删除" | [high-density `SKILL.md` CHECKPOINTS](https://github.com/zhanfoguang/high-density-resume/blob/main/skills/high-density-resume/SKILL.md)、[`method.md`](https://github.com/zhanfoguang/high-density-resume/blob/main/docs/method.md) | 需人工判断 + LLM 逐项反问 |
| R15 | **强词/指标口径**：强主张须有职责/提交/上线/评审证据；项目总调用量/用户数/Star 不能自动算成个人成果，要标口径与时间 | `ASu-skills` [`skills/asu-resume/SKILL.md`](https://github.com/Hisn00w/ASu-skills/blob/main/skills/asu-resume/SKILL.md) | 本地正则（数字冒号/单位检查）+ LLM 提示词强制 + 需人工判断 |
| R16 | **主张—证据账本（fact baseline）**：每条 claim 记录 id/source_fact/candidate_wording/sources/responsibility_level/verification_status(已确认/待确认/已过期/不采用)/allowed_uses/interview_details/boundary/risk_notes。正式成稿只消费"已确认"，"待确认"仅可进内部草稿，最终 PDF 必须确认或删除 | `ASu-skills` [`skills/asu/references/claim-evidence-ledger.md`](https://github.com/Hisn00w/ASu-skills/blob/main/skills/asu/references/claim-evidence-ledger.md)（`assets/career-claim-ledger-template.json`） | **本地可结构化**（JSON 模型 + 状态机，是应用内最有价值的数据层） |
| R17 | **黄金位**：把最强、最能扛追问的经历放前 1/3；求职意向与第一段核心经历互相呼应；一句"识别标签"（专业底盘+可交付能力+差异化） | [high-density `method.md`](https://github.com/zhanfoguang/high-density-resume/blob/main/docs/method.md)、[`review-checklist.md`](https://github.com/zhanfoguang/high-density-resume/blob/main/templates/review-checklist.md) | 本地规则（板块顺序/段落权重）+ LLM 提示词强制 |
| R18 | **结构可扫读 & 口语化处理**：倒序；每段经历 2–3 行；>4 段就分类；板块顺序匹配资历（应届把 Projects+Education 提前，资深 Experience 第一、Education 一行）；英文去人称（不写 I/My）、现职现在时、过往过去式 | [`ResumeSkills/resume-formatter`](https://github.com/Paramchoudhary/ResumeSkills/blob/main/skills/resume-formatter/SKILL.md)；[`yanliudesign/writing-tips.md`](https://github.com/yanliudesign/offer-toolkit-skill/blob/main/resume-skill/guides/writing-tips.md) | 本地规则 + LLM 提示词强制 |
| R19 | **Boss直聘/微信 HR 短开场白**：默认约 80–160 字，先说身份+方向，再说一个真实成果，最后邀请继续交流；模板可选「岗位名锚定式」（首句直接点名岗位并附 JD 关键技能匹配句）或「成果数据锚定式」（用可验证量化结果替代主观描述） | `ASu-skills` [`skills/asu/SKILL.md`](https://github.com/Hisn00w/ASu-skills/blob/main/skills/asu/SKILL.md)；[`Boss直聘高回复率开场白模板`](https://www.mizhijia.net/wz/738578.html)；[`Boss直聘沟通开场白`](https://www.php.cn/faq/1881966.html) | LLM 提示词生成模板（按字数约束）+ 本地字数校验 |

---

## 二、skill / prompt 仓库清单

| 仓库 URL | 内容概要 | 可吸收点 |
|---|---|---|
| [`zhanfoguang/high-density-resume`](https://github.com/zhanfoguang/high-density-resume)（高密度证据链简历法，Codex/Claude/OpenClaw 通用） | 中英双语。SKILL.md（workflow+checkpoints+risk blacklist）+ references（method / common-frameworks / hr-ats-screening / distinctive-signals / dual-ai-review）+ 用户向模板 + 中文评分表 rubric + 压力测试清单 + evals。**脚本化**：`scripts/evidence_builder.py`（证据单元交互式助手，`--lang zh`）、`resume-evidence-matcher` 子 skill 的 `calculate_coverage.py` | ①证据单元公式 & XYZ 中文模式；②ownership 分层表；③18 分制 `rubric.md` 评分表（最易转成本地打分函数）；④`review-checklist.md` 压力测试清单；⑤ATS 关键词"真实嵌入证据句"示范；⑥checkpoints/risk blacklist 可直接做 LLM 防御性提示词 |
| [`Hisn00w/ASu-skills`](https://github.com/Hisn00w/ASu-skills)（中文「阿酥」技能包，1.9k★） | 多 skill：`/asu`（经历酥化、岗位定位、HR 开场白）、`/resume`（可编辑中文 HTML 简历 + 18 模板）、`/asu-resume`（复刻模板）、`/interview`、`/offer`、`/contributor`。**核心资产**：`claim-evidence-ledger`（主张—证据账本，跨 skill 共享事实基线）+ `page-balance-qa.md`（A4 页面平衡可量化规则 + JS 测量代码）+ 双页/单页模板 | ①主张—证据账本 JSON 模型/状态机（本地结构化数据层）；②A4 页面平衡 QA 的 JS 测量片段（可直接内嵌应用）；③Boss直聘/微信开场白 80–160 字模板；④"负责/主导/Owner 须有证据"边界规则；⑤HTML 可编辑简历 + export 验收（打印工具栏隐藏、PDF 文本可搜、公开链接显示规范化 URL 而非"网站/PAPER"标签） |
| [`Paramchoudhary/ResumeSkills`](https://github.com/Paramchoudhary/ResumeSkills) | 英文，20 个子 skill，多 agent 适配（.claude/.codex/.cursor/.gemini/.opencode/.windsurf/.agents）。含 resume-bullet-writer（XYZ/STAR/CAR+按类强动词+量化策略+行业示例）、resume-quantifier、resume-ats-optimizer、resume-tailor、resume-formatter、resume-section-builder、tech-resume-optimizer、job-description-analyzer、linkedin-profile-optimizer 等 | ①按类别**英文强动词表**（可直接做词表/正则）；②量化五分类 & 保守估算原则；③ATS 兼容 checklist + 关键词命中打分公式 `(Matched/Required)×100`、目标 80%+；④排版/页数规则；⑤JD→关键词提取方法（硬技能/软技能/行业词三分法）。中文场景需将其翻译并适配"负责/参与"边界 |
| [`Joey-Liu55/resume-expert`](https://github.com/Joey-Liu55/resume-expert)（中文，面向应届生） | 导师式引导 skill：岗位理解→能力拆解→经历挖掘→简历改写→投递准备。含 `references/job-to-skill-map.md`（岗位→技能映射）、`scripts/check_resume_brief.py`、`assets/resume-draft-template.md` | ①「应届生经历了少→去课程项目/毕设/比赛/社团/志愿/兼职挖掘」的低素材挖掘路径；②"少用黑话、引导式表达"的对话金线；③「JD 拆成职责/硬技能/软技能/业务场景/加分项」的标准模板 |
| [`WeAIClub/resume-skills`](https://github.com/WeAIClub/resume-skills) | 面向目标岗位 JD 的 5 个子 skill：dig（深挖素材）/generate/polish/review/format，带 JSON Schema 以约束结构化输出与防幻觉 | ①**以 JD 为唯一标尺 + 防幻觉 + content 不丢失**的产品理念；②dig→generate→review→polish→format 的流水线编排（可映射应用的多步骤流程）；③每步都带 schema.json（结构化输出约束，值得对齐） |
| [`yanliudesign/offer-toolkit-skill`](https://github.com/yanliudesign/offer-toolkit-skill)（中文 offer 工具包） | `resume-skill/guides/writing-tips.md`：一张**简历写作 Cheat Sheet**——bullet 公式 `[动词]+[做了什么]+[量化结果]`、强动词中英对照、"负责人（少用）"、量化的四类引导问句、结构/长度/时态、ATS 友好、常见错误逐项诊断 | ①最简洁的 bullet 公式与中英强动词对照（本地正则可用）；②无数字时引导问句（百分比/绝对量/时间/范围）；③逐项诊断清单 |
| [`NeverSight/skills_feed`](https://github.com/NeverSight/skills_feed) | 聚合 skill feed，收录了 `paramchoudhary/resumeskills/resume-bullet-writer` 等外部 skill | 作为「skill 聚合分发」思路参考；也说明 ResumeSkills 被第三方收录 |

**关于 awesome-claude-skills 是否含 resume**：直接检索 `awesome-claude-skills resume` 返回 **total: 0**，未在 canonical awesome-claude-skills 中看到 resume 类条目；但 resume 能力出现在聚合 feed（skills_feed）与上述独立仓库中。（若需要，可用 `hesreallyhim/awesome-claude-skills` 仓库树做一次确认；本次 GitHub API 额度已用尽未能复核。）

---

## 三、ATS 评分 / 简历匹配开源项目清单

| 仓库 URL | Stars / 语言 | 功能 | 可否借鉴进我们的应用 |
|---|---|---|---|
| [`srbhr/Resume-Matcher`](https://github.com/srbhr/Resume-Matcher) | 28.2k / TS | 已**转型为 "AI Harness"**（master 简历 + 按 JD 定制 + cover letter + 模板导出，支持 Claude/ChatGPT/DeepSeek/Kimi/GLM 等 100+ LLM）。README 明确「How It Works：上传 master resume → 贴 JD → AI 改进定制 → 导出 PDF」 | 借鉴其**产品流程**（master resume + 逐 JD 定制）与「本地/远程 LLM 均可」的架构；其**原规则版**（pyresparser + SkillExtractor + Jaccard/语义相似度打分）已在树中移除，需拉历史 commit 才可复用匹配逻辑 |
| [`seehiong/ats-buddy`](https://github.com/seehiong/ats-buddy) | 76 / TS | 纯本地 ATS 分析器：WebLLM 或本地 Ollama，匹配分 + 缺失关键词检测 + AI 简历改写，**零服务器上传**（隐私友好） | **最贴合"本地规则引擎 + LLM"目标**：匹配分/缺词检测可本地先行，改写交给 LLM；privacy-by-design 思路值得沿用 |
| [`Deba951/Resume-ATS-Tracking-LLM-Project`](https://github.com/Deba951/Resume-ATS-Tracking-LLM-Project) | 39 / Python | 智能 ATS：JD vs 简历 → 匹配百分比 + 缺失关键词 + 改进建议 | 直接参考其打分流程（提取 JD 关键词→匹配→缺失→建议）与 LLM 增强部分 |
| [`espin086/GPT-Jobhunter`](https://github.com/espin086/GPT-Jobhunter) | 95 / Python | AI 求职助手：一次上传简历，AI 找匹配岗位，每岗位打 0–100% 分，并自动按岗位改写整份简历 | 借鉴「0–100% 匹配分 + 自动 tailor」的产品闭环，可作为打分模板 |
| [`Joseph24x7/ResumeAtsChecker`](https://github.com/Joseph24x7/ResumeAtsChecker) | 29 / JS | Web 应用：解析简历 PDF + JD，识别相关关键词、算匹配百分比、高亮缺失关键词 | 借鉴其**纯前端**「PDF 解析 + 关键词命中 + 高亮缺失」交互；缺失词高亮很适合中文关键词体检 UI |
| [`dylan-hugheshid7095/browser-ats-resume-analyzer`](https://github.com/dylan-hugheshid7095/browser-ats-resume-analyzer) | 25 / HTML | 纯前端（browser-based）ATS 匹配：client-side 关键词匹配、多格式上传、可视化评分 | 借鉴 client-side 关键词匹配 + 打分可视化（无后端，易落地） |
| [`sualehalam/Resume-Matcher-ATS-Scanner`](https://github.com/sualehalam/Resume-Matcher-ATS-Scanner) | 1 | ATS 简历扫描分析平台 | 结构参考（扫描→解析→打分），成熟度低，仅作索引 |
| [`hugounoclaw/awesome-ats-resume`](https://github.com/hugounoclaw/awesome-ats-resume) | 2 | 精选清单：免费/开源/隐私友好的 ATS 简历检查器、解析器、模板、指南（README 在本次为 404/未取到正文，仅确认仓库存在） | 作为「开源 ATS 工具索引」，用于后续扩充借鉴池 |

**关键背景（节选，[面灵AI ATS 优化指南](https://www.mianlingai.com/blog/resume-ats-optimization-guide-2026/)）**：
- ATS 解析三步：文件提取（PDF/DOCX→纯文本）→ 字段识别 → 关键词匹配打分排序；**高达约 80% 的简历因第一步格式解析失败被跳过**，根本到不了 HR。
- 国内招聘常用 Moka、北森（后者对接智联/前程无忧/BOSS直聘并自动打分）；**BOSS直聘本身不是传统 ATS**，其筛选偏向行为匹配（活跃度/投递意向/沟通记录权重），规模企业常是 BOSS直聘 + 独立 ATS 双重筛选。
- 关键差异：**国内 ATS 目前以关键词字符串匹配为主，不是语义理解**（JD 写"微服务架构"，你写"服务拆分"，对人近似、对机器不命中）。

> 借鉴结论：**本地正则/字符串关键词匹配足以覆盖"ATS 体检"这一层**（命中矩阵、缺失词高亮、板块/格式/页数检查、文本可抽性）；**强动词替换、套话删除、量化改写、tailoring、开场白生成则交给 LLM 提示词**；两者中间用 `claim-evidence-ledger` + 状态机兜底防幻觉。

---

## 四、最值得先落地的 5–8 条规则（规则原文 + 落地方式）

### 1. 证据单元公式：动作 + 工具/方法 + 结果（R1）
- **规则原文**：`action + tool/method + result`。每条经历都应包含动作、工具/方法、结果中的≥2 个；最重要的经历要有真实数字、交付物或前后变化。低素材用户把 result 扩为「受益者/交付物/企业价值」。
  - *来源*：[zhanfoguang/high-density-resume `docs/method.md`](https://github.com/zhanfoguang/high-density-resume/blob/main/docs/method.md)、[`SKILL.md`](https://github.com/zhanfoguang/high-density-resume/blob/main/skills/high-density-resume/SKILL.md)
- **落地方式**：LLM 提示词强制。生成前用一段"结构化模板"约束输出字段（动作/方法/对象/结果）；再用本地正则做**字段缺失体检**（缺"结果"或"数字"的 bullet 标黄）。可借助 `scripts/evidence_builder.py`（`--lang zh`）做交互式挖掘。

### 2. 负责/主导用词边界（ownership）（R13）
- **规则原文**：只有能说明决策、交付、结果时才用「主导/负责人/Owner/0→1/核心作者」；否则写「参与/协助/负责XX模块/团队负责/待确认」。**绝不**把"参与/在场"改写为"主导"以显得更强。ownership 三级：Led（方向+决策+最终交付）/ Independently completed（独立完成限定范围）/ Participated/Assisted（参与部分）。一份简历出现≥3 次"负责"往往被判缺量化贡献。
  - *来源*：[high-density `method.md` ownership levels](https://github.com/zhanfoguang/high-density-resume/blob/main/docs/method.md)、[`review-checklist.md`](https://github.com/zhanfoguang/high-density-resume/blob/main/templates/review-checklist.md)；[ASu-skills `skills/asu/SKILL.md`](https://github.com/Hisn00w/ASu-skills/blob/main/skills/asu/SKILL.md)；[新东方网「写"负责"判不匹配」](https://cet4-6.xdf.cn/202605/15185216.html)
- **落地方式**：本地正则统计强词（负责/主导/参与/Owner/核心作者）次数并给阶梯告警；LLM 提示词强制给出 ownership 三元标注，并在改写前**反问**"这部分是你独立完成还是团队一部分？"（人工判断兜底）。这是防夸大的第一道闸门，建议做强制校验。

### 3. ATS 关键词：真实、自然嵌入证据句（R9）+ 正文命中打分
- **规则原文**：目标岗位关键词应**自然出现在证据支持的 bullet 里**，而不只堆在技能栏；勿隐藏关键词、勿堆砌、勿伪造职位名；关键命中词 2–4 次，重要词 1–2 次，措辞可变化（如"led team"与"team leadership"）。打分：`Match Score = (Keymatched / Required) × 100`，目标 80%+。
  - *来源*：[ResumeSkills `resume-ats-optimizer`](https://github.com/Paramchoudhary/ResumeSkills/blob/main/skills/resume-ats-optimizer/SKILL.md)；[high-density `common-frameworks.md`](https://github.com/zhanfoguang/high-density-resume/blob/main/skills/high-density-resume/references/common-frameworks.md)；[面灵AI ATS 指南](https://www.mianlingai.com/blog/resume-ats-optimization-guide-2026/)
- **落地方式**：**本地规则引擎最成熟的一层**——从 JD 抽取关键词（硬技能/软技能/行业词）→ 与简历跑命中矩阵（含近义/单复数/大小写归一）→ 输出"关键词缺失清单 + 命中频次 + 匹配分"。LLM 提示词负责把缺失关键词**自然重写进证据句**（而非机械添加）。因国内 ATS 以字符串匹配为主，这一层本地正则即可高保真复刻。

### 4. 量化改写：每 bullet ≥1 个数字，缺失用保守估算/占位（R4/R5）
- **规则原文**：每个 bullet 至少一个数字（钱/百分比/时间/规模/前后对比）。无精确数时：`~` 近似、`X-Y` 区间、`X+` 下界、**保守估算**（宁可 400+）；引导但**绝不替用户编**，拿不到写 `[待确认]` 或定性影响（"成为团队主用工具"）。每个数字须能在面试解释来源。
  - *来源*：[ResumeSkills `resume-quantifier`](https://github.com/Paramchoudhary/ResumeSkills/blob/main/skills/resume-quantifier/SKILL.md)；[yanliudesign `writing-tips.md`](https://github.com/yanliudesign/offer-toolkit-skill/blob/main/resume-skill/guides/writing-tips.md)
- **落地方式**：本地正则对每条 bullet 做"是否含数字/百分比/区间"检测，产出**缺数字 bullet 清单**。LLM 提示词：①按五类指标引导问句挖掘数字；②无真实数时强制输出 `[待确认]` 占位或定性结果，并在成稿前**必须**被确认或删除（与账本 status 联动）。这也是防幻觉的关键约束。

### 5. 18 分制"真实性/识别度/匹配/可搜/可追问/可扫读"评分表（可转打分函数）
- **规则原文**：六个维度各 0–3 分（真实性；个人识别度；求职方向匹配；HR 搜索率；面试可追问性；结构扫读性），总分 18，建议 ≥14 再投递；每档给出 0/1/2/3 分的行为锚点。阈值：0–7 回到证据单元重来；8–13 处理意向/黄金位/强词；14–18 做带读/模拟面试兜底。
  - *来源*：[high-density `docs/rubric.md`](https://github.com/zhanfoguang/high-density-resume/blob/main/docs/rubric.md)
- **落地方式**：**直接转成本地打分器**（每个维度对应一组规则：正则命中 + 关键词匹配 + 结构检查 + LLM 弱项判断分），输出维度分柱状图与总分。这是"把方法论固化"最干净的一条——用行为锚点做打分卡，规则可解释、可回归。

### 6. A4 页面平衡 & 视觉密度 QA（R12，可脚本化）
- **规则原文**：单页正文占用可用高度约 82–96%（过低重排、过高查页尾拥挤）；多页非末页约 88–98%；末页 <70% 时前移/合并分区/改回单页。正文 9.5–10.5pt、行距 1.24–1.36。**不得**靠编造指标/放大字号/重复技能/加装饰来填版面。
  - *来源*：[ASu-skills `skills/resume/references/page-balance-qa.md`](https://github.com/Hisn00w/ASu-skills/blob/main/skills/resume/references/page-balance-qa.md)（内含一段可直接执行的 browser DOM 测量 JS：遍历 `.sheet` 计算每页 `fill` 百分比与 `overflowPx`）
- **落地方式**：**把该 JS 测量片段内嵌到应用**，在导出 PDF 前强制跑一次"每页占用%"体检，给出"此页过空/末页过空/跨页失衡"提示与**调整顺序**（先重排→改结构→调间距→调字号→再决定扩页）。这比"纯人工看版"更客观，且与"单栏 ATS 友好"不冲突。

### 7. 主张—证据账本（claim-evidence ledger，R16）—— 本地结构化数据层
- **规则原文**：每条主张记录 `id / source_fact / candidate_wording / sources / responsibility_level / verification_status(已确认·待确认·已过期·不采用) / allowed_uses / interview_details / boundary / risk_notes`。对外材料只从"已确认"消费；"待确认"仅可进内部草稿、最终 PDF 前必须确认或删除；团队成果不得自动变成个人成果；指标须标口径与时间。
  - *来源*：[ASu-skills `skills/asu/references/claim-evidence-ledger.md`](https://github.com/Hisn00w/ASu-skills/blob/main/skills/asu/references/claim-evidence-ledger.md) + `assets/career-claim-ledger-template.json`
- **落地方式**：作为应用的**事实底层**，用 JSON Schema 建模 + 状态机（已确认/待确认/已过期/不采用）控制哪些内容能进入最终 PDF；LLM 只写 `candidate_wording`，证据与边界由账本/用户确认。这是把「生成简历」从"一次 LLM 输出"提升为"可审计、可复现、可追问"的关键架构。

### 8. Boss直聘/微信 HR 短开场白（R19，中文场景刚需）
- **规则原文**：默认约 80–160 字，先说**身份+方向**，再说**一个真实成果**，最后**邀请继续交流**。可用「岗位名锚定式」（首句点名岗位并附一句与 JD 关键技能匹配的陈述，如"您好，应聘贵司【Java-电商方向】，3 年 Spring Cloud 微服务经验，主导过订单履约重构，与 JD『高并发订单经验』高度匹配"）或「成果数据锚定式」（用可验证量化结果替代主观描述）。
  - *来源*：[ASu-skills `skills/asu/SKILL.md`](https://github.com/Hisn00w/ASu-skills/blob/main/skills/asu/SKILL.md)（80–160 字约束）；[小米之家 Boss直聘开场白模板](https://www.mizhijia.net/wz/738578.html)；[PHP中文网 Boss直聘沟通开场白](https://www.php.cn/faq/1881966.html)
- **落地方式**：LLM 提示词按字数约束生成两种模板；本地正则校验字数（80–160）与是否包含"岗位名+匹配点+成果+邀约"四要素。此功能**只对中文求职场景有意义**，是本应用差异化亮点。

---

## 五、给后续工程的红线建议（防幻觉）

综合各 skill 的「risk blacklist」（high-density `SKILL.md`）与 ASu 账本，建议固化成一条通用的**导出前强制门禁**：
- 不虚构事实/数字/工具/公司/奖项/成果；
- 不把"参与"升级成"主导"；
- 工具名要具体（用 Altium Designer/EasyEDA 而非"设计软件"）且能讲出使用场景；
- 无数字时用定性结果或 `[待确认]`，严禁编造百分比/用户量/延迟/排名；
- 关键词来自真实经历，合格标准是"自然嵌入证据句"，而不是堆在技能栏；
- 健康/医疗类信号（中医/推拿等）只用"学习经历/基础支持/信任建立/团队融合"措辞，**禁止**治疗/治愈/诊断/保证疗效类表述；
- 对外材料中的强主张必须能回指一条账本记录；最终 PDF 不包含"待确认/已过期/不采用"。

---

## 附：调研说明与边界
- 规则与仓库内容来自**抓取到的 raw 文件正文**（方法、评分表、清单、SKILL.md、writing-tips、账本规则等），非二手转述。
- 网站类规则（新东方网、面灵 AI、小米之家、PHP中文网、resume.io、resumestart 等）来自 web_search 返回的 URL 及抓到的正文片段。
- GitHub API 的 `repos` 通过 `sv` 用尽额度（60/60），因此 `hugounoclaw/awesome-ats-resume` 与 `sualehalam/Resume-Matcher-ATS-Scanner` 的 README **未能取到正文**（仅确认仓库存在，标记为"未找到正文"）；其余内容均在额度耗尽前抓取。
