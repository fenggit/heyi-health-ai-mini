const { getLayoutMetrics } = require("../../utils/layout")
const { getGuestToken } = require("../../http/auth")

const FEATURE_KEY_AI_ASSESSMENT = 'ai-assessment'

const MOCK_ANALYSIS_INTRO = {
  introTitle: "开始前，请仔细阅读以下重要说明",
  introSubTitle: "使用须知与免责声明",
  declaration:
    "本服务为AI趣味分析工具，非医疗诊断。所有内容仅供娱乐与生活参考，不能替代执业医师的诊断、治疗或建议。如有健康问题，请立即咨询正规医疗机构。",
  aiContentTitle: "AI生成内容说明",
  aiContent:
    "本结果由AI生成，可能存在误差，仅供参考，分析结果基于您提供的信息和照片，不具备医学诊断价值。",
  bullets: [
    "本服务不提供任何医疗诊断或治疗建议",
    "分析结果仅供娱乐和生活参考",
    "不能用于疾病诊断、治疗或预防",
    "不能替代专业医疗机构的检查和建议",
    "如感到身体不适，请及时就医"
  ],
  extras: ["中医专家讲座：春季养肝护脾", "免费AI体质测评", "养生茶饮品鉴体验", "定制食养方案咨询"],
  agreementText:
    "我已仔细阅读并充分理解上述内容，同意本服务仅作为趣味参考工具使用，不作为医疗诊断依据。我明白如有健康问题应当咨询正规医疗机构。"
}

function fetchAnalysisIntro() {
  // TODO: 后续替换为服务端返回的免责声明文案
  return Promise.resolve(JSON.parse(JSON.stringify(MOCK_ANALYSIS_INTRO)))
}

function decodeSafe(value) {
  if (!value) return ''
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
    agreed: false,
    introTitle: "",
    introSubTitle: "",
    declaration: "",
    aiContentTitle: "",
    aiContent: "",
    bullets: [],
    extras: [],
    agreementText: "",
    showAiAssessmentEntry: false
  },
  onLoad(options = {}) {
    this.syncLayout()
    this.syncFeatureSwitch()
    this.loadPageData()

    const sceneParam = decodeSafe(options.scene || options.source || '').trim()
    this._scene = sceneParam
    console.log('[analysis] 扫码参数 scene:', sceneParam || '（无）')

    const app = getApp()
    const isLogin = !!(app && app.globalData.isLogin)
    console.log('[analysis] 当前登录状态:', isLogin ? '已登录' : '未登录')

    if (app && typeof app.ensureFunctionMapLoaded === 'function') {
      app.ensureFunctionMapLoaded().then(() => {
        this.syncFeatureSwitch()
      })
    }
  },
  onShow() {
    this.syncFeatureSwitch()
  },
  // 未登录时获取游客 token，失败时静默记录，按钮点击时会重试
  _fetchGuestToken() {
    const app = getApp()
    if (app && app.globalData.isLogin) return
    getGuestToken({
      scene: this._scene,
      success: () => console.log('[analysis] guestToken 获取成功'),
      fail: (err) => console.warn('[analysis] guestToken 获取失败:', err)
    })
  },
  // 已登录直接放行；未登录确保 guestSession 存在，否则重新获取；返回 Promise<boolean>
  _ensureGuestToken() {
    const app = getApp()
    if (app && app.globalData.isLogin) return Promise.resolve(true)
    if (app && app.globalData.guestSession && app.globalData.guestSession.guestToken) {
      return Promise.resolve(true)
    }
    return new Promise((resolve) => {
      wx.showLoading({ title: '准备中...', mask: true })
      getGuestToken({
        scene: this._scene,
        success: () => { wx.hideLoading(); resolve(true) },
        fail: (err) => {
          wx.hideLoading()
          console.error('[analysis] guestToken 重试失败:', err)
          wx.showToast({ title: '网络异常，请重试', icon: 'none' })
          resolve(false)
        }
      })
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
      headerHeight,
      menuWidth,
      menuHeight,
      menuTop,
      menuRight
    })
  },
  syncFeatureSwitch() {
    const app = getApp()
    const functionMap = app && app.globalData ? app.globalData.functionMap : null
    const showAiAssessmentEntry = !!(functionMap && functionMap[FEATURE_KEY_AI_ASSESSMENT])

    this.setData({ showAiAssessmentEntry })
  },
  async loadPageData() {
    const payload = await fetchAnalysisIntro()
    this.setData(payload)
  },
  toggleAgree() {
    this.setData({
      agreed: !this.data.agreed
    })
  },
  backHome() {
    this._ensureGuestToken().then((ok) => {
      if (!ok) return
      const app = getApp()
      const guestToken = (!app.globalData.isLogin && app.globalData.guestSession)
        ? app.globalData.guestSession.guestToken : ''
      console.log('[analysis] 跳转 analysis-ai-image, guestToken:', guestToken)
      wx.navigateTo({ url: `/pages/analysis-ai-image/index?guestToken=${guestToken}` })
    })
  },
  handleBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: "/pages/home/index" })
  },
  startQuiz() {
    if (!this.data.agreed) {
      wx.showToast({
        title: "请先阅读并勾选同意",
        icon: "none"
      })
      return
    }
    this._ensureGuestToken().then((ok) => {
      if (!ok) return
      const app = getApp()
      const guestToken = (!app.globalData.isLogin && app.globalData.guestSession)
        ? app.globalData.guestSession.guestToken : ''
      console.log('[analysis] 跳转 analysis-quiz, guestToken:', guestToken)
      wx.navigateTo({ url: `/pages/analysis-quiz/index?guestToken=${guestToken}` })
    })
  }
})
