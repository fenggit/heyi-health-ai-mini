# 合一食养（微信小程序）

## 运行方式
1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择当前仓库根目录。
4. `AppID` 可使用测试号或 `touristappid`。
5. 确认 `miniprogramRoot` 为 `miniprogram/`（见 `project.config.json`）。

## 页面总览
当前小程序在 `miniprogram/app.json` 中注册了 19 个页面，分为 4 个 Tab 主页面和 15 个二级页面。

### Tab 主页面
| 页面 | 路由 | 说明 |
| --- | --- | --- |
| 首页 | `pages/home/index` | 展示活动轮播、今日身体状况、AI 快捷入口、今日推荐与养生提示。 |
| 商城 | `pages/mall/index` | 商品列表与基础购买交互（演示数据）。 |
| 食养 | `pages/diet/index` | 食养入口页，展示定制计划摘要、周计划和餐次切换。 |
| 我的 | `pages/profile/index` | 用户中心，包含用户信息、功能入口、会员升级弹层。 |

### 二级页面
| 页面 | 路由 | 主要用途 | 常见入口 |
| --- | --- | --- | --- |
| 活动详情 | `pages/activity-detail/index` | 查看活动介绍、亮点和报名信息。 | 首页活动轮播 |
| 定制计划 | `pages/diet-plan/index` | 配置食养周期、体质、用餐时间和偏好，生成计划。 | 食养页、我的计划入口 |
| 我的计划 | `pages/my-plan/index` | 查看已生成的食养计划、每日餐次与计划信息。 | 食养页 |
| 帮助中心 | `pages/help-center/index` | FAQ 分类、联系客服渠道（电话/邮箱等）。 | 我的页功能入口 |
| 关于我们 | `pages/about-us/index` | 品牌使命、价值、团队、成果与联系信息。 | 我的页功能入口 |
| 会员升级 | `pages/member-upgrade/index` | 会员套餐选择、权益说明、专属福利、常见问题。 | 我的页“会员升级” |
| 积分兑换 | `pages/points-exchange/index` | 查看积分余额与可兑换礼品。 | 我的页功能入口 |
| 设置 | `pages/settings/index` | 偏好设置（通知、深色模式）、退出登录。 | 我的页功能入口 |
| 我的订单 | `pages/my-orders/index` | 查看订单列表、订单详情/物流（待接入）。 | 我的页功能入口 |
| 我的收藏 | `pages/my-favorites/index` | 查看收藏内容并取消收藏。 | 我的页功能入口 |
| 邀请好友 | `pages/invite-friends/index` | 查看推荐码、邀请奖励和好友邀请记录。 | 我的页功能入口 |
| AI 聊天 | `pages/ai-chat/index` | 文本/语音聊天输入与消息展示（演示版）。 | 底部自定义 Tab 中间 AI 按钮 |
| AI 趣味分析 | `pages/analysis/index` | 分析说明页，阅读声明并进入测评。 | 首页 AI 趣味分析入口 |
| AI 测评问答 | `pages/analysis-quiz/index` | 多题问答流程，提交后可进入上传步骤。 | AI 趣味分析页 |
| AI 图片上传 | `pages/analysis-upload/index` | 上传舌苔/面色样本图片，后续生成报告（待接入）。 | AI 测评问答页 |

## 页面流程关系（核心）
1. `首页 -> AI 趣味分析 -> AI 测评问答 -> AI 图片上传`
2. `食养 -> 定制计划 -> 我的计划`
3. `我的 -> 会员升级 / 积分兑换 / 设置 / 我的订单 / 我的收藏 / 邀请好友 / 帮助中心 / 关于我们`
4. `首页活动轮播 -> 活动详情`
5. `任意页面底部中间 AI 按钮 -> AI 聊天`

## 通用组件
| 组件 | 路径 | 说明 |
| --- | --- | --- |
| `title-view` | `miniprogram/components/title-view` | 统一“标题 + 装饰线”样式组件，支持 `text`，`decSrc` 为可选。 |

## 说明
1. 当前大量页面使用 MOCK 数据与占位交互，涉及支付、下单、报告生成等功能处于“待接入”状态。
2. 视觉规范以 `ui/` 目录设计稿为参考，页面样式在各自 `index.wxss` 与 `pages/profile-sub/common.wxss` 中维护。
