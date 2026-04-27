const { getLayoutMetrics } = require("../../utils/layout")

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value)
  } catch (e) {
    return value
  }
}

function toDisplayText(value, fallback = "") {
  if (value === undefined || value === null) return fallback
  const text = String(value).trim()
  return text || fallback
}

Page({
  data: {
    topInset: 72,
    statusBarHeight: 20,
    navBarHeight: 44,
    menuWidth: 88,
    menuHeight: 32,
    menuTop: 26,
    menuRight: 12,
    coverImage: ""
  },

  onLoad(options = {}) {
    this.syncLayout()

    const coverImage = toDisplayText(
      safeDecodeURIComponent(options.coverImage || ""),
      ""
    )

    this.setData({
      coverImage
    })
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
      menuWidth,
      menuHeight,
      menuTop,
      menuRight
    })
  },

  handleBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: "/pages/mall/index" })
  }
})
