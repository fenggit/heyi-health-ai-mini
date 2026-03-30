const { getLayoutMetrics } = require('./layout')

function getMiniNavData() {
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

  return {
    topInset: Math.max(headerHeight + 8, 72),
    statusBarHeight,
    navBarHeight,
    headerHeight,
    menuWidth,
    menuHeight,
    menuTop,
    menuRight
  }
}

function initMiniNav(page) {
  page.setData(getMiniNavData())
}

function backWithFallback(fallbackUrl) {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    wx.navigateBack()
    return
  }
  if (fallbackUrl) {
    wx.switchTab({ url: fallbackUrl })
  }
}

module.exports = {
  getMiniNavData,
  initMiniNav,
  backWithFallback
}
