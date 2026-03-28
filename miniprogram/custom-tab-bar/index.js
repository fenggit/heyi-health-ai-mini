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
      {
        text: "食养",
        path: "/pages/diet/index"
      },
      {
        text: "我的",
        path: "/pages/profile/index"
      }
    ]
  },
  methods: {
    switchTab(e) {
      const { path, index } = e.currentTarget.dataset
      const next = Number(index)
      if (next === this.data.selected || this.switching) return
      this.switching = true
      wx.switchTab({
        url: path,
        complete: () => {
          setTimeout(() => {
            this.switching = false
          }, 120)
        }
      })
    },
    openAnalysis() {
      wx.navigateTo({ url: "/pages/analysis/index" })
    }
  }
})
