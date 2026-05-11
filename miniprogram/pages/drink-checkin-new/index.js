const { getLayoutMetrics } = require("../../utils/layout")

function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function formatDate(date) {
  const y = date.getFullYear()
  const mo = date.getMonth() + 1
  const d = date.getDate()
  return `${y}年${mo}月${d}日`
}

Page({
  data: {
    headerHeight: 64,
    currentTime: '',
    currentDate: '',
    juiceTypes: [
      { id: 'green', label: '绿色果蔬汁' },
      { id: 'carrot', label: '胡萝卜橙汁' },
      { id: 'berry', label: '紫色莓果汁' },
      { id: 'apple', label: '苹果芹菜汁' },
      { id: 'cucumber', label: '黄瓜柠檬汁' },
      { id: 'tomato', label: '番茄汁' },
      { id: 'mixed', label: '混合果汁' },
      { id: 'other', label: '其他' }
    ],
    selectedType: '',
    photoPath: '',
    note: '',
    shareToContent: true
  },

  onLoad() {
    const { headerHeight } = getLayoutMetrics()
    const now = new Date()
    this.setData({
      headerHeight: headerHeight || 64,
      currentTime: formatTime(now),
      currentDate: formatDate(now)
    })
  },

  onBack() {
    wx.navigateBack()
  },

  onTypeSelect(e) {
    const { id } = e.currentTarget.dataset
    this.setData({ selectedType: id })
  },

  onChoosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath
        this.setData({ photoPath: path })
      }
    })
  },

  onRemovePhoto() {
    this.setData({ photoPath: '' })
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  onShareToggle() {
    this.setData({ shareToContent: !this.data.shareToContent })
  },

  onSubmit() {
    if (!this.data.selectedType) {
      wx.showToast({ title: '请选择果蔬汁类型', icon: 'none' })
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
