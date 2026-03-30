const { initMiniNav, backWithFallback } = require('../../utils/mini-nav')

const FAVORITE_LIST = [
  {
    id: 'c1',
    name: '养胃气血汁水',
    tags: ['补气血', '养脾胃'],
    desc: '富含铁质和维生素C，补血养气',
    image: '/assets/mall/product-carrot.png',
    time: '2026-03-19 15:32:31'
  },
  {
    id: 'c2',
    name: '养胃气血汁水',
    tags: ['补气血', '养脾胃'],
    desc: '富含铁质和维生素C，补血养气',
    image: '/assets/mall/product-carrot.png',
    time: '2026-03-19 15:32:31'
  },
  {
    id: 'c3',
    name: '养胃气血汁水',
    tags: ['补气血', '养脾胃'],
    desc: '富含铁质和维生素C，补血养气',
    image: '/assets/mall/product-carrot.png',
    time: '2026-03-19 15:32:31'
  },
  {
    id: 'c4',
    name: '养胃气血汁水',
    tags: ['补气血', '养脾胃'],
    desc: '富含铁质和维生素C，补血养气',
    image: '/assets/mall/product-carrot.png',
    time: '2026-03-19 15:32:31'
  }
]

Page({
  data: {
    topInset: 32,
    statusBarHeight: 20,
    navBarHeight: 44,
    headerHeight: 64,
    menuWidth: 88,
    menuHeight: 32,
    menuTop: 26,
    menuRight: 12,

    navTitle: '我的收藏',
    list: FAVORITE_LIST
  },

  onLoad() {
    initMiniNav(this)
  },

  handleBack() {
    backWithFallback('/pages/profile/index')
  },

  cancelFavorite(e) {
    const { id } = e.currentTarget.dataset
    const nextList = this.data.list.filter((item) => item.id !== id)
    this.setData({ list: nextList })
    wx.showToast({ title: '已取消收藏', icon: 'none' })
  }
})
