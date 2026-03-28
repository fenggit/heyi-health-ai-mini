const { getLayoutMetrics } = require("../../utils/layout")

const MOCK_PROFILE_DATA = {
  user: {
    nickname: "西兰花护体专员",
    userId: "20260327",
    memberLevel: "普通会员",
    points: 1280
  },
  stats: [
    { label: "收藏配方", value: 12 },
    { label: "历史订单", value: 8 },
    { label: "优惠券", value: 5 },
    { label: "推荐好友", value: 3 }
  ],
  dataMenus: ["我的食养计划", "我的体质报告"],
  allMenus: ["我的订单", "我的收藏", "积分兑换", "邀请好友"],
  settingsMenus: ["设置", "帮助中心", "关于我们"]
}

function fetchProfileData() {
  // TODO: 后续替换为个人中心接口
  return Promise.resolve(JSON.parse(JSON.stringify(MOCK_PROFILE_DATA)))
}

Page({
  data: {
    topInset: 32,
    user: {},
    stats: [],
    dataMenus: [],
    allMenus: [],
    settingsMenus: []
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
