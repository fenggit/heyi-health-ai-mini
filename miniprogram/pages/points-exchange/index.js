const { initMiniNav, backWithFallback } = require('../../utils/mini-nav')

const REWARD_ITEMS = [
  { id: 'r1', leftTitle: '¥ 5', leftSub: '500 积分', name: '5 元优惠券', stock: 100 },
  { id: 'r2', leftTitle: '¥ 10', leftSub: '1000 积分', name: '10 元优惠券', stock: 100 },
  { id: 'r3', leftTitle: '免运费', leftSub: '300 积分', name: '10 元优惠券', stock: 100 }
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

    navTitle: '积分兑换',
    pageTitle: '积分兑换',
    pageSubTitle: '用积分兑换优惠券和礼品',
    myPoints: 1280,
    memberLevel: '普通会员',
    monthlyIncome: 280,
    rewardItems: REWARD_ITEMS
  },

  onLoad() {
    initMiniNav(this)
  },

  handleBack() {
    backWithFallback('/pages/profile/index')
  },

  openRules() {
    wx.showToast({ title: '积分获取规则待接入', icon: 'none' })
  },

  redeem(e) {
    const { id } = e.currentTarget.dataset
    const target = this.data.rewardItems.find((item) => item.id === id)
    if (!target) return
    wx.showToast({
      title: target.name + '兑换流程待接入',
      icon: 'none'
    })
  }
})
