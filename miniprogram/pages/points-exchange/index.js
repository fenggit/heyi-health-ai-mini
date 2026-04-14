const { initMiniNav, backWithFallback } = require('../../utils/mini-nav')
const { get } = require('../../utils/request')
const paths = require('../../http/paths')

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

    // 接口数据
    nickName: '',
    avatarUrl: '',
    memberLevel: '普通会员',
    availablePoints: 0,
    monthEarnedPoints: 0,
    totalEarnedPoints: 0,
    totalUsedPoints: 0,
    totalExpiredPoints: 0,
    todaySigned: false,
    signInRewardPoints: 0,
    recentRecords: [],

    rewardItems: []
  },

  onLoad() {
    initMiniNav(this)
  },

  onShow() {
    this._loadPointsCenter()
  },

  _loadPointsCenter() {
    wx.showLoading({ title: '加载中', mask: true })
    get(paths.member.pointsCenter)
      .then((res) => {
        const d = (res && res.data) || {}
        this.setData({
          nickName: d.nickName || '',
          avatarUrl: d.avatarUrl || '',
          memberLevel: d.currentLevelName || '普通会员',
          availablePoints: d.availablePoints || 0,
          monthEarnedPoints: d.monthEarnedPoints || 0,
          totalEarnedPoints: d.totalEarnedPoints || 0,
          totalUsedPoints: d.totalUsedPoints || 0,
          totalExpiredPoints: d.totalExpiredPoints || 0,
          todaySigned: !!d.todaySignedIn,
          signInRewardPoints: d.signInRewardPoints || 0,
          recentRecords: Array.isArray(d.recentRecords) ? d.recentRecords : []
        })
      })
      .catch(() => {})
      .finally(() => {
        wx.hideLoading()
      })
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
