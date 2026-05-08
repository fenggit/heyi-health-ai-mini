const { getLayoutMetrics } = require("../../utils/layout")

Page({
  data: {
    headerHeight: 64,
    posts: [
      {
        id: 1,
        username: '健康生活家',
        time: '1天前',
        title: '轻断食打卡 - 第30天',
        likeCount: 128,
        liked: false,
        tags: ['轻断食打卡', '16:8轻断食'],
        content: '坚持了30天的16:8轻断食，体重减5kg，整个人的精神状态很好！今天的断食时间从20:00到12:00，16小时，感觉状态很棒!'
      },
      {
        id: 2,
        username: '果蔬爱好者',
        time: '1天前',
        title: '喝汁打卡 - 绿色果蔬汁',
        likeCount: 128,
        liked: false,
        tags: ['喝汁打卡', '果蔬汁'],
        content: ''
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

  onLikeTap(e) {
    const { id } = e.currentTarget.dataset
    const posts = this.data.posts.map(item => {
      if (item.id === id) {
        const liked = !item.liked
        return { ...item, liked, likeCount: liked ? item.likeCount + 1 : item.likeCount - 1 }
      }
      return item
    })
    this.setData({ posts })
  }
})
