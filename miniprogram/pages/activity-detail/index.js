const { getLayoutMetrics } = require("../../utils/layout")
const { get } = require("../../utils/request")
const paths = require("../../http/paths")

const BOOKING_NOTES = [
  "活动名额有限，请在活动开始前完成预约确认。",
  "提交报名后将有工作人员电话确认席位与签到信息。",
  "如需取消或改期，请至少提前24小时联系主办方。",
  "活动内容以现场安排为准，部分环节可能会根据参与人数微调。"
]

const STATUS_MAP = {
  SIGNING: { statusType: "open", statusText: "报名中", open: true },
  NOT_START: { statusType: "coming", statusText: "即将开始", open: false },
  COMING: { statusType: "coming", statusText: "即将开始", open: false },
  ENDED: { statusType: "coming", statusText: "已结束", open: false },
  FINISHED: { statusType: "coming", statusText: "已结束", open: false },
  FULL: { statusType: "coming", statusText: "已满员", open: false }
}

function unwrapResponseData(res) {
  if (res && Object.prototype.hasOwnProperty.call(res, "data")) {
    return res.data
  }
  return res || {}
}

function toDisplayText(value, fallback = "") {
  if (value === undefined || value === null) return fallback
  const text = String(value).trim()
  return text || fallback
}

function parseHighlights(row) {
  if (Array.isArray(row.highlights) && row.highlights.length) {
    return row.highlights
      .map((item) => toDisplayText(item, ""))
      .filter(Boolean)
  }

  const summary = toDisplayText(row.summaryText, "")
  if (summary) return [summary]
  return ["活动详情以现场安排为准"]
}

function formatSeat(row) {
  const stockLimit = Number(row.stockLimit)
  const signupCount = Number(row.signupCount)
  const reservationDesc = toDisplayText(row.reservationDesc, "")

  if (Number.isFinite(stockLimit) && stockLimit > 0 && Number.isFinite(signupCount) && signupCount >= 0) {
    const remain = Math.max(stockLimit - signupCount, 0)
    if (remain <= 0) return { seatText: "已满员", seatType: "normal" }
    return {
      seatText: `剩余${remain}席`,
      seatType: remain <= 10 ? "hot" : "normal"
    }
  }

  if (reservationDesc) {
    return { seatText: reservationDesc, seatType: "normal" }
  }
  return { seatText: "限量席位", seatType: "normal" }
}

function mapStatus(row) {
  const rawStatus = toDisplayText(row.activityStatus, "").toUpperCase()
  const status = STATUS_MAP[rawStatus] || { statusType: "coming", statusText: "敬请期待", open: false }
  const btnText = toDisplayText(row.buttonText, status.open ? "立即报名" : "敬请期待")

  return {
    ...status,
    actionText: btnText
  }
}

function mapActivityTag(activityType) {
  const type = toDisplayText(activityType, "").toUpperCase()
  if (type === "GOODS") return "商品活动"
  if (type === "OFFLINE") return "线下活动"
  return "活动"
}

function mapActivityDetail(rawDetail, fallbackId = "") {
  const row = rawDetail && typeof rawDetail === "object" ? rawDetail : {}
  const idRaw = row.id != null && row.id !== "" ? row.id : fallbackId
  const id = toDisplayText(idRaw, "")
  const status = mapStatus(row)
  const seat = formatSeat(row)
  const locationName = toDisplayText(row.locationName, "")
  const locationAddress = toDisplayText(row.locationAddress, "")
  const location = [locationName, locationAddress].filter(Boolean).join(" ")

  return {
    id,
    tag: mapActivityTag(row.activityType),
    statusType: status.statusType,
    statusText: status.statusText,
    name: toDisplayText(row.title, "活动"),
    dateTime: toDisplayText(row.activityTimeText, toDisplayText(row.startTime, "")),
    location: location || "线下地址待更新",
    seatText: seat.seatText,
    seatType: seat.seatType,
    highlights: parseHighlights(row),
    price: toDisplayText(row.priceAmount, "0.00"),
    actionText: status.actionText,
    open: status.open,
    image: toDisplayText(row.coverImage, ""),
    btnType: status.open ? "open" : "coming",
    btnBg: status.open ? "/assets/activity/bg_must2.png" : "/assets/activity/bg_must.png"
  }
}

function fetchActivityDetail(id) {
  return get(paths.marketing.activityDetail(id))
    .then((res) => {
      const payload = unwrapResponseData(res)
      const detail = payload && typeof payload === "object" && payload.item ? payload.item : payload
      return mapActivityDetail(detail, id)
    })
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value)
  } catch (e) {
    return value
  }
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
    title: "活动与沙龙",
    subTitle: "参与线下活动，深入了解食养文化",
    activities: [],
    activeActivityId: ""
  },
  onLoad(options) {
    this._isPageAlive = true
    const idFromQuery = options && options.id ? safeDecodeURIComponent(String(options.id)) : ""
    this._queryActivityId = toDisplayText(idFromQuery, "")
    this.syncLayout()
    this.loadPageData()
    if (wx.showShareMenu) {
      wx.showShareMenu({
        menus: ["shareAppMessage", "shareTimeline"]
      })
    }
  },
  onUnload() {
    this._isPageAlive = false
  },
  safeSetData(nextData) {
    if (!this._isPageAlive) return
    this.setData(nextData)
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
  async loadPageData() {
    if (!this._queryActivityId) {
      this.safeSetData({
        activities: [],
        activeActivityId: ""
      })
      return
    }

    try {
      const detail = await fetchActivityDetail(this._queryActivityId)
      if (!this._isPageAlive) return

      const nextList = detail ? [detail] : []

      this.safeSetData({
        activities: nextList,
        activeActivityId: nextList[0] ? nextList[0].id : ""
      })
    } catch (err) {
      console.warn("[activity-detail] 拉取活动详情失败:", err)
      if (!this._isPageAlive) return
      this.safeSetData({
        activities: [],
        activeActivityId: ""
      })
    }
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
    const current = this.getActivityById(this.data.activeActivityId) || this.data.activities[0] || { id: "", name: "活动与沙龙" }
    const encodedId = current.id ? encodeURIComponent(String(current.id)) : ""
    return {
      title: `${current.name}｜活动与沙龙`,
      path: `/pages/activity-detail/index?id=${encodedId}`
    }
  },
  onShareTimeline() {
    const current = this.getActivityById(this.data.activeActivityId) || this.data.activities[0] || { id: "", name: "活动与沙龙" }
    const encodedId = current.id ? encodeURIComponent(String(current.id)) : ""
    return {
      title: `${current.name}｜活动与沙龙`,
      query: `id=${encodedId}`
    }
  }
})
