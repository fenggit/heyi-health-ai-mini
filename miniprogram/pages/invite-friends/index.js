const { initMiniNav, backWithFallback } = require('../../utils/mini-nav')

const CHANNELS = [
  {
    id: 'wechat',
    name: '微信',
    icon: '/assets/icons/share_wechat_icon.png',
    tileBg: 'rgba(0, 201, 80, 0.05)'
  },
  {
    id: 'moments',
    name: '朋友圈',
    icon: '/assets/icons/share_wechatMoments_icon.png',
    tileBg: 'rgba(43, 127, 255, 0.05)'
  },
  {
    id: 'poster',
    name: '海报',
    icon: '/assets/icons/share_poster_icon.png',
    tileBg: 'rgba(173, 70, 255, 0.05)'
  }
]

const SUMMARY_CARDS = [
  {
    id: 'inviteCount',
    label: '推荐好友',
    valueKey: 'inviteCount',
    badgeBg: 'rgba(225, 113, 0, 0.1)',
    badgeIcon: '/assets/icons/share_invitation_icon.png',
    valueClassName: ''
  },
  {
    id: 'totalPoints',
    label: '获得积分',
    valueKey: 'totalPoints',
    badgeBg: 'rgba(173, 70, 255, 0.1)',
    badgeIcon: '/assets/profile/points.png',
    valueClassName: 'invite-summary-item__value--purple'
  }
]

const REWARD_STEPS = [
  { title: '好友注册成功', reward: '您获得 100 积分' },
  { title: '体质类型', reward: '您获得 50 积分' },
  { title: '用餐时间', reward: '新人优惠券' }
]

const RECORDS = [
  { id: 'u1', user: '123*****326', time: '2026-03-19 15:32:31', status: '已注册' },
  { id: 'u2', user: '123*****326', time: '2026-03-19 15:32:31', status: '已购买' },
  { id: 'u3', user: '123*****326', time: '2026-03-19 15:32:31', status: '已购买' }
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

    navTitle: '邀请好友',
    title: '邀请好友',
    subTitle: '分享给好友，双方都得积分奖励',
    inviteCount: 3,
    totalPoints: 200,
    inviteCode: 'HEYIZYO1',
    posterUserId: '20260327',
    posterBrand: '合一食养',
    posterSubTitle: '扫码进入小程序，获取好礼',
    posterQrImage: '',
    showPosterModal: false,
    copyIcon: '/assets/icons/share_copy.png',
    channels: CHANNELS,
    summaryCards: SUMMARY_CARDS,
    rewardSteps: REWARD_STEPS,
    records: RECORDS
  },

  onLoad() {
    initMiniNav(this)
  },

  handleBack() {
    backWithFallback('/pages/profile/index')
  },

  noop() {},

  copyCode() {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => wx.showToast({ title: '推荐码已复制', icon: 'none' })
    })
  },

  openPosterModal() {
    this.setData({ showPosterModal: true })
  },

  closePosterModal() {
    this.setData({ showPosterModal: false })
  },

  savePoster() {
    wx.showToast({
      title: '保存海报待接入',
      icon: 'none'
    })
  },

  shareByChannel(e) {
    const { name } = e.currentTarget.dataset
    if (name === '海报') {
      this.openPosterModal()
      return
    }
    wx.showToast({
      title: name + '分享待接入',
      icon: 'none'
    })
  }
})
