const { getLayoutMetrics } = require("../../utils/layout")

Page({
  data: {
    topInset: 32,
    pageTitle: "打卡中心",
    pageSubtitle: "记录健康生活，分享养生心得",
    stats: [
      { label: "喝汁累计打卡", value: 15, unit: "次" },
      { label: "轻断食累计打卡", value: 12, unit: "天" }
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
  },

  syncLayout() {
    const { statusBarHeight } = getLayoutMetrics()
    this.setData({
      topInset: Math.max(statusBarHeight + 12, 32)
    })
  },

  onPlanTap(e) {
    const { id } = e.currentTarget.dataset
    if (id === 'drink') {
      wx.navigateTo({ url: '/pages/checkin-drink/index' })
    } else if (id === 'fasting') {
      wx.navigateTo({ url: '/pages/checkin-fasting/index' })
    } else if (id === 'share') {
      wx.navigateTo({ url: '/pages/checkin-share/index' })
    }
  }
})
