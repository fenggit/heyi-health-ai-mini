const { getLayoutMetrics } = require("../../utils/layout")

Page({
  data: {
    headerHeight: 64,
    // 设计稿数值
    totalCount: 15,
    continuousDays: 3,
    avgHours: '16.0',
    weightChange: '-0.6',
    records: [
      {
        id: 1,
        name: '16:8轻断食',
        duration: '16小时',
        time: '昨天·8:30',
        detail: '体重：65.5kg    感受：精神状态很好',
        note: '',
        checked: true
      },
      {
        id: 2,
        name: '16:8轻断食',
        duration: '16小时',
        time: '5月4日·8:30',
        detail: '体重：65.5kg    感受：精神状态很好',
        note: '今天好饿好饿~~~~~',
        checked: true
      }
    ]
  },

  onLoad() {
    this.syncLayout()
  },

  syncLayout() {
    const { headerHeight } = getLayoutMetrics()
    this.setData({
      headerHeight: headerHeight || 64
    })
  },

  onBack() {
    wx.navigateBack()
  },

  onCheckin() {
    wx.showToast({
      title: '打卡成功',
      icon: 'success'
    })
  },

  onRecordCheckChange(e) {
    const { id } = e.currentTarget.dataset
    const { checked } = e.detail
    const records = this.data.records.map(item =>
      item.id === id ? { ...item, checked } : item
    )
    this.setData({ records })
  }
})
