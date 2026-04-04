# 项目概览

微信小程序原生开发项目，健康饮食/体质分析类应用。

## 技术栈
- 微信小程序原生框架（无第三方 UI 库）
- CommonJS 模块规范（require / module.exports）
- 自定义 TabBar（custom-tab-bar/）
- 全局自定义导航栏（navigationStyle: custom）

## 目录结构
```
miniprogram/
├── app.js              # 全局入口，初始化 token、布局信息、登录检查
├── app.json            # 页面注册、tabBar 配置
├── app.wxss            # 全局样式
├── pages/              # 页面
├── components/         # 公共组件
├── custom-tab-bar/     # 自定义底部导航
├── http/               # 接口层
│   ├── paths.js        # 所有 API 路径常量（统一维护）
│   └── auth.js         # 认证相关接口
├── utils/
│   └── request.js      # HTTP 请求封装
└── assets/             # 静态资源
```

## 页面列表
- login — 登录
- home — 首页（TabBar）
- mall — 商城（TabBar）
- diet — 食养（TabBar）
- profile — 我的（TabBar）
- analysis-quiz — 体质问卷
- analysis / analysis-auth / analysis-upload / analysis-report — 分析流程
- constitution-assessment — 体质评估
- diet-plan / my-week-plan — 饮食计划
- ai-chat — AI 对话
- food-detail — 食物详情
- activity-detail — 活动详情
- cart / my-orders / my-favorites — 购物相关
- member-upgrade / points-exchange / invite-friends — 会员/积分
- help-center / about-us / settings — 设置类页面

## 后端接口
- 接口域名：`https://api.tyhctech.com`
- 所有路径常量统一在 `miniprogram/http/paths.js` 维护
- 按业务模块分组（auth、assessment 等）
- 接口响应结构：`{ code, msg, data }`，code=200 为成功
- 页面中请求接口，需要loading，成功后dismiss
- 所有网络请求使用request.js
