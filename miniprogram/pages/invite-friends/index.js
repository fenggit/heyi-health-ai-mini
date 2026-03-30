const { initMiniNav, backWithFallback } = require('../../utils/mini-nav')

const CHANNELS = [
  { id: 'wechat', name: '微信', icon: '/assets/profile-pages/invite/invitation_icon.png' },
  { id: 'moments', name: '朋友圈', icon: '/assets/profile-pages/invite/wechat_moments_icon.png' },
  { id: 'poster', name: '海报', icon: '/assets/profile-pages/invite/poster_icon.png' }
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

    navTitle: '积分兑换',
    title: '邀请好友',
    subTitle: '分享给好友，双方都得积分奖励',
    inviteCount: 3,
    totalPoints: 200,
    inviteCode: 'HEYIZYO1',
    channels: CHANNELS,
    rewardSteps: REWARD_STEPS,
    records: RECORDS
  },

  onLoad() {
    initMiniNav(this)
  },

  handleBack() {
    backWithFallback('/pages/profile/index')
  },

  copyCode() {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => wx.showToast({ title: '推荐码已复制', icon: 'none' })
    })
  },

  shareByChannel(e) {
    const { name } = e.currentTarget.dataset
    wx.showToast({
      title: name + '分享待接入',
      icon: 'none'
    })
  }
})
