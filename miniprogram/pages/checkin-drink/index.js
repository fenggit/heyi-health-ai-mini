const { getLayoutMetrics } = require("../../utils/layout")

Page({
  data: {
    headerHeight: 64,
    totalCount: 15,
    continuousDays: 3,
    monthCount: 3,
    records: [
      {
        id: 1,
        name: "养胃气血汁水",
        time: "昨天·8:30",
        note: "早餐果蔬汁，感觉很清爽",
        checked: true
      },
      {
        id: 2,
        name: "清肝明目汁",
        time: "5月4日·8:30",
        note: "今天尝试新配方",
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

  // checkbox 点击切换打卡状态
  onRecordCheckChange(e) {
    const { id } = e.currentTarget.dataset
    const { checked } = e.detail
    const records = this.data.records.map(item =>
      item.id === id ? { ...item, checked } : item
    )
    this.setData({ records })
  }
})
