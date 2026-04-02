const { getLayoutMetrics } = require("../../utils/layout")

const MOCK_AUTH_DATA = {
  navTitle: "趣味分析",
  guestCompleteTitle: "测评完成！",
  guestCompleteSubTitle: "AI已生成您的初步体质分析",
  guestTag: "趣味分析",
  mainType: "平和质",
  mainTypeHint: "体质平和，身心健康",
  mainScore: 75,
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
    navTitle: "",
    guestCompleteTitle: "",
    guestCompleteSubTitle: "",
    guestTag: "",
    mainType: "",
    mainTypeHint: "",
    mainScore: 0,
    guestUnlockTitle: "",
    guestUnlockItems: [],
    guestAuthTitle: "",
    guestAuthDesc: "",
    guestPrimaryButton: "",
    guestBackText: ""
  },
  onLoad() {
    this.syncLayout()
    this.setData(deepClone(MOCK_AUTH_DATA))
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
  goLogin() {
    wx.setStorageSync("isLogin", true)
    wx.setStorageSync("logged", true)
    wx.redirectTo({ url: "/pages/analysis-report/index?logged=1&from=analysis-auth" })
  }
})
