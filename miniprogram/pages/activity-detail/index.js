const { getLayoutMetrics } = require("../../utils/layout")

const BOOKING_NOTES = [
  "活动名额有限，请在活动开始前完成预约确认。",
  "提交报名后将有工作人员电话确认席位与签到信息。",
  "如需取消或改期，请至少提前24小时联系主办方。",
  "活动内容以现场安排为准，部分环节可能会根据参与人数微调。"
]

const ACTIVITY_LIST = [
  {
    id: "tea-experience",
    tag: "活动",
    statusType: "open",
    statusText: "报名中",
    name: "春季养生沙龙",
    dateTime: "2026年3月23日 14:00 ~ 17:00",
    location: "合一食养体验中心（徐汇店）",
    seatText: "仅剩8席",
    seatType: "hot",
    highlights: ["中医专家讲座：春季养肝护脾", "免费AI体质测评", "养生茶饮品鉴体验", "定制食养方案咨询"],
    price: "0",
    actionText: "立即报名",
    open: true
  },
  {
    id: "food-market",
    tag: "沙龙",
    statusType: "coming",
    statusText: "即将开放",
    name: "茶道与食养文化体验",
    dateTime: "2026年4月6日 10:00 ~ 12:00",
    location: "合一茶室（静安店）",
    seatText: "限20人",
    seatType: "normal",
    highlights: ["茶道基础知识讲解", "不同体质适宜茶品推荐", "现场品茶体验", "茶具礼盒优惠购买"],
    price: "99",
    actionText: "敬请期待",
    open: false
  }
]

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
    title: "活动与沙龙",
    subTitle: "参与线下活动，深入了解食养文化",
    activities: [],
    activeActivityId: ""
  },
  onLoad(options) {
    this.syncLayout()
    this.loadPageData(options || {})
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
    const activityId = options.id || ""
    const list = [...ACTIVITY_LIST]
    const hitIndex = list.findIndex((item) => item.id === activityId)
    if (hitIndex > 0) {
      const target = list.splice(hitIndex, 1)[0]
      list.unshift(target)
    }

    this.setData({
      activities: list,
      activeActivityId: list[0] ? list[0].id : ""
    })
  },
  getActivityById(id) {
    const list = this.data.activities || []
    return list.find((item) => item.id === id)
  },
  handleBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: "/pages/home/index" })
  },
  showGuideTips() {
    const content = BOOKING_NOTES.map((item, index) => `${index + 1}. ${item}`).join("\n")
    wx.showModal({
      title: "活动预约说明",
      content,
      showCancel: false,
      confirmText: "我知道了"
    })
  },
  onActionTap(e) {
    const { id, open } = e.currentTarget.dataset
    const target = this.getActivityById(id)
    if (!target) return
    const isOpen = open === true || open === "true" || open === 1 || open === "1"

    this.setData({ activeActivityId: target.id })

    if (!isOpen) {
      wx.showToast({
        title: "活动暂未开放报名",
        icon: "none"
      })
      return
    }
    wx.showToast({
      title: "报名成功，工作人员将尽快联系您",
      icon: "none"
    })
  },
  onShareAppMessage() {
    const current = this.getActivityById(this.data.activeActivityId) || this.data.activities[0] || ACTIVITY_LIST[0]
    return {
      title: `${current.name}｜活动与沙龙`,
      path: `/pages/activity-detail/index?id=${current.id}`
    }
  },
  onShareTimeline() {
    const current = this.getActivityById(this.data.activeActivityId) || this.data.activities[0] || ACTIVITY_LIST[0]
    return {
      title: `${current.name}｜活动与沙龙`,
      query: `id=${current.id}`
    }
  }
})
