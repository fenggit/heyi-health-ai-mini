Page({
  data: {
    title: '',
    url: ''
  },
  onLoad(options) {
    const title = options.title ? decodeURIComponent(options.title) : ''
    const url = options.url ? decodeURIComponent(options.url) : ''
    this.setData({ title, url })
    if (title) {
      wx.setNavigationBarTitle({ title })
    }
  }
})
