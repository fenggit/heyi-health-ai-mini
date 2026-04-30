const { login } = require('../../http/auth')
const { getAuthToken } = require('../../utils/request')
const {
  USER_AGREEMENT_KIND,
  PRIVACY_POLICY_KIND,
  getAgreementPopupData
} = require('../../utils/agreement')

Page({
  data: {
    agreed: false,
    popupShow: false,
    popupTitle: '',
    popupSummary: '',
    popupContent: ''
  },

  onLoad() {
    this._redirectIfLoggedIn()
  },

  onShow() {
    this._redirectIfLoggedIn()
  },

  toggleAgreed() {
    this.setData({ agreed: !this.data.agreed })
  },

  onLoginTap() {
    if (!this.data.agreed) {
      wx.showToast({
        title: '请先阅读并同意协议',
        icon: 'none'
      })
    }
    // 已同意时由 open-type="getPhoneNumber" 触发 onGetPhoneNumber
  },

  onGetPhoneNumber(e) {
    console.log('[getPhoneNumber] 完整回调数据:', JSON.stringify(e.detail))

    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({ title: '授权失败，请重试', icon: 'none' })
      return
    }

    const { code: phoneCode } = e.detail

    wx.showLoading({ title: '登录中...', mask: true })

    login({ phoneCode })
      .then((res) => {
        console.log('[login] 登录成功:', JSON.stringify(res))
        wx.hideLoading()
        this._goHome()
      })
      .catch((err) => {
        console.error('[login] 登录失败:', err)
        wx.hideLoading()
      })
  },

  _goHome() {
    wx.switchTab({ url: '/pages/home/index' })
  },

  _redirectIfLoggedIn() {
    const app = getApp()
    const hasToken = !!getAuthToken()
    const isLogin = !!(app && app.globalData && app.globalData.isLogin)
    if (!isLogin && hasToken && app && app.globalData) {
      app.globalData.isLogin = true
    }
    if (isLogin || hasToken) {
      this._goHome()
    }
  },

  openAgreementByKind(kind) {
    wx.showLoading({ title: '加载中', mask: true })
    getAgreementPopupData(kind)
      .then((agreement) => {
        this.setData({
          popupShow: true,
          popupTitle: agreement.title,
          popupSummary: agreement.summary,
          popupContent: agreement.content
        })
      })
      .catch((error) => {
        console.warn('[login] 获取协议内容失败:', error)
        wx.showToast({ title: '协议内容加载失败', icon: 'none' })
      })
      .finally(() => {
        wx.hideLoading()
      })
  },

  openUserAgreement() {
    this.openAgreementByKind(USER_AGREEMENT_KIND)
  },

  openPrivacyPolicy() {
    this.openAgreementByKind(PRIVACY_POLICY_KIND)
  },

  onPopupConfirm() {
    this.setData({ popupShow: false })
  }
})
