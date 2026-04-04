const request = require('../../utils/request')
const { wxPhoneLogin } = require('../../http/auth')

const AGREEMENT_CONTENT = '基于中医体质理论和现代营养学，运用AI技术为每一位用户提供个性化的食养方案，帮助大家通过科学饮食改善体质，实现健康生活。\n\n基于中医体质理论和现代营养学，运用AI技术为每一位用户提供个性化的食养方案，帮助大家通过科学饮食改善体质，实现健康生活。基于中医体质理论和现代营养学，运用AI技术为每一位用户提供个性化的食养方案，帮助大家通过科学饮食改善体质，实现健康生活。'

const PRIVACY_CONTENT = '基于中医体质理论和现代营养学，运用AI技术为每一位用户提供个性化的食养方案，帮助大家通过科学饮食改善体质，实现健康生活。\n\n基于中医体质理论和现代营养学，运用AI技术为每一位用户提供个性化的食养方案，帮助大家通过科学饮食改善体质，实现健康生活。基于中医体质理论和现代营养学，运用AI技术为每一位用户提供个性化的食养方案，帮助大家通过科学饮食改善体质，实现健康生活。'

Page({
  data: {
    agreed: false,
    popupShow: false,
    popupTitle: '',
    popupContent: ''
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

    wxPhoneLogin({ phoneCode })
      .then((res) => {
        console.log('[wxPhoneLogin] 登录成功:', JSON.stringify(res))
        const token = res.data?.access_token || ''
        request.setAuthToken(token)
        const app = getApp()
        if (app) app.globalData.isLoggedIn = true
        wx.hideLoading()
        this._goHome()
      })
      .catch((err) => {
        console.error('[wxPhoneLogin] 登录失败:', err)
        wx.hideLoading()
      })
  },

  _goHome() {
    wx.switchTab({ url: '/pages/home/index' })
  },

  openUserAgreement() {
    this.setData({ popupShow: true, popupTitle: '用户协议', popupContent: AGREEMENT_CONTENT })
  },

  openPrivacyPolicy() {
    this.setData({ popupShow: true, popupTitle: '隐私政策', popupContent: PRIVACY_CONTENT })
  },

  onPopupConfirm() {
    this.setData({ popupShow: false })
  }
})
