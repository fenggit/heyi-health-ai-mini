const { getLayoutMetrics } = require('../../utils/layout')

Component({
  properties: {
    title: {
      type: String,
      value: ''
    },
    // 是否显示返回键
    showBack: {
      type: Boolean,
      value: true
    }
  },
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    menuWidth: 88,
    menuHeight: 32,
    menuTop: 26,
    menuRight: 12
  },
  lifetimes: {
    attached() {
      const { statusBarHeight, navBarHeight } = getLayoutMetrics()
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

      this.setData({ statusBarHeight, navBarHeight, menuWidth, menuHeight, menuTop, menuRight })
    }
  },
  methods: {
    handleBack() {
      this.triggerEvent('back', { source: 'header' })
    }
  }
})
