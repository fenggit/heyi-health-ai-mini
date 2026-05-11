const { getLayoutMetrics } = require("../../utils/layout")
const request = require("../../utils/request")
const paths = require("../../http/paths")

/**
 * 将 checkInTime (date-time string) 格式化为可读时间
 * 例：2024-05-04T08:30:00 → "5月4日·08:30"
 * 今天的记录显示 "今天·HH:mm"
 */
function formatRecordTime(checkInDate, checkInTime) {
  const now = new Date()
  const todayStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-')

  let timeStr = ''
  if (checkInTime) {
    // checkInTime 可能是 "2024-05-04T08:30:00" 或 "08:30:00"
    const match = String(checkInTime).match(/(\d{2}):(\d{2})/)
    if (match) timeStr = `${match[1]}:${match[2]}`
  }

  if (checkInDate === todayStr) {
    return timeStr ? `今天·${timeStr}` : '今天'
  }

  // 解析日期
  const parts = String(checkInDate).split('-')
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
    // 概览数据
    totalCount: 0,
    continuousDays: 0,
    monthCount: 0,
    todayCheckedIn: false,
    // 打卡记录列表
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

    request.get(paths.checkin.juiceSummary)
      .then((res) => {
        const data = (res && res.data) || {}
        const overview = data.overview || {}
        const list = Array.isArray(data.list) ? data.list : []

        const records = list.map((item) => ({
          id: item.id,
          name: item.recipeName || item.otherName || item.juiceTypeName || '',
          time: formatRecordTime(item.checkInDate, item.checkInTime),
          note: item.note || '',
          imageUrl: item.imageUrl || item.recipeCoverUrl || '',
        }))

        this.setData({
          totalCount: overview.totalCheckInCount || 0,
          continuousDays: overview.continuousDays || 0,
          monthCount: overview.monthCheckInCount || 0,
          todayCheckedIn: !!overview.todayCheckedIn,
          records
        })
      })
      .catch((err) => {
        console.error('[checkin-drink] 加载失败:', err)
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
    wx.navigateTo({ url: '/pages/drink-checkin-new/index' })
  }
})
