# 合一食养（微信小程序）

## 运行方式
1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择当前仓库根目录。
4. `AppID` 可使用测试号或 `touristappid`。
5. 确认 `miniprogramRoot` 为 `miniprogram/`（见 `project.config.json`）。

## 页面总览
当前小程序在 `miniprogram/app.json` 中注册了 25 个页面，分为 4 个 Tab 主页面和 21 个非 Tab 页面。

### 新增页面（本次补充）
| 页面 | 路由 | 说明 |
| --- | --- | --- |
| 登录 | `pages/login/index` | 微信授权登录入口，含协议阅读弹窗。 |
| 购物车 | `pages/cart/index` | 购物车结算页，含优惠券、金额明细、地址管理弹窗。 |
| 体质评估 | `pages/constitution-assessment/index` | 体质评估流程页面。 |
| AI 分析授权 | `pages/analysis-auth/index` | AI 分析的授权确认页。 |
| AI 分析报告 | `pages/analysis-report/index` | AI 分析结果报告页。 |
| 商品详情 | `pages/food-detail/index` | 商品详情与规格展示页。 |

### Tab 主页面
| 页面 | 路由 | 说明 |
| --- | --- | --- |
| 首页 | `pages/home/index` | 展示活动轮播、今日身体状况、AI 快捷入口、今日推荐与养生提示。 |
| 商城 | `pages/mall/index` | 商品列表与基础购买交互（演示数据）。 |
| 食养 | `pages/diet/index` | 食养入口页，展示定制计划摘要、周计划和餐次切换。 |
| 我的 | `pages/profile/index` | 用户中心，包含用户信息、功能入口、会员升级弹层。 |

### 非 Tab 页面
| 页面 | 路由 | 主要用途 | 常见入口 |
| --- | --- | --- | --- |
| 登录 | `pages/login/index` | 微信授权登录、协议确认。 | 小程序启动页/退出登录后 |
| 活动详情 | `pages/activity-detail/index` | 查看活动介绍、亮点和报名信息。 | 首页活动轮播 |
| 购物车 | `pages/cart/index` | 商品结算、优惠券使用、地址管理。 | 商城页/商品详情页 |
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
| 体质评估 | `pages/constitution-assessment/index` | AI 分析前的体质评估入口/说明页。 | AI 分析流程入口 |
| AI 测评问答 | `pages/analysis-quiz/index` | 多题问答流程，提交后可进入上传步骤。 | AI 趣味分析页 |
| AI 分析授权 | `pages/analysis-auth/index` | 授权提示与登录引导。 | AI 分析流程中间页 |
| AI 图片上传 | `pages/analysis-upload/index` | 上传舌苔/面色样本图片，后续生成报告（待接入）。 | AI 测评问答页 |
| AI 分析报告 | `pages/analysis-report/index` | 展示 AI 分析结果与建议。 | AI 图片上传页 |
| 商品详情 | `pages/food-detail/index` | 展示商品详情、规格、推荐信息。 | 商城页商品卡片 |

## 页面流程关系（核心）
1. `登录 -> 首页`
2. `首页活动轮播 -> 活动详情`
3. `商城 -> 商品详情 -> 购物车 -> 结算`
4. `首页 -> AI 趣味分析 -> AI 测评问答 -> AI 分析授权 -> AI 图片上传 -> AI 分析报告`
5. `食养 -> 定制计划 -> 我的计划`
6. `我的 -> 会员升级 / 积分兑换 / 设置 / 我的订单 / 我的收藏 / 邀请好友 / 帮助中心 / 关于我们`
7. `任意页面底部中间 AI 按钮 -> AI 聊天`

## 弹窗与浮层
| 名称 | 位置 | 类型 | 说明 |
| --- | --- | --- | --- |
| 协议弹窗 | `components/agreement-popup` | 通用组件弹窗 | 登录页用于展示《用户协议》《隐私政策》。 |
| 会员升级弹层 | `pages/profile/index` | 页面内底部抽屉 | 展示会员套餐、权益与开通入口。 |
| 优惠券弹窗 | `pages/cart/index` | 页面内底部弹窗 | 选择可用/不可用优惠券。 |
| 金额明细弹窗 | `pages/cart/index` | 页面内底部弹窗 | 展示商品总价、配送费、优惠与合计。 |
| 地址选择弹窗 | `pages/cart/index` | 页面内底部弹窗 | 选择收货地址。 |
| 新增/编辑地址弹窗 | `pages/cart/index` | 页面内底部弹窗 | 新建或编辑收货地址。 |
| 语音录制浮层 | `pages/ai-chat/index` | 页面内浮层 | 按住说话时显示录音提示。 |
| 退出登录确认框 | `pages/settings/index` | 系统 `wx.showModal` | 用户确认是否退出当前账号。 |

## 通用组件
| 组件 | 路径 | 说明 |
| --- | --- | --- |
| `title-view` | `miniprogram/components/title-view` | 统一“标题 + 装饰线”样式组件，支持 `text`，`decSrc` 为可选。 |
| `agreement-popup` | `miniprogram/components/agreement-popup` | 协议阅读弹窗组件，支持 `show/title/content` 与确认回调。 |

## 网络请求（统一 `utils/request`）
项目已新增统一网络请求模块：`miniprogram/utils/request.js`。

### 能力
1. 统一封装 `request/get/post/put/del`。
2. 自动打印请求信息（URL、Method、Data）和请求头（Header）。
3. 自动打印接口返回信息（`statusCode/data/header`）。
4. 支持通用 `Authorization` 注入与 token 管理。

### token 管理
1. `setAuthToken(token)`：登录成功后设置并持久化 token。
2. `getAuthToken()`：读取当前 token。
3. `clearAuthToken()`：退出登录时清空 token。
4. `initAuthToken()`：应用启动时从本地存储恢复 token。

### 使用示例
```js
const api = require('../../utils/request')

// GET
api.get('/user/profile', null, {
  baseUrl: 'https://api.example.com'
})

// POST
api.post('/order/create', { skuId: 1, count: 2 }, {
  baseUrl: 'https://api.example.com'
})
```

## 说明
1. 当前大量页面使用 MOCK 数据与占位交互，涉及支付、下单、报告生成等功能处于“待接入”状态。
2. 视觉规范以 `ui/` 目录设计稿为参考，页面样式在各自 `index.wxss` 与 `pages/profile-sub/common.wxss` 中维护。
