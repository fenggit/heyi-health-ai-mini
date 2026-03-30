const { initMiniNav, backWithFallback } = require('../../utils/mini-nav')

const PLAN_LIST = [
  { id: 'normal', title: '当前：普通会员', price: 0, unit: '', active: true, dark: false },
  { id: 'gold', title: '推荐：黄金会员', price: 99, unit: '/月', active: false, dark: true },
  { id: 'diamond', title: '钻石会员', price: 699, unit: '/年', active: false, dark: false }
]

const BENEFITS = ['基础体质测评', '查看食养配方', '购物积分累积', '客服咨询']

const WELFARES = [
  { icon: '/assets/profile-pages/vip/gift_icon.png', label: '生日礼包' },
  { icon: '/assets/profile-pages/vip/activity_icon.png', label: '节日优惠' },
  { icon: '/assets/profile-pages/vip/new_icon.png', label: '新品试用' },
  { icon: '/assets/profile-pages/vip/vip_icon.png', label: '专属活动' }
]

const FAQS = [
  {
    id: 'f1',
    q: 'Q：会员可以退款吗?',
    a: 'A：开通后7天内未使用任何会员权益可申请全额退。'
  },
  {
    id: 'f2',
    q: 'Q：积分如何使用?',
    a: 'A：积分可在商城购物时抵扣现金，100积分=1元。'
  },
  {
    id: 'f3',
    q: 'Q：会员到期后怎么办?',
    a: 'A：到期后自动转为普通会员，可随时续费恢复权益。'
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

    navTitle: '个人中心',
    pageTitle: '会员升级',
    plans: PLAN_LIST,
    selectedPlanId: 'gold',
    benefits: BENEFITS,
    welfares: WELFARES,
    faqs: FAQS
  },

  onLoad() {
    initMiniNav(this)
  },

  handleBack() {
    backWithFallback('/pages/profile/index')
  },

  selectPlan(e) {
    const { id } = e.currentTarget.dataset
    this.setData({ selectedPlanId: id })
  },

  openNow() {
    const current = this.data.plans.find((item) => item.id === this.data.selectedPlanId)
    if (!current) return
    wx.showToast({
      title: '已选择' + current.title + '，支付流程待接入',
      icon: 'none'
    })
  },

  cancel() {
    this.handleBack()
  }
})
