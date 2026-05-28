const { getLayoutMetrics } = require("../../utils/layout")

Page({
  data: {
    topInset: 32,
    pageTitle: "打卡中心",
    pageSubtitle: "记录健康生活，分享养生心得",
    stats: [
      { label: "喝汁累计打卡", value: "-", unit: "次" },
      { label: "轻断食累计打卡", value: "-", unit: "天" }
    ],
    plans: [
      { id: "drink", name: "喝汁打卡", icon: "/assets/checkin/checkin_drinks_icon.png" },
      { id: "fasting", name: "轻断食打卡", icon: "/assets/checkin/checkin_food_icon.png" },
      { id: "share", name: "内容分享", icon: "/assets/checkin/checkin_content_icon.png" }
    ]
  },

  onLoad() {
    this.syncLayout()
  },

  onShow() {
    if (typeof this.getTabBar === "function") {
      const tabBar = this.getTabBar()
      if (tabBar) tabBar.setData({ selected: 2 })
    }
    this.syncCheckInStats()
  },

  syncLayout() {
    const { statusBarHeight } = getLayoutMetrics()
    this.setData({
      topInset: Math.max(statusBarHeight + 12, 32)
    })
  },

  /**
   * 从 globalData.userInfo.stat 同步打卡累计次数
   * 未登录时保持 "-"
   */
  syncCheckInStats() {
    const app = getApp()
    const isLogin = app && app.globalData && app.globalData.isLogin
    if (!isLogin) {
      this.setData({
        'stats[0].value': '-',
        'stats[1].value': '-'
      })
      return
    }
    const userInfo = app.globalData.userInfo
    const stat = (userInfo && userInfo.stat) || {}
    const juiceCount = stat.juiceCheckInTotalCount != null ? stat.juiceCheckInTotalCount : '-'
    const fastingCount = stat.fastingCheckInTotalCount != null ? stat.fastingCheckInTotalCount : '-'
    this.setData({
      'stats[0].value': juiceCount,
      'stats[1].value': fastingCount
    })
  },

  /**
   * 未登录时弹提示并跳转登录页
   */
  requireLogin() {
    wx.showModal({
      title: '请先登录',
      content: '登录后即可使用打卡功能',
      confirmText: '去登录',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/login/index' })
        }
      }
    })
  },

  onPlanTap(e) {
    const app = getApp()
    const isLogin = app && app.globalData && app.globalData.isLogin
    if (!isLogin) {
      this.requireLogin()
      return
    }
    const { id } = e.currentTarget.dataset
    if (id === 'drink') {
      wx.navigateTo({ url: '/pages/checkin-drink/index' })
    } else if (id === 'fasting') {
      wx.navigateTo({ url: '/pages/checkin-fasting/index' })
    } else if (id === 'share') {
      wx.navigateTo({ url: '/pages/checkin-list/index' })
    }
  }
})
