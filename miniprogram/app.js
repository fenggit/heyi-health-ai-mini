const request = require('./utils/request')
const { fetchUserInfo, fetchFeatureEnabled, loadUserInfoFromStorage } = require('./http/auth')

const FEATURE_KEY_AI_ASSESSMENT = 'ai-assessment'

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
   * userInfo — 当前登录用户信息（启动先从本地缓存读取，再由 fetchUserInfo 接口刷新）
   *   userId   {number}  用户 ID
   *   phone    {string}  手机号
   *   fullReport {object} 完整体测报告
   *   questionnaireReportUrl {string} 问卷体质测试报告页面地址
   *   aiReportUrl            {string} AI 体质测试报告页面地址
   *   analysisQrCodeUrl      {string} 分析页二维码图片地址
   *   client_id  {string}
   *   memberInfo {object} 会员信息
   *     memberInfo.currentLevelId   {number} 当前会员等级 ID
   *     memberInfo.currentLevelName {string} 当前会员等级名称
   *     memberInfo.totalPoints      {number} 总积分
   *   stat {object} 数据统计
   *     stat.juiceCheckInTotalCount   {number} 喝汁累计打卡次数
   *     stat.fastingCheckInTotalCount {number} 轻断食累计打卡次数
   *     stat.favoriteRecipeCount      {number} 收藏食谱数
   *     stat.historyOrderCount        {number} 历史订单数
   *     stat.couponCount              {number} 优惠券数
   *     stat.referralCount            {number} 邀请好友数
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
      guestSession: null,
      functionMap: {
        [FEATURE_KEY_AI_ASSESSMENT]: false
      }
  },
  onLaunch(launchOptions = {}) {
    request.initAuthToken()
    this.globalData.layout = this.computeLayout()
    this.globalData.userInfo = loadUserInfoFromStorage()
      this.ensureFunctionMapLoaded()
    this.checkLogin(launchOptions)
  },
    ensureFunctionMapLoaded() {
      if (this._functionMapPromise) return this._functionMapPromise

      this._functionMapPromise = fetchFeatureEnabled(FEATURE_KEY_AI_ASSESSMENT)
        .then((res) => {
          const enabled = !!(res && res.data && res.data.enabled)
          this.setFunctionEnabled(FEATURE_KEY_AI_ASSESSMENT, enabled)
          console.log('[app] 功能开关加载成功:', FEATURE_KEY_AI_ASSESSMENT, enabled)
          return this.globalData.functionMap
        })
        .catch((err) => {
          this.setFunctionEnabled(FEATURE_KEY_AI_ASSESSMENT, false)
          console.warn('[app] 功能开关加载失败:', err)
          return this.globalData.functionMap
        })

      return this._functionMapPromise
    },
    setFunctionEnabled(featureKey, enabled) {
      const nextFeatureKey = String(featureKey || '').trim()
      if (!nextFeatureKey) return

      const currentMap = this.globalData.functionMap && typeof this.globalData.functionMap === 'object'
        ? this.globalData.functionMap
        : {}

      this.globalData.functionMap = Object.assign({}, currentMap, {
        [nextFeatureKey]: !!enabled
      })
    },
  checkLogin(launchOptions = {}) {
    // 检查本地是否有 token，有则视为已登录
    const token = request.getAuthToken()
    if (!token) {
      // 未登录，跳转登录页（pages 第一项已是 login，默认启动即登录页，无需额外跳转）
      return
    }
    this.globalData.isLogin = true
    this.refreshUserInfoOnce()
    if (this.shouldAutoGoHome(launchOptions)) {
      wx.switchTab({ url: '/pages/home/index' })
    }
  },
  shouldAutoGoHome(launchOptions = {}) {
    const path = String(launchOptions.path || '').replace(/^\//, '')
    return !path || path === 'pages/login/index'
  },
  refreshUserInfoOnce() {
    fetchUserInfo()
      .then(() => {
        console.log('[app] 启动后 userInfo 已刷新')
      })
      .catch((err) => {
        console.warn('[app] 启动后刷新 userInfo 失败:', err)
      })
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
