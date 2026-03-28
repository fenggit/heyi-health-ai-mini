const { getLayoutMetrics } = require("../../utils/layout")

const MOCK_PROFILE_DATA = {
  pageTitle: "个人中心",
  user: {
    nickname: "西兰花护体专员",
    userId: "20260327",
    memberLevel: "普通会员",
    points: 1280
  },
  quickEntry: {
    name: "我的主页",
    icon: "/assets/profile/home.png"
  },
  stats: [
    { label: "收藏配方", value: 12 },
    { label: "历史订单", value: 8 },
    { label: "优惠券", value: 5 },
    { label: "推荐好友", value: 3 }
  ],
  featureMenus: [
    { name: "我的食养计划", icon: "/assets/profile/plan.png" },
    { name: "我的体质报告", icon: "/assets/profile/report.png" },
    { name: "我的订单", icon: "/assets/profile/order.png" },
    { name: "我的收藏", icon: "/assets/profile/collection.png" },
    { name: "积分兑换", icon: "/assets/profile/points.png" },
    { name: "邀请好友", icon: "/assets/profile/share.png" },
    { name: "设置", icon: "/assets/profile/settings.png" },
    { name: "帮助中心", icon: "/assets/profile/help.png" },
    { name: "关于我们", icon: "/assets/profile/about.png" }
  ]
}

function fetchProfileData() {
  // TODO: 后续替换为个人中心接口
  return Promise.resolve(JSON.parse(JSON.stringify(MOCK_PROFILE_DATA)))
}

Page({
  data: {
    topInset: 32,
    pageTitle: "",
    user: {},
    quickEntry: {},
    stats: [],
    featureMenus: []
  },
  onLoad() {
    this.syncLayout()
    this.loadPageData()
  },
  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
  },
  syncLayout() {
    const { statusBarHeight } = getLayoutMetrics()
    this.setData({
      topInset: Math.max(statusBarHeight + 12, 32)
    })
  },
  async loadPageData() {
    const payload = await fetchProfileData()
    this.setData(payload)
  },
  openItem(e) {
    const { name } = e.currentTarget.dataset
    wx.showToast({
      title: `${name}功能待接入`,
      icon: "none"
    })
  }
})
