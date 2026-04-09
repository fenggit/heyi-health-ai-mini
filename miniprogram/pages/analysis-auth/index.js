const { getLayoutMetrics } = require("../../utils/layout")
const { get } = require("../../utils/request")
const paths = require("../../http/paths")
const { login } = require("../../http/auth")

const AGREEMENT_CONTENT = "基于中医体质理论和现代营养学，运用AI技术为每一位用户提供个性化的食养方案，帮助大家通过科学饮食改善体质，实现健康生活。"
const PRIVACY_CONTENT = "我们重视并保护您的个人隐私信息，授权信息仅用于生成个性化健康分析与服务体验。"

const STATIC_DATA = {
  navTitle: "趣味分析",
  guestCompleteTitle: "测评完成！",
  guestCompleteSubTitle: "AI已生成您的初步体质分析",
  guestTag: "趣味分析",
  guestUnlockTitle: "授权后您将获得：",
  guestUnlockItems: [
    { title: "详细体质分析报告", desc: "9大体质类型完整评分与解读" },
    { title: "专属食养调理方案", desc: "AI推荐的个性化饮食、运动建议" },
    { title: "每日健康追踪", desc: "记录饮食、运动、睡眠等健康数据" },
    { title: "专家在线咨询", desc: "中医养生专家一对一指导" }
  ],
  guestAuthTitle: "为什么需要授权?",
  guestAuthDesc: "授权后可同步您的微信健康数据(步数、睡眠等)，让AI分析更精准，食养方案更个性化。我们承诺保护您的隐私，仅用于生成个性化健康方案。",
  guestPrimaryButton: "微信授权，查看完整报告",
  guestBackText: "返回首页"
}

function safeDecode(value) {
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
    popupShow: false,
    popupTitle: "",
    popupContent: "",
    mainType: "",
    mainTypeHint: "",
    mainScore: 0,
    ...STATIC_DATA
  },
  onLoad(options) {
    this._recordId = safeDecode((options && options.recordId) || '')
    this._guestToken = safeDecode((options && options.guestToken) || '')
    this._reportUrl = safeDecode((options && options.reportUrl) || '')
    console.log('[analysis-auth] onLoad, recordId:', this._recordId, 'guestToken:', this._guestToken)
    this.syncLayout()
    this.loadResultDetail()
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
  async loadResultDetail() {
    if (!this._recordId) return
    wx.showLoading({ title: '加载中', mask: true })
    try {
      const params = { recordId: this._recordId }
      if (this._guestToken) params.guestToken = this._guestToken
      const res = await get(paths.assessment.resultDetail, params)
      console.log('[analysis-auth] result detail 返回数据:', JSON.stringify(res, null, 2))
      const result = (res && res.data && res.data.result) || {}
      this.setData({
        mainType: result.primaryConstitutionName || '',
        mainTypeHint: result.primaryConstitutionDesc || '',
        mainScore: result.constitutionScore || 0
      })
    } catch (err) {
      console.error('[analysis-auth] 获取结果详情失败', err)
    } finally {
      wx.hideLoading()
    }
  },
  handleBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: "/pages/home/index" })
  },
  goHome() {
    wx.switchTab({ url: "/pages/home/index" })
  },
  goLogin() {
    if (!this.data.agreed) {
      wx.showToast({
        title: "请先阅读并同意协议",
        icon: "none"
      })
      return
    }
    wx.showToast({
      title: "请点击下方按钮授权",
      icon: "none"
    })
  },
  toggleAgreed() {
    this.setData({ agreed: !this.data.agreed })
  },
  onAuthTap() {
    if (!this.data.agreed) {
      wx.showToast({
        title: "请先阅读并同意协议",
        icon: "none"
      })
    }
  },
  openUserAgreement() {
    this.setData({ popupShow: true, popupTitle: "用户协议", popupContent: AGREEMENT_CONTENT })
  },
  openPrivacyPolicy() {
    this.setData({ popupShow: true, popupTitle: "隐私政策", popupContent: PRIVACY_CONTENT })
  },
  onPopupConfirm() {
    this.setData({ popupShow: false })
  },
  goReportWithHomeBack(title, url) {
    const reportTitle = title || "测试报告"
    const reportUrl = url || this._reportUrl
    if (!reportUrl) {
      wx.switchTab({ url: "/pages/home/index" })
      return
    }
    const targetUrl = "/pages/webview-page/index?title=" + encodeURIComponent(reportTitle) + "&url=" + encodeURIComponent(reportUrl)
    wx.reLaunch({
      url: "/pages/home/index",
      success: () => {
        setTimeout(() => {
          wx.navigateTo({ url: targetUrl })
        }, 50)
      },
      fail: () => {
        wx.navigateTo({ url: targetUrl })
      }
    })
  },
  onGetPhoneNumber(e) {
    if (!this.data.agreed) {
      wx.showToast({ title: "请先阅读并同意协议", icon: "none" })
      return
    }
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({ title: '授权失败，请重试', icon: 'none' })
      return
    }
    wx.showLoading({ title: '登录中...', mask: true })
    login({ phoneCode: e.detail.code, guestToken: this._guestToken })
      .then(() => {
        wx.hideLoading()
        this.goReportWithHomeBack("测试报告", this._reportUrl)
      })
      .catch(() => {
        wx.hideLoading()
      })
  }
})
