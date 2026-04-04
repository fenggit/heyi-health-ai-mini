const request = require('./utils/request')

App({
  globalData: {
    layout: {
      statusBarHeight: 20,
      navBarHeight: 44,
      headerHeight: 64,
      safeBottom: 0
    },
    isLoggedIn: false
  },
  onLaunch() {
    request.initAuthToken()
    this.globalData.layout = this.computeLayout()
    this.checkLogin()
  },
  checkLogin() {
    // 检查本地是否有 token，有则视为已登录直接进首页
    const token = request.getAuthToken()
    if (!token) {
      // 未登录，跳转登录页（pages 第一项已是 login，默认启动即登录页，无需额外跳转）
      return
    }
    this.globalData.isLoggedIn = true
    wx.switchTab({ url: '/pages/home/index' })
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
