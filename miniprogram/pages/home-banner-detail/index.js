const { getLayoutMetrics } = require("../../utils/layout")
const { get, post } = require("../../utils/request")
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

const SIGNUP_STATUS = {
  NOTSIGNED: "NOTSIGNED",
  UNPAID: "UNPAID",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
  NONE: ""
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

function pickBizObject(data) {
  if (!data || typeof data !== "object") return {}
  if (data.result && typeof data.result === "object") return data.result
  if (data.data && typeof data.data === "object") return data.data
  return data
}

function extractOrderId(data) {
  const payload = pickBizObject(data)
  const candidates = [
    payload.orderId,
    payload.indentId,
    payload.order && payload.order.orderId,
    payload.order && payload.order.id
  ]
  for (const candidate of candidates) {
    if (candidate != null && candidate !== "") return String(candidate)
  }
  return ""
}

function toRequestItemId(value) {
  if (value == null || value === "") return ""
  return String(value).trim()
}

function toOptionalLong(value) {
  if (value == null || value === "") return null
  const text = String(value).trim()
  if (!text) return null
  if (!/^\d+$/.test(text)) return null
  return toRequestItemId(text)
}

function toWechatPayArgs(data) {
  const payload = pickBizObject(data)
  const timeStamp = payload.timeStamp != null ? String(payload.timeStamp) : ""
  const nonceStr = payload.nonceStr != null ? String(payload.nonceStr) : ""
  const packageValue = payload.packageValue != null
    ? String(payload.packageValue)
    : (payload.package != null ? String(payload.package) : "")
  const signType = payload.signType != null ? String(payload.signType) : "RSA"
  const paySign = payload.paySign != null ? String(payload.paySign) : ""

  if (!timeStamp || !nonceStr || !packageValue || !paySign) return null

  return {
    timeStamp,
    nonceStr,
    package: packageValue,
    signType,
    paySign
  }
}

function requestWechatPayment(payArgs) {
  return new Promise((resolve, reject) => {
    wx.requestPayment({
      ...payArgs,
      success: () => resolve(),
      fail: (err) => {
        const error = err || new Error("微信支付失败")
        const message = String((err && err.errMsg) || "")
        if (message.toLowerCase().includes("cancel")) {
          error.__userCanceled = true
        }
        reject(error)
      }
    })
  })
}

function normalizeSignupStatus(value) {
  const status = toDisplayText(value, "").toUpperCase()
  if (
    status === SIGNUP_STATUS.NOTSIGNED ||
    status === SIGNUP_STATUS.UNPAID ||
    status === SIGNUP_STATUS.PAID ||
    status === SIGNUP_STATUS.CANCELLED
  ) {
    return status
  }
  return SIGNUP_STATUS.NONE
}

function resolveActionTextBySignupStatus(signupStatus) {
  if (signupStatus === SIGNUP_STATUS.UNPAID) return "去支付"
  if (signupStatus === SIGNUP_STATUS.PAID) return "已报名"
  return "立刻报名"
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
  return STATUS_MAP[rawStatus] || { statusType: "coming", statusText: "敬请期待", open: false }
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
  const orderId = extractOrderId(row)
  const resolvedSignupStatus = normalizeSignupStatus(row.signupStatus)
  const actionText = resolveActionTextBySignupStatus(resolvedSignupStatus)
  const isSigned = resolvedSignupStatus === SIGNUP_STATUS.PAID
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
    actionText,
    signupStatus: resolvedSignupStatus,
    orderId,
    image: toDisplayText(row.coverImage, ""),
    btnType: isSigned ? "coming" : "open",
    btnBg: isSigned ? "/assets/activity/bg_must.png" : "/assets/activity/bg_must2.png"
  }
}

function fetchActivityDetail(id, options = {}) {
  return get(paths.marketing.activityDetail(id), null, options)
    .then((res) => {
      const payload = unwrapResponseData(res)
      const detail = payload && typeof payload === "object" && payload.item ? payload.item : payload
      return mapActivityDetail(detail, id)
    })
}

function signupActivity(id) {
  return post(paths.marketing.activitySignup(id), {})
    .then((res) => {
      const payload = unwrapResponseData(res)
      const result = pickBizObject(payload)
      const orderId = extractOrderId(result)
      const signupStatus = normalizeSignupStatus(result.signupStatus)
      return {
        signupStatus,
        orderId
      }
    })
}

function createWechatPayPayload(orderId) {
  const payOrderId = toOptionalLong(orderId)
  if (payOrderId == null) {
    throw new Error("订单号异常，无法支付")
  }
  return post(paths.order.indentPayWechatCreate, {
    orderId: payOrderId
  })
    .then((res) => {
      const payload = unwrapResponseData(res)
      const result = pickBizObject(payload)
      const signupStatus = normalizeSignupStatus(result.signupStatus)
      const payArgs = toWechatPayArgs(result)

      return {
        signupStatus,
        payArgs
      }
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
    this._actionLoading = false
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
  async loadPageData({ showLoading = true } = {}) {
    if (!this._queryActivityId) {
      this.safeSetData({
        activities: [],
        activeActivityId: ""
      })
      return
    }

    try {
      const detail = await fetchActivityDetail(this._queryActivityId, {
        showLoading,
        loadingTitle: "加载中"
      })
      if (!this._isPageAlive) return

      const nextList = detail ? [detail] : []

      this.safeSetData({
        activities: nextList,
        activeActivityId: nextList[0] ? nextList[0].id : ""
      })
    } catch (err) {
      console.warn("[home-banner-detail] 拉取活动详情失败:", err)
      if (!this._isPageAlive) return
      this.safeSetData({
        activities: [],
        activeActivityId: ""
      })
    }
  },
  patchActivitySignupState(activityId, patch = {}) {
    const list = this.data.activities || []
    const nextList = list.map((item) => {
      if (!item || item.id !== activityId) return item
      const nextOrderId = Object.prototype.hasOwnProperty.call(patch, "orderId")
        ? toDisplayText(patch.orderId, "")
        : toDisplayText(item.orderId, "")
      const nextSignupStatus = Object.prototype.hasOwnProperty.call(patch, "signupStatus")
        ? normalizeSignupStatus(patch.signupStatus)
        : normalizeSignupStatus(item.signupStatus)
      const finalSignupStatus = nextSignupStatus
      const isSigned = finalSignupStatus === SIGNUP_STATUS.PAID

      return Object.assign({}, item, {
        orderId: nextOrderId,
        signupStatus: finalSignupStatus,
        actionText: resolveActionTextBySignupStatus(finalSignupStatus),
        btnType: isSigned ? "coming" : "open",
        btnBg: isSigned ? "/assets/activity/bg_must.png" : "/assets/activity/bg_must2.png"
      })
    })

    this.safeSetData({
      activities: nextList
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
  async onActionTap(e) {
    if (this._actionLoading) return

    const { id } = e.currentTarget.dataset
    const target = this.getActivityById(id)
    if (!target) return

    this.setData({ activeActivityId: target.id })

    const currentSignupStatus = normalizeSignupStatus(target.signupStatus)
    if (currentSignupStatus === SIGNUP_STATUS.PAID) {
      return
    }

    this._actionLoading = true
    let loadingShown = false
    let shouldReload = false

    const switchLoading = (title) => {
      if (loadingShown) wx.hideLoading()
      wx.showLoading({ title, mask: true })
      loadingShown = true
    }

    try {
      let nextSignupStatus = currentSignupStatus
      let nextOrderId = toDisplayText(target.orderId, "")

      if (currentSignupStatus !== SIGNUP_STATUS.UNPAID) {
        switchLoading("报名中")
        const signupResult = await signupActivity(target.id)
        nextSignupStatus = signupResult.signupStatus
        nextOrderId = toDisplayText(signupResult.orderId, "")
        this.patchActivitySignupState(target.id, {
          signupStatus: nextSignupStatus,
          orderId: nextOrderId
        })
        shouldReload = true
      }

      if (nextSignupStatus === SIGNUP_STATUS.PAID) {
        return
      }

      if (nextSignupStatus !== SIGNUP_STATUS.UNPAID) {
        return
      }

      if (!nextOrderId) {
        throw new Error("缺少订单号，无法发起支付")
      }

      switchLoading("拉起支付中")
      const payResult = await createWechatPayPayload(nextOrderId)
      const statusFromPay = normalizeSignupStatus(payResult.signupStatus)

      if (statusFromPay) {
        nextSignupStatus = statusFromPay
        this.patchActivitySignupState(target.id, {
          signupStatus: nextSignupStatus,
          orderId: nextOrderId
        })
        shouldReload = true
      }

      if (nextSignupStatus === SIGNUP_STATUS.PAID) {
        return
      }

      if (nextSignupStatus !== SIGNUP_STATUS.UNPAID) {
        return
      }

      if (!payResult.payArgs) {
        throw new Error("微信支付参数不完整")
      }

      if (loadingShown) {
        wx.hideLoading()
        loadingShown = false
      }
      await requestWechatPayment(payResult.payArgs)

      this.patchActivitySignupState(target.id, {
        signupStatus: SIGNUP_STATUS.PAID,
        orderId: nextOrderId
      })
      shouldReload = true
      wx.showToast({
        title: "支付成功",
        icon: "success"
      })
    } catch (err) {
      if (err && err.__userCanceled) {
        wx.showToast({
          title: "已取消支付",
          icon: "none"
        })
        return
      }

      console.warn("[home-banner-detail] 活动报名支付失败:", err)
      const isHttpOrBizError = !!(err && (err.statusCode || err.code != null))
      if (!isHttpOrBizError) {
        wx.showToast({
          title: "操作失败，请稍后重试",
          icon: "none"
        })
      }
    } finally {
      if (loadingShown) wx.hideLoading()
      this._actionLoading = false
      if (shouldReload) {
        this.loadPageData({ showLoading: false })
      }
    }
  },
  onShareAppMessage() {
    const current = this.getActivityById(this.data.activeActivityId) || this.data.activities[0] || { id: "", name: "活动与沙龙" }
    const encodedId = current.id ? encodeURIComponent(String(current.id)) : ""
    return {
      title: `${current.name}｜活动与沙龙`,
      path: `/pages/home-banner-detail/index?id=${encodedId}`
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
