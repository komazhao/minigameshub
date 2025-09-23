# MiniGamesHub SEO 首页冲刺计划（可执行版 2.0）

面向目标：通过“技术抓取 + 内容集群 + 站内结构 + 品牌权威”的组合拳，在 6 个月内让核心关键词进入首页，并稳定可持续增长。

---

## 1) 目标与 KPI（含基线与验收）
- 6 个月总目标：Top10 关键词 ≥ 15；自然流量占比 ≥ 40%；移动端 LCP < 2.5s，CLS < 0.1。
- 3 个月阶段：Top20 关键词 ≥ 30；非品牌自然流量环比 +50%；被索引页面（游戏/分类/集合）覆盖率 ≥ 95%。
- 1 个月阶段：完成技术体检 + 结构化数据 + 内链治理；GSC 有效索引率 ≥ 90%；首页/集合/分类页 SERP 片段切换为英文。
- 验收口径：GSC 覆盖与体验报告、Lighthouse/CrUX 指标、GA4 自然流量与互动、第三方排名工具。

备注：上线前记录基线（覆盖、抓取错误、核心 Web Vitals、主要关键词现状）。

---

## 2) 已完成（2025-09 更新）
- 统一语言与索引信号：`Content-Language: en`，全站英文化，FAQ/JSON-LD 英文；屏蔽 .md/.sql/内部文件索引（X‑Robots‑Tag/robots.txt）。
- 站点地图：`sitemap.xml` 分离 pages/categories/games/images；robots.txt 指向。
- 规范化：全站 canonical；集合/分类/游戏模板已具备 JSON‑LD（WebSite/SearchAction、CollectionPage/ItemList、Game）。
- 广告：AdSense 全局脚本、`ads.txt`、CSP 兼容检查。

---

## 3) 分阶段路线与“可立即执行”的 To‑Do

### A. 0–7 天（Quick Wins：技术与结构，最快落地）
1) GSC/必备提交
   - 提交/刷新 `https://minigameshub.co/sitemap.xml`；为优先 URL 清单逐个“请求编入索引”（见附录）。
   - 完成 Search Appearance → 结构化数据报错清零（若有）。
   - 负责人：SEO；验收：GSC 显示已获取 + 无错误。

2) 站内结构与内链
   - 确认 Header/Footer 的“Featured/New/Popular/8 类分类/Random”均畅通，站内点击≤2次达到分类页与集合页。
   - 在首页与集合页加“热门分类”区块的交叉内链（已存在的可扩充为≥12个入口）。
   - 负责人：前端；验收：抓取工具内链深度分布改善，404/重定向链清零。

3) 分类与集合页可读内容补强（可程序化）
   - 每个分类页顶部加入 80–120 字英文简介 + 3 个常见问题（FAQ JSON‑LD 与页面文案一致）。
   - 集合页（Featured/New/Popular）各补 60–100 字模块说明，含内部链接（指向分类/热门游戏）。
   - 负责人：内容 + 前端；验收：页面首屏可见文本>120字，FAQ 通过 Rich Results 测试。

4) 性能与可抓取
   - 首页首屏图片/关键脚本预加载或懒加载策略复核；CLS 监控（AdSense 预留位或开启 Auto Ads“减少位移”设置）。
   - 移动端 LCP < 2.5s（以 75 百分位为准），CLS < 0.1。
   - 负责人：前端；验收：Lighthouse 移动端得分>90；CLS/LCP 达标。

5) 监控面板
   - GA4/GSC 看板：收录覆盖/结构化/查询点击/Top 页面；每周自动快照。
   - 负责人：SEO；验收：看板链接可用，字段齐全。

### B. 第 2–4 周（内容集群与模板升级）
1) 关键词与信息架构
   - 输出 ≥ 120 关键词矩阵（主题/意图/难度/页面类型），按“Pillar → Cluster → 详情”映射到站内信息架构。
   - 负责人：SEO；验收：矩阵表评审通过，进入排期。

2) Pillar 页 3 个（程序化 + 编辑）
   - 示例：Puzzle 合集、Two‑Player/Multi‑player 合集、Relax/Idle 合集；每页 ≥ 1200 字，含精选 Top10、FAQ、面包屑、相关推荐。
   - 负责人：内容 + 前端；验收：三页上线并进入 sitemap-pages，GSC 报告无结构化错误。

3) Cluster 内容（每周≥5 篇）
   - 子主题：攻略/Top 列表/玩法技巧，与 Pillar 双向内链；每篇 ≥ 600 字，图文并茂（首图加 `width/height` 防 CLS）。
   - 负责人：内容；验收：每周发布清单与 URL 全部入 sitemap。

4) 游戏详情模板增强
   - 在 `Game` JSON‑LD 中补充 `video`（若可）、`faq`（3 条）与更精炼的 `description`；标题模板 A/B：含类别词与动词。
   - 增加“相关推荐（同分类 6–8 条）”模块与内链。
   - 负责人：前端；验收：随机抽查 20 页通过 Rich Results，GSC 选定 canonical 与模板一致。

5) 内链与锚文本标准
   - 统一锚文本体系：分类词（Action/Puzzle…），意图词（Best/Free/Online），品牌词（MiniGamesHub）。
   - 负责人：SEO；验收：抽查 30 页，内部链接≥10/页，空链/重复链<5%。

### C. 第 5–12 周（增长与权威）
1) 外链与共建
   - 每月 2 次开发者/资源库合作；向教育/资源型网站提交精选合辑；争取 20 条 DR>40 外链。
   - 负责人：SEO+BD；验收：外链清单、锚文本、落地页多样化。

2) 品牌信号与社媒
   - 每周 2 条试玩短视频/图文（带本站链接），促进品牌词检索。
   - 负责人：市场；验收：品牌词曝光/点击上升。

3) 体验与转化
   - 详情页：评分/收藏/相关推荐完善；集合页：排序/筛选使用率提升。
   - 负责人：产品/前端；验收：GA4 互动指标（停留、点击率）提升 20% 以上。

### D. 第 3–6 个月（规模化与稳定）
1) Programmatic SEO 扩张
   - 覆盖更多长尾集合（平台、时长、玩法、难度、年龄段），模板化生成与人工校对结合。
2) 国际化准备（可选）
   - 若新增西语/葡语等：/es/ 结构、`hreflang`、翻译质量与关键词本地化。
3) 持续技术回归
   - 每月一次：抓取/索引/结构化/性能全链路回归，消除退化。

---

## 4) 任务模板（责任/产出/验收/指标）
为每个任务记录以下字段，建议用 Issue/Notion 统一管理：
- 负责人/协作：SEO | 前端 | 内容 | 设计 | 产品 | BD
- 产出：页面/模板/脚本/文案/报告链接
- 验收标准（Definition of Done）：如“Lighthouse 移动≥90 且 CLS<0.1”、“Rich Results 通过且 GSC 无错误”
- 指标：影响的 KPI 与监控位置（GSC/GA4/Looker Studio）

示例（分类页简介补强）：
- 负责人：内容 + 前端
- 产出：8 个分类页顶部简介（80–120 字）、3 个 FAQ（页面展示 + JSON‑LD）
- 验收：随机抽查 8/8 页面可见简介；FAQ Rich Results 通过
- 指标：分类页 CTR、平均停留时长、收录率

---

## 5) 技术与模板规范（落地细则）
- 结构化数据：
  - 首页：`Organization`、`WebSite` + `SearchAction`、可选 `BreadcrumbList`（若展示）。
  - 分类/集合：`CollectionPage` + `ItemList`，`numberOfItems` 与前端可见数量一致。
  - 详情：`Game`（可选 `VideoObject`、`FAQPage`）、`BreadcrumbList`；可加 `AggregateRating`（注意与真实展示一致）。
- HTML/索引：`<html lang="en">`、`Content-Language: en`、唯一 canonical；避免重复模板导致的重复描述。
- 性能：首屏图片 `width/height` 固定；脚本拆分与懒加载；预加载关键资源；广告位预留（防 CLS）。
- Robots/Sitemaps：禁止非页面目录与文件类型索引；站点地图含所有可抓取目标；更新 `lastmod`。
- 内链：面包屑 + 页尾导航 + 相关推荐；点击≤3 次可达任意目标分类。

---

## 6) 监控与节奏
- 每日：GSC 覆盖异常、服务器可用性、主要页面是否翻译/渲染异常。
- 每周：新增收录量、Top 查询词/页面、结构化数据报告、Lighthouse 移动端得分。
- 每月：关键词排名分布、自然流量/互动、内容产出完成率、外链新增数量、竞争对手对比。

---

## 7) 风险与应对
- 大改版风险：灰度 + 回滚预案；变更前后各抽样对比。
- 抓取波动：及时“请求编入索引”，同时用“移除过时内容”刷新顽固片段。
- 合规：游戏版权与广告政策遵从（AdSense/隐私/未成年人）。
- 外链质量：拒绝垃圾链接；定期清理有害链接。

---

## 8) 附录：优先 URL 清单（用于 GSC 手动“请求编入索引”）
- 核心与集合
  - https://minigameshub.co/
  - https://minigameshub.co/collections/featured
  - https://minigameshub.co/collections/new
  - https://minigameshub.co/collections/popular
- 分类（8）
  - https://minigameshub.co/collections/category/action
  - https://minigameshub.co/collections/category/adventure
  - https://minigameshub.co/collections/category/arcade
  - https://minigameshub.co/collections/category/puzzle
  - https://minigameshub.co/collections/category/racing
  - https://minigameshub.co/collections/category/shooting
  - https://minigameshub.co/collections/category/simulation
  - https://minigameshub.co/collections/category/sports
- 代表性游戏
  - https://minigameshub.co/games/bus-school-park-driver
  - https://minigameshub.co/games/starpoly
- 基础页
  - https://minigameshub.co/privacy-policy
  - https://minigameshub.co/terms-of-service
  - https://minigameshub.co/contact
- 站点地图（在“站点地图”处提交）
  - https://minigameshub.co/sitemap.xml

---

> 采用“先快后稳”的策略：第 1 周完成技术与结构 Quick Wins，2–4 周内产出内容集群的“第一梯队”，第 2–3 个月拉动外链与品牌信号。每周复盘、月度回归，确保所有任务均有负责人、产出链接、明确验收与指标。
