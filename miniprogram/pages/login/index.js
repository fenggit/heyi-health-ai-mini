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

    const { code, encryptedData, iv } = e.detail
    console.log('[getPhoneNumber] code:', code)
    console.log('[getPhoneNumber] encryptedData:', encryptedData)
    console.log('[getPhoneNumber] iv:', iv)

    // 先调用 wx.login 获取 code，再结合手机号 code 请求后端
    wx.login({
      success: (loginRes) => {
        console.log('[wx.login] 完整回调数据:', JSON.stringify(loginRes))

        if (!loginRes.code) {
          wx.showToast({ title: '登录失败，请重试', icon: 'none' })
          return
        }

        console.log('[wx.login] code:', loginRes.code)
        console.log('[合并数据]', JSON.stringify({ loginCode: loginRes.code, phoneCode: code, encryptedData, iv }))

        // 模拟登录成功，存储 token 后跳转首页
        // 实际项目中 token 由后端返回，此处用 loginRes.code 占位
        wx.setStorageSync('token', loginRes.code)
        const app = getApp()
        if (app) app.globalData.isLoggedIn = true
        this._goHome()
      },
      fail: () => {
        wx.showToast({ title: '登录失败，请重试', icon: 'none' })
      }
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
