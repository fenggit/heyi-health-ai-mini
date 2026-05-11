const { getLayoutMetrics } = require("../../utils/layout")
const request = require("../../utils/request")
const paths = require("../../http/paths")

/**
 * 将 startTime/endTime (date-time string) 格式化为可读时间
 * 今天显示 "今天·HH:mm"，其他日期显示 "M月D日·HH:mm"
 */
function formatRecordTime(checkInDate, startTime) {
  const now = new Date()
  const todayStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-')

  let timeStr = ''
  if (startTime) {
    const match = String(startTime).match(/(\d{2}):(\d{2})/)
    if (match) timeStr = `${match[1]}:${match[2]}`
  }

  if (checkInDate === todayStr) {
    return timeStr ? `今天·${timeStr}` : '今天'
  }

  const parts = String(checkInDate || '').split('-')
  if (parts.length === 3) {
    const m = parseInt(parts[1], 10)
    const d = parseInt(parts[2], 10)
    return timeStr ? `${m}月${d}日·${timeStr}` : `${m}月${d}日`
  }

  return checkInDate || ''
}

Page({
  data: {
    headerHeight: 64,
    totalCount: 0,
    continuousDays: 0,
    avgHours: '-',
    weightChange: '-',
    records: [],
    loading: false
  },

  onLoad() {
    this.syncLayout()
  },

  onShow() {
    this.loadSummary()
  },

  syncLayout() {
    const { headerHeight } = getLayoutMetrics()
    this.setData({ headerHeight: headerHeight || 64 })
  },

  loadSummary() {
    wx.showLoading({ title: '加载中...', mask: true })
    this.setData({ loading: true })

    request.get(paths.checkin.fastingSummary)
      .then((res) => {
        const data = (res && res.data) || {}
        const overview = data.overview || {}
        const list = Array.isArray(data.list) ? data.list : []

        // 体重变化：有值时显示带符号的数字，无则显示 -
        const weightChange = overview.weightChange != null
          ? (overview.weightChange > 0 ? `+${overview.weightChange}` : String(overview.weightChange))
          : '-'

        const avgHours = overview.avgDurationHours != null
          ? String(overview.avgDurationHours)
          : '-'

        const records = list.map((item) => {
          const feelingNames = Array.isArray(item.feelingTagNames) ? item.feelingTagNames.join('、') : ''
          const detailParts = []
          if (item.weightKg != null) detailParts.push(`体重：${item.weightKg}kg`)
          if (item.bodyFatRate != null) detailParts.push(`体脂：${item.bodyFatRate}%`)
          if (feelingNames) detailParts.push(`感受：${feelingNames}`)

          return {
            id: item.id,
            name: item.fastingTypeName || item.fastingTypeCode || '',
            duration: item.durationHours != null ? `${item.durationHours}小时` : '',
            time: formatRecordTime(item.checkInDate, item.startTime),
            detail: detailParts.join('    '),
            note: item.note || ''
          }
        })

        this.setData({
          totalCount: overview.totalCheckInDays || 0,
          continuousDays: overview.continuousDays || 0,
          avgHours,
          weightChange,
          records
        })
      })
      .catch((err) => {
        console.error('[checkin-fasting] 加载失败:', err)
        wx.showToast({ title: '加载失败，请重试', icon: 'none' })
      })
      .finally(() => {
        wx.hideLoading()
        this.setData({ loading: false })
      })
  },

  onBack() {
    wx.navigateBack()
  },

  noop() {},

  onCheckin() {
    wx.navigateTo({ url: '/pages/fasting-checkin-new/index' })
  }
})
