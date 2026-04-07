const request = require('./utils/request')

App({
  /**
   * 全局数据
   *
   * layout — 布局尺寸，onLaunch 时计算写入
   *   statusBarHeight {number}  状态栏高度（px）
   *   navBarHeight    {number}  导航栏高度（px）
   *   headerHeight    {number}  顶部总高度 = statusBarHeight + navBarHeight（px）
   *   safeBottom      {number}  底部安全区高度（px）
   *
   * isLogin {boolean}  是否已登录；登录成功 true，登录失败/退出登录 false
   *
   * userInfo — 当前登录用户信息（来自 fetchUserInfo 接口 /auth/user/profile/current 响应 data）
   *   userId   {number}  用户 ID
   *   phone    {string}  手机号
   *   fullReport {object} 完整体测报告
   *   questionnaireReportUrl {string} 问卷体质测试报告页面地址
   *   aiReportUrl            {string} AI 体质测试报告页面地址
   *   analysisQrCodeUrl      {string} 分析页二维码图片地址
   *   client_id  {string}
   *
   * guestSession — 游客 session 信息（来自 getGuestToken 响应 data）
   *   guestToken     {string}  游客令牌
   *   expireTime     {string}  令牌过期时间（date-time）
   *   maxExpireTime  {string}  最大过期时间（date-time）
   *   newSession     {boolean} 是否为新会话
   */
  globalData: {
    layout: {
      statusBarHeight: 20,
      navBarHeight: 44,
      headerHeight: 64,
      safeBottom: 0
    },
    isLogin: false,
    userInfo: null,
    guestSession: null
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
    this.globalData.isLogin = true
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
