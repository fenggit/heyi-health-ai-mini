App({
  globalData: {
    layout: {
      statusBarHeight: 20,
      navBarHeight: 44,
      headerHeight: 64,
      safeBottom: 0
    }
  },
  onLaunch() {
    this.globalData.layout = this.computeLayout()
  },
  computeLayout() {
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const statusBarHeight = windowInfo.statusBarHeight || 20
    const safeArea = windowInfo.safeArea || null
    const screenHeight = windowInfo.screenHeight || windowInfo.windowHeight || 667

    let navBarHeight = 44
    if (wx.getMenuButtonBoundingClientRect) {
      const menu = wx.getMenuButtonBoundingClientRect()
      if (menu && menu.top && menu.height) {
        const gap = Math.max(0, menu.top - statusBarHeight)
        navBarHeight = gap * 2 + menu.height
      }
    }
    navBarHeight = Math.max(44, Math.min(56, navBarHeight))

    const safeBottom = safeArea ? Math.max(0, screenHeight - safeArea.bottom) : 0

    return {
      statusBarHeight,
      navBarHeight,
      headerHeight: statusBarHeight + navBarHeight,
      safeBottom
    }
  }
})
