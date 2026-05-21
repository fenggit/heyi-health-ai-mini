const { getLayoutMetrics } = require("../../utils/layout")
const request = require("../../utils/request")
const paths = require("../../http/paths")

const PAGE_SIZE = 10

/**
 * 格式化时间：date-time → "M月D日" 或 "今天"
 */
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
    const m = parseInt(parts[1], 10)
    const d = parseInt(parts[2], 10)
    return `${m}月${d}日`
  }
  return datePart
}

function mapRecord(item) {
  return {
    id: item.shareRecordId,
    username: item.userNickNameSnapshot || '',
    avatarUrl: item.userAvatarSnapshot || '',
    time: formatTime(item.createTime),
    title: item.title || '',
    content: item.contentText || '',
    coverImageUrl: item.coverImageUrl || '',
    imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls : [],
    tags: Array.isArray(item.tagNames) ? item.tagNames : [],
    likeCount: item.likeCount || 0,
    liked: !!item.liked,
    sourceTypeName: item.sourceTypeName || ''
  }
}

Page({
  data: {
    headerHeight: 64,
    posts: [],
    pageNum: 1,
    hasMore: true,
    loading: false
  },

  onLoad() {
    this.syncLayout()
    this.loadList(1)
  },

  onShow() {},

  syncLayout() {
    const { headerHeight } = getLayoutMetrics()
    this.setData({ headerHeight: headerHeight || 64 })
  },

  onBack() {
    wx.navigateBack()
  },

  loadList(pageNum) {
    if (this.data.loading) return
    this.setData({ loading: true })

    if (pageNum === 1) {
      wx.showLoading({ title: '加载中...', mask: true })
    }

    request.get(paths.checkin.shareList, { pageNum, pageSize: PAGE_SIZE })
      .then((res) => {
        const data = (res && res.data) || {}
        const list = Array.isArray(data.rows) ? data.rows : (Array.isArray(data.records) ? data.records : [])
        const total = data.total || 0
        const records = list.map(mapRecord)

        const posts = pageNum === 1 ? records : this.data.posts.concat(records)
        const hasMore = posts.length < total

        this.setData({ posts, pageNum, hasMore })
      })
      .catch((err) => {
        console.error('[checkin-list] 加载失败:', err)
        if (pageNum === 1) {
          wx.showToast({ title: '加载失败，请重试', icon: 'none' })
        }
      })
      .finally(() => {
        wx.hideLoading()
        this.setData({ loading: false })
      })
  },

  /** 滚动到底部加载下一页 */
  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return
    this.loadList(this.data.pageNum + 1)
  },

  onItemTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/checkin-detail/index?id=${id}` })
  },

  onLikeTap(e) {
    const { id } = e.currentTarget.dataset
    const post = this.data.posts.find(item => item.id === id)
    if (!post) return

    const willLike = !post.liked
    const url = willLike ? paths.checkin.shareLike(id) : paths.checkin.shareUnlike(id)

    // 乐观更新
    const posts = this.data.posts.map(item => {
      if (item.id === id) {
        return { ...item, liked: willLike, likeCount: willLike ? item.likeCount + 1 : item.likeCount - 1 }
      }
      return item
    })
    this.setData({ posts })

    request.post(url).catch((err) => {
      console.error('[checkin-list] 点赞失败:', err)
      // 回滚
      const rollback = this.data.posts.map(item => {
        if (item.id === id) {
          return { ...item, liked: !willLike, likeCount: willLike ? item.likeCount - 1 : item.likeCount + 1 }
        }
        return item
      })
      this.setData({ posts: rollback })
    })
  }
})
