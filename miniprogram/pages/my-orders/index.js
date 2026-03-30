const { initMiniNav, backWithFallback } = require('../../utils/mini-nav')

const TAB_LIST = [
  { key: 'all', label: '全部订单' },
  { key: 'pending', label: '待发货' },
  { key: 'shipping', label: '配送中' },
  { key: 'completed', label: '已完成' }
]

const ORDER_LIST = [
  {
    id: '202603190001',
    status: 'pending',
    statusText: '待发货',
    createTime: '2026-03-19 15:32:31',
    items: [
      { image: '/assets/mall/product-carrot.png', count: 2 },
      { image: '/assets/diet-plan/recipe_img.png', count: 1 }
    ],
    totalCount: 3,
    totalPrice: '184'
  },
  {
    id: '202603190001',
    status: 'shipping',
    statusText: '配送中',
    createTime: '2026-03-19 15:32:31',
    items: [
      { image: '/assets/mall/product-carrot.png', count: 2 },
      { image: '/assets/diet-plan/recipe_img.png', count: 1 }
    ],
    totalCount: 3,
    totalPrice: '184'
  },
  {
    id: '202603190001',
    status: 'completed',
    statusText: '已完成',
    createTime: '2026-03-19 15:32:31',
    items: [
      { image: '/assets/mall/product-carrot.png', count: 2 },
      { image: '/assets/diet-plan/recipe_img.png', count: 1 }
    ],
    totalCount: 3,
    totalPrice: '184'
  }
]

function withStyle(list) {
  return list.map((item) => {
    let statusClass = 'order-status--pending'
    if (item.status === 'shipping') statusClass = 'order-status--shipping'
    if (item.status === 'completed') statusClass = 'order-status--completed'
    return {
      ...item,
      statusClass
    }
  })
}

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

    navTitle: '我的订单',
    tabs: TAB_LIST,
    activeTab: 'all',
    orders: withStyle(ORDER_LIST),
    filteredOrders: withStyle(ORDER_LIST)
  },

  onLoad() {
    initMiniNav(this)
  },

  handleBack() {
    backWithFallback('/pages/profile/index')
  },

  selectTab(e) {
    const { tab } = e.currentTarget.dataset
    const nextList = tab === 'all' ? this.data.orders : this.data.orders.filter((item) => item.status === tab)
    this.setData({
      activeTab: tab,
      filteredOrders: nextList
    })
  },

  viewLogistics(e) {
    const { id } = e.currentTarget.dataset
    wx.showToast({ title: '订单 ' + id + ' 物流待接入', icon: 'none' })
  },

  viewDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.showToast({ title: '订单 ' + id + ' 详情待接入', icon: 'none' })
  }
})
