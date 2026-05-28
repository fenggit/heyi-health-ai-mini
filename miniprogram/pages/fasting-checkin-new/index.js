const { getLayoutMetrics } = require("../../utils/layout")
const request = require("../../utils/request")
const paths = require("../../http/paths")
const { fetchUserInfo } = require("../../http/auth")
const { loadFastingCache, saveFastingCache } = require("../../utils/fasting-cache")

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
    // 从接口加载
    fastingTypes: [],
    selectedTypeCode: '',
    startTime: '20:00',
    endTime: '12:00',
    durationHours: 16,
    weight: '',
    bodyFat: '',
    // 从接口加载，每项 { code, name, checked }
    feelings: [],
    note: '',
    shareToContent: true,
    submitting: false
  },

  onLoad() {
    const { headerHeight } = getLayoutMetrics()
    const now = new Date()

    // 恢复本地缓存的3个字段
    const cache = loadFastingCache()
    const cachedTypeCode = cache.selectedTypeCode || ''
    const cachedWeight = cache.weight || ''
    const cachedBodyFat = cache.bodyFat || ''

    this.setData({
      headerHeight: headerHeight || 64,
      currentDate: formatDate(now),
      durationHours: calcDuration('20:00', '12:00'),
      selectedTypeCode: cachedTypeCode,
      weight: cachedWeight,
      bodyFat: cachedBodyFat
    })
    this.loadOptions()
  },

  onBack() {
    wx.navigateBack()
  },

  /** 加载断食类型和感受标签选项 */
  loadOptions() {
    wx.showLoading({ title: '加载中...', mask: true })
    request.get(paths.checkin.fastingOptions)
      .then((res) => {
        const data = (res && res.data) || {}

        const fastingTypes = Array.isArray(data.fastingTypeOptions)
          ? data.fastingTypeOptions.map((item) => ({
              code: item.code,
              label: item.name
            }))
          : []

        const feelings = Array.isArray(data.feelingTagOptions)
          ? data.feelingTagOptions.map((item) => ({
              code: item.code,
              label: item.name,
              checked: false
            }))
          : []

        this.setData({ fastingTypes, feelings })
      })
      .catch((err) => {
        console.error('[fasting-checkin-new] 加载选项失败:', err)
      })
      .finally(() => {
        wx.hideLoading()
      })
  },

  onTypeSelect(e) {
    const { code } = e.currentTarget.dataset
    this.setData({ selectedTypeCode: code })
    saveFastingCache({ selectedTypeCode: code })
  },

  onStartTimeChange(e) {
    const startTime = e.detail.value
    const durationHours = calcDuration(startTime, this.data.endTime)
    if (this.data.endTime && durationHours <= 0) {
      wx.showToast({ title: '开始时间须早于结束时间', icon: 'none' })
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
    const weight = e.detail.value
    this.setData({ weight })
    saveFastingCache({ weight })
  },

  onBodyFatInput(e) {
    const bodyFat = e.detail.value
    this.setData({ bodyFat })
    saveFastingCache({ bodyFat })
  },

  onFeelingToggle(e) {
    const { code } = e.currentTarget.dataset
    const feelings = this.data.feelings.map(item =>
      item.code === code ? { ...item, checked: !item.checked } : item
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
    const { selectedTypeCode, startTime, endTime, weight, bodyFat, feelings, note, shareToContent, submitting } = this.data

    if (!selectedTypeCode) {
      wx.showToast({ title: '请选择断食类型', icon: 'none' })
      return
    }
    if (!startTime || !endTime) {
      wx.showToast({ title: '请设置断食时间', icon: 'none' })
      return
    }
    if (submitting) return
    this.setData({ submitting: true })

    // 构造日期时间字符串，格式 "yyyy-MM-dd HH:mm:ss"
    const now = new Date()
    const todayStr = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-')

    // 开始时间晚于结束时间，说明跨天（如 20:00 → 次日 12:00），开始日期取昨天
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const startMins = sh * 60 + sm
    const endMins = eh * 60 + em
    let startDateStr = todayStr
    if (startMins >= endMins) {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      startDateStr = [
        yesterday.getFullYear(),
        String(yesterday.getMonth() + 1).padStart(2, '0'),
        String(yesterday.getDate()).padStart(2, '0')
      ].join('-')
    }

    const body = {
      fastingTypeCode: selectedTypeCode,
      startTime: `${startDateStr} ${startTime}:00`,
      endTime: `${todayStr} ${endTime}:00`,
      isPublic: shareToContent
    }

    if (weight) body.weightKg = parseFloat(weight)
    if (bodyFat) body.bodyFatRate = parseFloat(bodyFat)

    const checkedCodes = feelings.filter(f => f.checked).map(f => f.code)
    if (checkedCodes.length) body.feelingTagCodes = checkedCodes

    if (note) body.note = note

    wx.showLoading({ title: '打卡中...', mask: true })
    request.post(paths.checkin.fastingCheckIn, body)
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '打卡成功', icon: 'success' })
        fetchUserInfo().catch((err) => {
          console.warn('[fasting-checkin-new] 刷新用户信息失败:', err)
        })
        setTimeout(() => wx.navigateBack(), 1500)
      })
      .catch((err) => {
        console.error('[fasting-checkin-new] 打卡失败:', err)
        wx.hideLoading()
      })
      .finally(() => {
        this.setData({ submitting: false })
      })
  }
})
