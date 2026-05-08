const { fetchUserInfo } = require("../http/auth")

Component({
  data: {
    selected: 0,
    tabs: [
      {
        text: "首页",
        path: "/pages/home/index"
      },
      {
        text: "商城",
        path: "/pages/mall/index"
      },
      // {
      //   text: "食养",
      //   path: "/pages/diet/index"
      // },
      {
        text: "我的",
        path: "/pages/profile/index"
      }
    ]
  },
  methods: {
    requireLogin(featureName) {
      const app = getApp()
      const isLogin = !!(app && app.globalData && app.globalData.isLogin)
      if (isLogin) return true

      wx.showModal({
        title: "温馨提示",
        content: `登录后才可使用${featureName}，是否前往登录？`,
        confirmText: "去登录",
        cancelText: "再看看",
        success: (res) => {
          if (!res.confirm) return
          const pages = getCurrentPages()
          const current = pages[pages.length - 1]
          if (current && current.route === "pages/login/index") return
          wx.navigateTo({
            url: "/pages/login/index"
          })
        }
      })

      return false
    },
    tryFetchUserInfo(path) {
      if (path !== "/pages/profile/index") return
      const app = getApp()
      if (!app || !app.globalData || !app.globalData.isLogin) return
      fetchUserInfo().catch((err) => {
        console.error("[tabbar] 获取用户信息失败", err)
      })
    },
    switchTab(e) {
      const { path, index } = e.currentTarget.dataset
      const next = Number(index)

      if (path === "/pages/profile/index" && !this.requireLogin("“我的”")) {
        return
      }

      this.tryFetchUserInfo(path)
      if (next === this.data.selected || this.switching) return

      this.switching = true
      wx.switchTab({
        url: path,
        fail: (err) => {
          console.warn("[tabbar] switchTab 失败:", err)
        },
        complete: () => {
          setTimeout(() => {
            this.switching = false
          }, 120)
        }
      })
    },
    openAiChat() {
      if (!this.requireLogin("AI食养")) {
        return
      }

      const pages = getCurrentPages()
      const current = pages[pages.length - 1]
      if (current && current.route === "pages/ai-chat/index") return
      wx.navigateTo({ url: "/pages/ai-chat/index" })
    }
  }
})
