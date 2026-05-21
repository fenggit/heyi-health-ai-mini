const { login } = require('../../http/auth')
const { getAuthToken } = require('../../utils/request')
const { getLayoutMetrics } = require('../../utils/layout')
const {
  USER_AGREEMENT_KIND,
  PRIVACY_POLICY_KIND,
  getAgreementPopupData
} = require('../../utils/agreement')

const REFERRAL_CODE_STORAGE_KEY = 'pending_referral_code'

function decodeSafe(value) {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch (e) {
    return value
  }
}

/**
 * 保存待使用的邀请码到本地存储
 * 用于用户通过分享链接进入但尚未登录的场景
 */
function savePendingReferralCode(code) {
  if (!code) return
  try {
    wx.setStorageSync(REFERRAL_CODE_STORAGE_KEY, code)
    console.log('[login] 临时存储邀请码:', code)
  } catch (e) {
    console.warn('[login] 存储邀请码失败:', e)
  }
}

/**
 * 读取并清除临时存储的邀请码
 */
function popPendingReferralCode() {
  try {
    const code = wx.getStorageSync(REFERRAL_CODE_STORAGE_KEY) || ''
    if (code) wx.removeStorageSync(REFERRAL_CODE_STORAGE_KEY)
    return code
  } catch (e) {
    return ''
  }
}

/**
 * 解析启动参数，返回 referralCode
 *
 * 方式1 — 小程序分享点击：options.referralCode 直接带邀请码，如 "LNHIG4H1"
 * 方式2 — 二维码扫码：由 app.js onLaunch 负责存储，login 页无需处理
 */
function resolveReferralCode(options) {
  const directCode = decodeSafe(options.referralCode || '').trim()
  return directCode
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    agreed: false,
    popupShow: false,
    popupTitle: '',
    popupSummary: '',
    popupContent: ''
  },

  onLoad(options = {}) {
    this.syncLayout()

    const referralCode = resolveReferralCode(options)
    this._referralCode = referralCode

    console.log('[login] 启动 options:', JSON.stringify(options))
    console.log('[login] 登录 referralCode:', referralCode || '（无）')

    // 有邀请码时先临时存储，防止已登录直接跳首页导致邀请码丢失
    if (referralCode) {
      savePendingReferralCode(referralCode)
    }

    this._redirectIfLoggedIn()
  },

  onShow() {
    this._redirectIfLoggedIn()
  },

  syncLayout() {
    const { statusBarHeight, navBarHeight } = getLayoutMetrics()
    this.setData({
      statusBarHeight,
      navBarHeight
    })
  },

  toggleAgreed() {
    this.setData({ agreed: !this.data.agreed })
  },

  handleBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: '/pages/home/index' })
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

    // 优先用页面内存中的邀请码，兜底从 storage 读取（二维码扫码场景由 app.js 存入）
    const referralCode = this._referralCode || popPendingReferralCode()

    wx.showLoading({ title: '登录中...', mask: true })

    login({
      phoneCode,
      referralCode
    })
      .then((res) => {
        console.log('[login] 登录成功:', JSON.stringify(res))
        // 登录成功，清除临时存储的邀请码
        try { wx.removeStorageSync(REFERRAL_CODE_STORAGE_KEY) } catch (e) {}
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
