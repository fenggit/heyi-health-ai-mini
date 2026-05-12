const { getLayoutMetrics } = require("../../utils/layout")
const request = require("../../utils/request")
const paths = require("../../http/paths")

function formatTime(dateTimeStr) {
  if (!dateTimeStr) return ''
  const now = new Date()
  const todayStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-')
  const datePart = String(dateTimeStr).slice(0, 10)
  if (datePart === todayStr) return '今天'
  const parts = datePart.split('-')
  if (parts.length === 3) {
    return `${parseInt(parts[1], 10)}月${parseInt(parts[2], 10)}日`
  }
  return datePart
}

Page({
  data: {
    headerHeight: 64,
    id: '',
    detail: null,
    loading: true,
    likeChanged: false
  },

  onLoad(options) {
    const { headerHeight } = getLayoutMetrics()
    this.setData({ headerHeight: headerHeight || 64, id: options.id || '', likeChanged: false })
    if (options.id) {
      this.loadDetail(options.id)
    }
  },

  onBack() {
    // 有点赞变更，直接刷新前一页列表再返回
    if (this.data.likeChanged) {
      const pages = getCurrentPages()
      const prevPage = pages[pages.length - 2]
      if (prevPage && typeof prevPage.loadList === 'function') {
        prevPage.loadList(1)
      }
    }
    wx.navigateBack()
  },

  onHide() {},

  loadDetail(id) {
    wx.showLoading({ title: '加载中...', mask: true })
    request.get(paths.checkin.shareDetail(id))
      .then((res) => {
        const item = (res && res.data) || {}
        const detail = {
          id: item.shareRecordId,
          username: item.userNickNameSnapshot || '',
          avatarUrl: item.userAvatarSnapshot || '',
          time: formatTime(item.createTime),
          title: item.title || '',
          summary: item.summary || '',
          content: item.contentText || '',
          coverImageUrl: item.coverImageUrl || '',
          imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls : [],
          tags: Array.isArray(item.tagNames) ? item.tagNames : [],
          likeCount: item.likeCount || 0,
          liked: !!item.liked,
          sourceTypeName: item.sourceTypeName || '',
          // sourceSnapshot 原样保留，用于展示打卡详情
          snapshot: item.sourceSnapshot || null,
          sourceType: item.sourceType || ''
        }
        this.setData({ detail, loading: false })
      })
      .catch((err) => {
        console.error('[share-detail] 加载失败:', err)
        this.setData({ loading: false })
      })
      .finally(() => {
        wx.hideLoading()
      })
  },

  onLikeTap() {
    if (!this.data.detail) return
    const { id, liked } = this.data.detail
    const willLike = !liked
    const url = willLike ? paths.checkin.shareLike(id) : paths.checkin.shareUnlike(id)

    // 乐观更新
    this.setData({
      'detail.liked': willLike,
      'detail.likeCount': willLike ? this.data.detail.likeCount + 1 : this.data.detail.likeCount - 1
    })

    request.post(url)
      .then(() => {
        this.setData({ likeChanged: true })
      })
      .catch((err) => {
      console.error('[checkin-detail] 点赞失败:', err)
      // 回滚
      this.setData({
        'detail.liked': !willLike,
        'detail.likeCount': willLike ? this.data.detail.likeCount - 1 : this.data.detail.likeCount + 1
      })
    })
  }
})
