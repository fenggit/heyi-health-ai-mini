const { initMiniNav, backWithFallback } = require('../../utils/mini-nav')

const FAQ_GROUPS = [
  { key: 'all', label: '全部' },
  { key: 'account', label: '账户相关' },
  { key: 'analysis', label: '体质测评' },
  { key: 'order', label: '购物相关' },
  { key: 'member', label: '会员相关' }
]

const FAQ_LIST = [
  {
    id: 'q1',
    group: 'account',
    question: '如何注册账户？',
    answer: '扫码进入小程序后，完成体质测评即可自动注册账户。'
  },
  {
    id: 'q2',
    group: 'account',
    question: '忘记密码怎么办？',
    answer: '点击登录页面的“忘记密码”，通过手机号验证码重置密码。'
  },
  {
    id: 'q3',
    group: 'analysis',
    question: '体质测评结果多久更新一次？',
    answer: '每次重新测评后会即时更新，历史报告会在“我的体质报告”里保留。'
  },
  {
    id: 'q4',
    group: 'order',
    question: '下单后多久发货？',
    answer: '通常会在24小时内安排发货，节假日顺延。'
  }
]

const CONTACT_ACTIONS = [
  { id: 'service', name: '在线客服', desc: '' },
  { id: 'phone', name: '电话咨询', desc: '' },
  { id: 'email', name: '邮件反馈', desc: '' }
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

    navTitle: '帮助中心',
    keywordPlaceholder: '关键词搜索',
    groups: FAQ_GROUPS,
    activeGroup: 'all',
    questions: FAQ_LIST,
    filteredQuestions: FAQ_LIST,
    contactActions: CONTACT_ACTIONS
  },

  onLoad() {
    initMiniNav(this)
  },

  handleBack() {
    backWithFallback('/pages/profile/index')
  },

  switchGroup(e) {
    const { group } = e.currentTarget.dataset
    const list = group === 'all' ? this.data.questions : this.data.questions.filter((item) => item.group === group)
    this.setData({
      activeGroup: group,
      filteredQuestions: list
    })
  },

  openContact(e) {
    const { id, name } = e.currentTarget.dataset
    if (id === 'phone') {
      wx.makePhoneCall({
        phoneNumber: '4008082026',
        fail: () => {
          wx.showToast({ title: '当前设备无法拨号', icon: 'none' })
        }
      })
      return
    }
    if (id === 'email') {
      wx.setClipboardData({
        data: 'service@heyi.com',
        success: () => wx.showToast({ title: '邮箱已复制', icon: 'none' })
      })
      return
    }
    wx.showToast({
      title: name + '已接入待联调',
      icon: 'none'
    })
  }
})
