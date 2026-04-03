const { initMiniNav, backWithFallback } = require('../../utils/mini-nav')

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

    navTitle: '设置',
    notifyEnabled: true,
    darkModeEnabled: true
  },

  onLoad() {
    initMiniNav(this)
  },

  handleBack() {
    backWithFallback('/pages/profile/index')
  },

  onNotifyChange(e) {
    this.setData({ notifyEnabled: e.detail.value })
  },

  onDarkModeChange(e) {
    this.setData({ darkModeEnabled: e.detail.value })
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确认退出当前账号吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token')
          const app = getApp()
          if (app) app.globalData.isLoggedIn = false
          wx.reLaunch({ url: '/pages/login/index' })
        }
      }
    })
  }
})
