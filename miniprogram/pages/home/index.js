const { getLayoutMetrics } = require("../../utils/layout")

function createProgressSegments(filled, total) {
  return Array.from({ length: total }, (_, index) => ({
    id: index,
    active: index < filled
  }))
}

const MOCK_HOME_DATA = {
  greetingTitle: "合一食养",
  greetingText: "早上好，开启健康新一天~",
  activityBanners: [
    {
      id: "tea-experience",
      image: "/assets/test/home-banner1.png"
    },
    {
      id: "food-market",
      image: "/assets/test/home-banner2.png"
    }
  ],
  healthStatus: {
    title: "今日身体状况：",
    level: "良好"
  },
  healthMetrics: [
    {
      id: "heart-rate",
      label: "心率",
      value: "72",
      icon: "/assets/icons/heart.png"
    },
    {
      id: "steps",
      label: "步数",
      value: "6,842",
      icon: "/assets/icons/steps.png"
    },
    {
      id: "sleep",
      label: "睡眠",
      value: "7.5h",
      icon: "/assets/icons/sleep.png"
    }
  ],
  hydration: {
    title: "今日果蔬汁摄入：",
    value: "2/2 杯",
    segments: createProgressSegments(10, 10)
  },
  shortcuts: [
    {
      id: "analysis",
      title: "AI趣味分析",
      description: "3分钟分析生活趋势",
      icon: "/assets/icons/ai.png",
      styleType: "robot",
      path: "/pages/analysis/index"
    },
    {
      id: "constitution",
      title: "AI体质测评",
      description: "个性化推荐食养方案",
      styleType: "bubble",
      path: "/pages/analysis-quiz/index"
    }
  ],
  recommendation: {
    title: "AI推荐：今日专属果蔬汁",
    actionText: "查看详情",
    image: "/assets/test/home-banner2.png",
    name: "养胃气血汁",
    description: "根据您的体质特点，推荐富含铁质和维生素C的配方，有助于补血养气，改善春季疲乏。",
    tags: ["补气血", "养脾胃"]
  },
  tip: {
    title: "今日养生提示",
    content: "春季养肝正当时，建议多食用绿叶蔬菜和柑橘类水果，早睡早起，适当运动，保持心情舒畅。"
  }
}

function fetchHomeData() {
  // TODO: 后续替换为真实接口请求
  return Promise.resolve(JSON.parse(JSON.stringify(MOCK_HOME_DATA)))
}

Page({
  data: {
    topInset: 32,
    bannerCurrent: 0,
    greetingTitle: "",
    greetingText: "",
    activityBanners: [],
    healthStatus: {},
    healthMetrics: [],
    hydration: {},
    shortcuts: [],
    recommendation: {},
    tip: {}
  },
  onLoad() {
    this.syncLayout()
    this.loadPageData()
  },
  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
  },
  syncLayout() {
    const { statusBarHeight } = getLayoutMetrics()
    this.setData({
      topInset: Math.max(statusBarHeight + 12, 32)
    })
  },
  async loadPageData() {
    const payload = await fetchHomeData()
    this.setData(payload)
  },
  onBannerChange(e) {
    this.setData({
      bannerCurrent: e.detail.current
    })
  },
  openShortcut(e) {
    const { path } = e.currentTarget.dataset
    if (!path) return
    wx.navigateTo({ url: path })
  }
})
