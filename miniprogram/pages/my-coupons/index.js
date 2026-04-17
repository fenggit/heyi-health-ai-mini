const { initMiniNav, backWithFallback } = require("../../utils/mini-nav")
const { get } = require("../../utils/request")
const paths = require("../../http/paths")

const TAB_LIST = [
  { key: "all", label: "全部优惠券" },
  { key: "unused", label: "待使用" },
  { key: "used", label: "已使用" }
]

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

  const groupedKeys = ["unusedList", "usedList", "expiredList"]
  const merged = []
  groupedKeys.forEach((key) => {
    if (Array.isArray(data[key])) {
      merged.push(...data[key])
    }
  })
  return merged
}

function getCouponTabStatus(raw) {
  const status = String(raw.couponStatus || "").toUpperCase()
  const pageTabType = String(raw.pageTabType || "").toUpperCase()
  if (pageTabType === "UNUSED") return "unused"
  if (pageTabType === "USED") return "used"
  if (status === "UNUSED") return "unused"
  if (status === "USED" || status === "EXPIRED") return "used"
  return "unused"
}

function buildThresholdText(raw) {
  if (raw.couponDesc) return String(raw.couponDesc)
  if (raw.thresholdAmount == null || raw.thresholdAmount === "") return "无门槛可用"
  return `满 ${toDisplayAmount(raw.thresholdAmount)} 可用`
}

function mapCoupons(list) {
  return list.map((item, index) => {
    const raw = item && typeof item === "object" ? item : {}
    const statusRaw = String(raw.couponStatus || "").toUpperCase()
    const pageTabType = String(raw.pageTabType || "").toUpperCase()
    const status = getCouponTabStatus(raw)
    const isInactive = statusRaw === "USED" || statusRaw === "EXPIRED" || pageTabType === "USED"

    return {
      id:
        raw.id != null
          ? String(raw.id)
          : (raw.couponId != null ? `coupon-${String(raw.couponId)}` : `coupon-${index}`),
      couponId: raw.couponId != null ? String(raw.couponId) : "",
      name: raw.couponName || "优惠券",
      amountText: toDisplayAmount(raw.amount),
      thresholdText: buildThresholdText(raw),
      status,
      statusRaw,
      isInactive,
      canUse: raw.canUse === true
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
        title: current.statusRaw === "EXPIRED" ? "优惠券已过期" : "该优惠券已使用",
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
