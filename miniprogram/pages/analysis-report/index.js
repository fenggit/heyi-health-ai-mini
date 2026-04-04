const { getLayoutMetrics } = require("../../utils/layout")

const AGREEMENT_CONTENT = '基于中医体质理论和现代营养学，运用AI技术为每一位用户提供个性化的食养方案，帮助大家通过科学饮食改善体质，实现健康生活。\n\n基于中医体质理论和现代营养学，运用AI技术为每一位用户提供个性化的食养方案，帮助大家通过科学饮食改善体质，实现健康生活。'

const PRIVACY_CONTENT = '基于中医体质理论和现代营养学，运用AI技术为每一位用户提供个性化的食养方案，帮助大家通过科学饮食改善体质，实现健康生活。\n\n基于中医体质理论和现代营养学，运用AI技术为每一位用户提供个性化的食养方案，帮助大家通过科学饮食改善体质，实现健康生活。'

const MOCK_REPORT_DATA = {
  navTitle: "趣味分析",
  reportTitle: "体质报告",
  finishedTime: "测评完成时间：2026年3月19日",
  mainType: "平和质",
  mainTypeHint: "体质平和，身心健康",
  mainScore: 75,
  healthStatus: "良好",
  improveSpace: "中等",
  constitutions: [
    { name: "平和质", score: 75 },
    { name: "气虚质", score: 45 },
    { name: "阳虚质", score: 30 },
    { name: "阴虚质", score: 25 },
    { name: "痰湿质", score: 20 }
  ],
  secondaryTitle: "次要体质倾向",
  secondaryDesc: "您还表现出气虚质的特征(45分)，气力不足，容易疲劳。建议在日常养生中也要注意调理。",
  adviceTitle: "健康建议",
  adviceGroups: [
    {
      title: "饮食调理",
      color: "green",
      items: ["多食用温和平性食物，如小米、红薯、山药等", "适量补充优质蛋白，如鱼肉、鸡蛋、豆制品", "每日摄入新鲜蔬果，保持营养均衡"]
    },
    {
      title: "生活方式",
      color: "orange",
      items: ["保持规律作息，晚上11点前入睡", "适量运动，如散步、瑜伽、太极等", "保持心情愉悦，避免过度劳累"]
    },
    {
      title: "季节养生",
      color: "blue",
      items: ["春季养肝，多食绿叶蔬菜和酸味食物", "适当户外活动，舒展筋骨"]
    }
  ],
  bottomPrimary: "查看专属食养方案",
  bottomNotice: "建议每3个月重新测评一次，以便及时调整养生方案",
  guestCompleteTitle: "测评完成！",
  guestCompleteSubTitle: "AI已生成您的初步体质分析",
  guestTag: "趣味分析",
  guestUnlockTitle: "授权后您将获得：",
  guestUnlockItems: [
    {
      title: "详细体质分析报告",
      desc: "9大体质类型完整评分与解读"
    },
    {
      title: "专属食养调理方案",
      desc: "AI推荐的个性化饮食、运动建议"
    },
    {
      title: "每日健康追踪",
      desc: "记录饮食、运动、睡眠等健康数据"
    },
    {
      title: "专家在线咨询",
      desc: "中医养生专家一对一指导"
    }
  ],
  guestAuthTitle: "为什么需要授权?",
  guestAuthDesc:
    "授权后可同步您的微信健康数据(步数、睡眠等)，让AI分析更精准，食养方案更个性化。我们承诺保护您的隐私，仅用于生成个性化健康方案。",
  guestPrimaryButton: "微信授权，查看完整报告",
  guestBackText: "返回首页"
}

function deepClone(data) {
  return JSON.parse(JSON.stringify(data))
}

function parseLoginFromQuery(options = {}) {
  if (options.logged === undefined) return null
  const raw = String(options.logged).toLowerCase()
  return raw === "1" || raw === "true" || raw === "yes"
}

function detectLoginFromStorage() {
  const boolLikeKeys = ["isLogin", "logged", "hasLogin"]
  const tokenKeys = ["token", "authToken", "sessionToken"]
  const userKeys = ["userInfo", "profile"]

  const isTruthy = (value) =>
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true" ||
    value === "yes"

  for (const key of boolLikeKeys) {
    const value = wx.getStorageSync(key)
    if (isTruthy(value)) return true
  }
  for (const key of tokenKeys) {
    const value = wx.getStorageSync(key)
    if (typeof value === "string" && value.trim()) return true
  }
  for (const key of userKeys) {
    const value = wx.getStorageSync(key)
    if (value && typeof value === "object" && Object.keys(value).length) return true
  }
  return false
}

Page({
  data: {
    topInset: 32,
    statusBarHeight: 20,
    navBarHeight: 44,
    headerHeight: 64,
    menuWidth: 88,
    menuHeight: 32,
    menuTop: 26,
    menuRight: 12,
    isLoggedIn: false,
    navTitle: "",
    reportTitle: "",
    finishedTime: "",
    mainType: "",
    mainTypeHint: "",
    mainScore: 0,
    healthStatus: "",
    improveSpace: "",
    constitutions: [],
    secondaryTitle: "",
    secondaryDesc: "",
    adviceTitle: "",
    adviceGroups: [],
    bottomPrimary: "",
    bottomNotice: "",
    guestCompleteTitle: "",
    guestCompleteSubTitle: "",
    guestTag: "",
    guestUnlockTitle: "",
    guestUnlockItems: [],
    guestAuthTitle: "",
    guestAuthDesc: "",
    guestPrimaryButton: "",
    guestBackText: "",
    agreed: false,
    popupShow: false,
    popupTitle: "",
    popupContent: ""
  },
  onLoad(options) {
    this.syncLayout()
    this.loadPageData(options)
  },
  syncLayout() {
    const { statusBarHeight, navBarHeight, headerHeight } = getLayoutMetrics()
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const windowWidth = (windowInfo && (windowInfo.windowWidth || windowInfo.screenWidth)) || 375

    let menuWidth = 88
    let menuHeight = 32
    let menuTop = statusBarHeight + (navBarHeight - menuHeight) / 2
    let menuRight = 12
    if (wx.getMenuButtonBoundingClientRect) {
      const menu = wx.getMenuButtonBoundingClientRect()
      if (menu && menu.width && menu.height) {
        menuWidth = menu.width
        menuHeight = menu.height
        menuTop = menu.top || menuTop
        menuRight = Math.max(10, windowWidth - menu.right)
      }
    }
    this.setData({
      topInset: Math.max(headerHeight + 8, 72),
      statusBarHeight,
      navBarHeight,
      headerHeight,
      menuWidth,
      menuHeight,
      menuTop,
      menuRight
    })
  },
  loadPageData(options) {
    const loginFromQuery = parseLoginFromQuery(options)
    const isLoggedIn = loginFromQuery === null ? detectLoginFromStorage() : loginFromQuery
    this.setData({
      ...deepClone(MOCK_REPORT_DATA),
      isLoggedIn
    })
  },
  handleBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: "/pages/home/index" })
  },
  goHome() {
    wx.switchTab({ url: "/pages/home/index" })
  },
  reAnalyze() {
    wx.navigateTo({ url: "/pages/analysis-quiz/index" })
  },
  goLogin() {
    wx.setStorageSync("isLogin", true)
    wx.setStorageSync("logged", true)
    wx.redirectTo({ url: "/pages/analysis-report/index?logged=1&from=report-login" })
  },
  toggleAgreed() {
    this.setData({ agreed: !this.data.agreed })
  },
  openUserAgreement() {
    this.setData({ popupShow: true, popupTitle: "用户协议", popupContent: AGREEMENT_CONTENT })
  },
  openPrivacyPolicy() {
    this.setData({ popupShow: true, popupTitle: "隐私政策", popupContent: PRIVACY_CONTENT })
  },
  onPopupConfirm() {
    this.setData({ popupShow: false })
  },
  openDietPlan() {
    wx.switchTab({ url: "/pages/diet/index" })
  },
  downloadReport() {
    wx.showToast({
      title: "下载功能待接入",
      icon: "none"
    })
  },
  shareReport() {
    wx.showToast({
      title: "分享功能待接入",
      icon: "none"
    })
  }
})
