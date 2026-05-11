const { getLayoutMetrics } = require("../../utils/layout")

function formatDate(date) {
  const y = date.getFullYear()
  const mo = date.getMonth() + 1
  const d = date.getDate()
  return `${y}年${mo}月${d}日`
}

function calcDuration(start, end) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const startMins = sh * 60 + sm
  const endMins = eh * 60 + em
  if (endMins <= startMins) return 0
  const diff = (endMins - startMins) / 60
  return Math.round(diff * 10) / 10
}

Page({
  data: {
    headerHeight: 64,
    currentDate: '',
    fastingTypes: [
      { id: '16_8', label: '16:8轻断食' },
      { id: '14_10', label: '14:10轻断食' },
      { id: '18_6', label: '18:6轻断食' },
      { id: '20_4', label: '20:4轻断食' },
      { id: '5_2', label: '5:2轻断食' },
      { id: 'alt', label: '隔日断食' }
    ],
    selectedType: '',
    startTime: '20:00',
    endTime: '12:00',
    durationHours: 16,
    weight: '',
    bodyFat: '',
    feelings: [
      { id: 'great_spirit', label: '精神状态很好' },
      { id: 'hungry', label: '有点饿' },
      { id: 'good', label: '感觉良好' },
      { id: 'tired', label: '有点累' },
      { id: 'excellent', label: '非常棒' }
    ],
    selectedFeelings: [],
    note: '',
    shareToContent: true
  },

  onLoad() {
    const { headerHeight } = getLayoutMetrics()
    const now = new Date()
    this.setData({
      headerHeight: headerHeight || 64,
      currentDate: formatDate(now),
      durationHours: calcDuration('20:00', '12:00')
    })
  },

  onBack() {
    wx.navigateBack()
  },

  onTypeSelect(e) {
    const { id } = e.currentTarget.dataset
    this.setData({ selectedType: id })
  },

  onStartTimeChange(e) {
    const startTime = e.detail.value
    const durationHours = calcDuration(startTime, this.data.endTime)
    if (this.data.endTime && durationHours <= 0) {
      wx.showToast({ title: '开始时间须早于结束时间', icon: 'none' })
      // 重置结束时间
      this.setData({ startTime, endTime: '', durationHours: 0 })
      return
    }
    this.setData({ startTime, durationHours })
  },

  onEndTimeChange(e) {
    const endTime = e.detail.value
    const durationHours = calcDuration(this.data.startTime, endTime)
    if (durationHours <= 0) {
      wx.showToast({ title: '结束时间须晚于开始时间', icon: 'none' })
      return
    }
    this.setData({ endTime, durationHours })
  },

  onWeightInput(e) {
    this.setData({ weight: e.detail.value })
  },

  onBodyFatInput(e) {
    this.setData({ bodyFat: e.detail.value })
  },

  onFeelingToggle(e) {
    const { id } = e.currentTarget.dataset
    const feelings = this.data.feelings.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    )
    this.setData({ feelings })
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  onShareToggle() {
    this.setData({ shareToContent: !this.data.shareToContent })
  },

  onSubmit() {
    if (!this.data.selectedType) {
      wx.showToast({ title: '请选择断食类型', icon: 'none' })
      return
    }
    if (!this.data.startTime || !this.data.endTime) {
      wx.showToast({ title: '请设置断食时间', icon: 'none' })
      return
    }
    wx.showLoading({ title: '打卡中...', mask: true })
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({ title: '打卡成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    }, 800)
  }
})
