# 📄 Job Hunter · 招聘简历定制工坊

招聘季的简历定制工具：**填一次工作经历，之后任何公司的招聘 JD 粘贴进来，一键生成针对这个岗位的定制简历**——不用再为每家公司手动改一遍。

它帮你把真实经历讲得更清楚，但**不替你编造**——每条硬话都要有证据，待确认的内容进不了最终稿。简历写好还能一路用到面试：ATS 匹配分、证据审计、面试追问预测、投递追踪，求职全流程都在这。

---

## ✨ 功能

| 功能 | 说明 |
|---|---|
| 📋 **JD 档案 · 投递追踪** | 多份 JD 独立保存分析与定制简历，可记录公司 / 投递阶段（已投递·面试中·Offer·拒绝）/ 日期 / 备注，档案栏实时漏斗统计 |
| 🎯 **ATS 职位匹配分** | 0-100 加权评分（关键词 × 职责覆盖），**语义变体匹配**（A/B测试 ≈ AB实验 ≈ A/B 实验），命中词在简历中高亮 |
| 🧠 **本地智能** | JD 关键词解析、逐条工作要点打分排序筛选、匹配词高亮、技能重排、自我评价强化——全程离线，无需 Key |
| ✨ **LLM 深度改写** | 按固定语法用大模型重写每条要点（动作动词开头 + 量化结果）、重写自我评价、生成开场白与面试题 |
| 📝 **固定语法** | 标准三要素 / ASu 五段式，每条要点至少 1 个数字；「负责/主导」满天飞但没量化会预警 |
| 🛡️ **证据账本** | 每条要点配「证据 / 出处 / 边界 / 核验状态」，不采用自动剔除，待确认带角标，导出前必须核实 |
| 🗄️ **版本历史 + diff** | 每次生成自动存档（保留 8 版），可对比两个版本的要点增删与技能变化 |
| 📄 **6 种排版** | 简介·宽排版（默认）/ 经典标准 / 现代侧栏 / 大厂极简 / 蓝调时间轴 / 双栏咖啡风 |
| 💌 **HR 开场白** | Boss直聘/微信 80-160 字开场白 + 求职信正文（LLM 生成，无 Key 时本地模板兜底） |
| 🎤 **面试预测** | 基于简历强主张与技能缺口预测追问（LLM 8-10 题含追问原因 / 本地规则版） |
| 📤 **导出** | 打印导出 PDF / .doc(Word) / JSON Resume（可导入 Reactive-Resume）/ .md / 复制文本 |

## 🚀 本地使用

### 方式一：直接打开（最简单）

双击 `index.html`，浏览器打开即可。本地模式（关键词解析 / ATS 评分 / 语法与证据检查 / 缺口建议）全部可用，数据只存在浏览器 localStorage。

### 方式二：本地服务器（推荐，LLM 模式也能用）

```bash
cd job-hunter
python3 -m http.server 8317
```

浏览器打开 `http://127.0.0.1:8317`。

## ⚙️ LLM 配置（可选）

左下角「LLM 设置」，支持任意 OpenAI 兼容接口：

| 服务 | Base URL | 模型示例 |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Kimi | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |

密钥**只保存在本浏览器 localStorage**，不会上传到任何服务器。不配 Key 也能完整体验本地智能模式。

## 🗂️ 项目结构

```
index.html          应用外壳（侧栏导航 + 四视图）
styles.css          DSH 同款浅色主题 + 6 种简历排版 + 打印样式
js/data.js          状态管理、localStorage、多份 JD 档案（含投递追踪/迁移）
js/keywords.js      JD 解析、语义变体、ATS 评分、固定语法、证据账本检查
js/engine-local.js  本地适配引擎（打分排序、账本过滤、统计）
js/engine-llm.js    LLM 引擎（改写 + 开场白 + 面试预测）
js/preview.js       6 种排版渲染 + JSON Resume / Word 导出 + 版本 diff
js/ui.js            视图交互、档案管理、生成编排、审计面板
test/smoke.js       Node 冒烟测试（node test/smoke.js）
```

## 🧰 技术栈

纯 HTML / CSS / JS，**零依赖、零构建**，双击即用。本地规则引擎做 ATS 体检与审计，LLM 只负责表达增强——两者之间用「主张—证据账本」兜底防幻觉。

## 🙏 方法论与致谢

写作方法论借鉴自以下开源项目（均为 MIT 协议）：

- [ASu-skills](https://github.com/Hisn00w/ASu-skills) —— 经历酥化、主张—证据账本、大厂极简模板
- [high-density-resume](https://github.com/zhanfoguang/high-density-resume) —— 证据单元公式、ownership 边界
- [ResumeSkills](https://github.com/Paramchoudhary/ResumeSkills) —— ATS 匹配公式、量化规则
- [jsonresume-theme-kendall](https://github.com/LinuxBozo/jsonresume-theme-kendall) / [jsonresume-theme-macchiato](https://github.com/biosan/jsonresume-theme-macchiato) —— 两种排版的设计系统

> 简历内容的真实性由你自己负责：TailorCV 帮你把真实经历表达得更好，但强主张必须有证据。
