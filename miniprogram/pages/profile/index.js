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

const PROFILE_PAGE_ROUTE_MAP = {
  我的订单: "/pages/my-orders/index",
  我的收藏: "/pages/my-favorites/index",
  积分兑换: "/pages/points-exchange/index",
  邀请好友: "/pages/invite-friends/index",
  设置: "/pages/settings/index",
  帮助中心: "/pages/help-center/index",
  关于我们: "/pages/about-us/index",
  我的食养计划: "/pages/my-plan/index",
  我的体质报告: "/pages/analysis/index"
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
    featureMenus: [],
    showMemberSheet: false,
    selectedMemberPlanId: "normal",
    memberPlans: [
      { id: "normal", title: "当前：普通会员", price: 0, unit: "", dark: false, compact: false },
      { id: "gold", title: "推荐：黄金会员", price: 99, unit: "/月", dark: true },
      { id: "diamond", title: "钻石会员", price: 999, unit: "/年", dark: true, compact: true }
    ],
    memberBenefits: ["基础体质测评", "查看食养配方", "购物积分累积", "客服咨询"],
    memberWelfares: [
      { icon: "/assets/profile-pages/vip/gift_icon.png", label: "生日礼包" },
      { icon: "/assets/profile-pages/vip/activity_icon.png", label: "节日优惠" },
      { icon: "/assets/profile-pages/vip/new_icon.png", label: "新品试用" },
      { icon: "/assets/profile-pages/vip/vip_icon.png", label: "专属活动" }
    ],
    memberFaqs: [
      {
        id: "f1",
        q: "Q：会员可以退款吗?",
        a: "A：开通后7天内未使用任何会员权益可申请全额退。"
      },
      {
        id: "f2",
        q: "Q：积分如何使用?",
        a: "A：积分可在商城购物时抵扣现金，100积分=1元。"
      },
      {
        id: "f3",
        q: "Q：会员到期后怎么办?",
        a: "A：到期后自动转为普通会员，可随时续费恢复权益。"
      }
    ]
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
    if (name === "会员升级") {
      this.openMemberSheet()
      return
    }
    const url = PROFILE_PAGE_ROUTE_MAP[name]
    if (url) {
      wx.navigateTo({ url })
      return
    }
    wx.showToast({
      title: `${name}功能待接入`,
      icon: "none"
    })
  },
  openMemberSheet() {
    this.setData({ showMemberSheet: true })
  },
  closeMemberSheet() {
    this.setData({ showMemberSheet: false })
  },
  selectMemberPlan(e) {
    const { id } = e.currentTarget.dataset
    this.setData({ selectedMemberPlanId: id })
  },
  confirmMemberUpgrade() {
    const current = this.data.memberPlans.find((item) => item.id === this.data.selectedMemberPlanId)
    if (!current) return
    wx.showToast({
      title: `已选择${current.title}，支付流程待接入`,
      icon: "none"
    })
  },
  noop() {}
})
