const { initMiniNav, backWithFallback } = require('../../utils/mini-nav')
const request = require('../../utils/request')
const { clearUserInfoCache } = require('../../http/auth')

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
    avatarText: '合',
    nickname: '西兰花护体专员',
    notifyEnabled: true,
    darkModeEnabled: false
  },

  onLoad() {
    initMiniNav(this)
  },

  handleBack() {
    backWithFallback('/pages/profile/index')
  },

  onNotifyChange(e) {
    const notifyEnabled = e.detail.value
    this.setData({ notifyEnabled })
  },

  onDarkModeChange(e) {
    const darkModeEnabled = e.detail.value
    this.setData({ darkModeEnabled })
  },

  openAddressPage() {
    wx.navigateTo({ url: '/pages/my-address/index' })
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确认退出当前账号吗？',
      success: (res) => {
        if (res.confirm) {
          request.clearAuthToken()
          clearUserInfoCache()
          const app = getApp()
          if (app && app.globalData) app.globalData.isLogin = false
          wx.reLaunch({ url: '/pages/login/index' })
        }
      }
    })
  }
})
