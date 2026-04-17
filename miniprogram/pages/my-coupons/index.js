const { initMiniNav, backWithFallback } = require("../../utils/mini-nav")
const { get } = require("../../utils/request")
const paths = require("../../http/paths")

const TAB_LIST = [
  { key: "all", label: "全部优惠券" },
  { key: "unused", label: "待使用" },
  { key: "used", label: "已使用" },
  { key: "expired", label: "已过期" }
]
const PERMANENT_VALID_TEXT = "永久有效"

function toDisplayAmount(value) {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount)) return "0"
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(/\.?0+$/, "")
}

function normalizeCouponList(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== "object") return []

  const directListKeys = ["records", "list", "items", "rows", "couponList", "result"]
  for (const key of directListKeys) {
    if (Array.isArray(data[key])) return data[key]
  }

  const groupedKeyMap = {
    unusedList: "unused",
    usedList: "used",
    expiredList: "expired"
  }
  const merged = []
  Object.keys(groupedKeyMap).forEach((key) => {
    if (Array.isArray(data[key])) {
      const groupStatus = groupedKeyMap[key]
      merged.push(
        ...data[key].map((item) => ({
          ...(item || {}),
          __groupStatus: groupStatus
        }))
      )
    }
  })
  return merged
}

function getCouponTabStatus(raw) {
  const status = String(raw.couponStatus || "").toUpperCase()
  const pageTabType = String(raw.pageTabType || "").toUpperCase()
  if (status === "EXPIRED") return "expired"
  if (status === "USED") return "used"
  if (status === "UNUSED") return "unused"
  if (raw.__groupStatus === "expired") return "expired"
  if (raw.__groupStatus === "used") return "used"
  if (raw.__groupStatus === "unused") return "unused"
  if (pageTabType === "UNUSED") return "unused"
  if (pageTabType === "USED") return "used"
  return "unused"
}

function buildThresholdText(raw) {
  if (raw.couponDesc) return String(raw.couponDesc)
  if (raw.thresholdAmount == null || raw.thresholdAmount === "") return "无门槛可用"
  return `满 ${toDisplayAmount(raw.thresholdAmount)} 可用`
}

function toExpireDateText(value) {
  if (value == null || value === "") return PERMANENT_VALID_TEXT
  const text = String(value).trim().replace(/\//g, "-")
  const datePart = text.includes("T") ? text.split("T")[0] : text.split(" ")[0]
  const m = datePart.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) {
    const month = String(Number(m[2])).padStart(2, "0")
    const day = String(Number(m[3])).padStart(2, "0")
    return `${m[1]}.${month}.${day}`
  }
  const d = new Date(text)
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}.${month}.${day}`
  }
  return PERMANENT_VALID_TEXT
}

function toCanUse(value) {
  if (value === true || value === false) return value
  if (typeof value === "number") return value === 1
  if (typeof value === "string") {
    const text = value.trim().toLowerCase()
    return text === "1" || text === "true" || text === "yes"
  }
  return false
}

function mapCoupons(list) {
  return list.map((item, index) => {
    const raw = item && typeof item === "object" ? item : {}
    const statusRaw = String(raw.couponStatus || "").toUpperCase()
    const pageTabType = String(raw.pageTabType || "").toUpperCase()
    const status = getCouponTabStatus(raw)
    const isInactive = status === "used" || status === "expired" || pageTabType === "USED"

    return {
      id:
        raw.id != null
          ? String(raw.id)
          : (raw.couponId != null ? `coupon-${String(raw.couponId)}` : `coupon-${index}`),
      couponId: raw.couponId != null ? String(raw.couponId) : "",
      name: raw.couponName || "优惠券",
      amountText: toDisplayAmount(raw.amount),
      thresholdText: buildThresholdText(raw),
      expireDateText: toExpireDateText(raw.expireTime),
      status,
      statusRaw,
      isInactive,
      canUse: toCanUse(raw.canUse)
    }
  })
}

function filterCoupons(list, tabKey) {
  if (tabKey === "all") return list
  return list.filter((item) => item.status === tabKey)
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

    navTitle: "优惠券",
    tabs: TAB_LIST,
    activeTab: "all",
    activeTabLabel: "全部",
    coupons: [],
    filteredCoupons: []
  },

  onLoad() {
    initMiniNav(this)
    this._pageReady = true
    this.loadCoupons({ showLoading: true })
  },

  onShow() {
    if (this._pageReady) {
      this.loadCoupons({ showLoading: false })
    }
  },

  handleBack() {
    backWithFallback("/pages/profile/index")
  },

  selectTab(e) {
    const { tab } = e.currentTarget.dataset
    this.applyFilter(tab)
  },

  applyFilter(tab, sourceList) {
    const nextTab = tab || "all"
    const baseList = Array.isArray(sourceList) ? sourceList : this.data.coupons
    const filteredCoupons = filterCoupons(baseList, nextTab)
    const activeTabItem = this.data.tabs.find((item) => item.key === nextTab)
    const activeTabLabel = activeTabItem ? activeTabItem.label.replace("优惠券", "") : "全部"
    this.setData({
      activeTab: nextTab,
      activeTabLabel: activeTabLabel || "全部",
      filteredCoupons
    })
  },

  loadCoupons({ showLoading = false } = {}) {
    if (this._couponRequestPromise) return this._couponRequestPromise

    if (showLoading) {
      wx.showLoading({ title: "加载中", mask: true })
    }

    this._couponRequestPromise = get(paths.marketing.myCoupons)
      .then((res) => {
        const list = normalizeCouponList((res && res.data) || [])
        const mapped = mapCoupons(list)
        this.setData({
          coupons: mapped
        })
        this.applyFilter(this.data.activeTab || "all", mapped)
      })
      .catch(() => {
        this.setData({
          coupons: [],
          filteredCoupons: []
        })
      })
      .finally(() => {
        if (showLoading) wx.hideLoading()
        this._couponRequestPromise = null
      })

    return this._couponRequestPromise
  },

  useCoupon(e) {
    const { id } = e.currentTarget.dataset
    const current = this.data.filteredCoupons.find((item) => item.id === id)
    if (!current) return
    if (current.isInactive) {
      wx.showToast({
        title: current.status === "expired" ? "优惠券已过期" : "该优惠券已使用",
        icon: "none"
      })
      return
    }
    if (!current.canUse) {
      wx.showToast({
        title: "当前优惠券暂不可用",
        icon: "none"
      })
      return
    }
    wx.switchTab({
      url: "/pages/mall/index"
    })
  }
})
