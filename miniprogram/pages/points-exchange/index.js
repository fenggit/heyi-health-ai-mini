const { initMiniNav, backWithFallback } = require('../../utils/mini-nav')
const { get, post } = require('../../utils/request')
const paths = require('../../http/paths')

function formatMoneyAmount(value) {
  if (value === null || value === undefined || value === '') return '--'
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  if (Number.isInteger(num)) return String(num)
  return num.toFixed(2).replace(/\.?0+$/, '')
}

function normalizeGoodsList(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.Items)) return data.Items
  if (Array.isArray(data.records)) return data.records
  if (Array.isArray(data.list)) return data.list
  return []
}

function normalizeRulesList(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.Items)) return data.Items
  if (Array.isArray(data.records)) return data.records
  if (Array.isArray(data.list)) return data.list
  return []
}

function formatPointsValue(value) {
  const num = Number(value)
  if (Number.isFinite(num)) return num >= 0 ? `+${num}` : `${num}`
  const text = value === null || value === undefined || value === '' ? '0' : String(value)
  return text.startsWith('+') || text.startsWith('-') ? text : `+${text}`
}

function mapRuleItem(item, index) {
  const d = item && typeof item === 'object' ? item : {}
  return {
    id:
      d.id !== null && d.id !== undefined
        ? String(d.id)
        : d.taskType
        ? `rule-${d.taskType}`
        : `rule-${index}`,
    title: d.ruleName || d.taskTypeName || d.taskType || `积分规则${index + 1}`,
    pointsText: `${formatPointsValue(d.pointsValue)} 积分`
  }
}

function mapRewardItem(item, index) {
  const d = item && typeof item === 'object' ? item : {}
  const hasStockLimit = d.remainStock !== null && d.remainStock !== undefined
  const stockValue = hasStockLimit ? Number(d.remainStock) : null
  const outOfStock = hasStockLimit && (!Number.isFinite(stockValue) || stockValue <= 0)

  const hasUserLimit = d.limitPerUser !== null && d.limitPerUser !== undefined
  const limitValue = hasUserLimit ? Number(d.limitPerUser) : null
  const exchangedValue = Number(d.userExchangedCount) || 0
  const reachedUserLimit =
    hasUserLimit && Number.isFinite(limitValue) && exchangedValue >= limitValue

  let stockText = '不限量'
  if (outOfStock) {
    stockText = '已兑完'
  } else if (hasStockLimit && Number.isFinite(stockValue)) {
    stockText = String(stockValue)
  }

  const requiredPoints = Number(d.requiredPoints) || 0
  const canRedeem = !outOfStock && !reachedUserLimit

  return {
    id: d.id !== null && d.id !== undefined ? String(d.id) : `goods-${index}`,
    goodsId: d.id !== null && d.id !== undefined ? d.id : null,
    name: d.goodsName || '未命名礼品',
    leftTitle: formatMoneyAmount(d.couponAmount),
    leftSub: `${requiredPoints}积分`,
    stock: stockText,
    canRedeem,
    buttonText: canRedeem ? '立即兑换' : '不可兑换'
  }
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

    rewardItems: [],
    redeemingId: '',

    showRulesPopup: false,
    rulesLoading: false,
    rulesItems: [],
    rulesError: ''
  },

  onLoad() {
    initMiniNav(this)
  },

  onShow() {
    this._loadPointsCenter()
    this._loadAvailableGoods()
  },

  _loadPointsCenter() {
    wx.showLoading({ title: '加载中', mask: true })
    get(paths.member.pointsCenter)
      .then((res) => {
        const d = (res && res.data) || {}
        const availablePoints =
          d.availablePoints != null && d.availablePoints !== ''
            ? Number(d.availablePoints) || 0
            : 0
        this.setData({
          nickName: d.nickName || '',
          avatarUrl: d.avatarUrl || '',
          memberLevel: d.currentLevelName || '普通会员',
          availablePoints,
          monthEarnedPoints: d.monthEarnedPoints || 0,
          totalEarnedPoints: d.totalEarnedPoints || 0,
          totalUsedPoints: d.totalUsedPoints || 0,
          totalExpiredPoints: d.totalExpiredPoints || 0,
          todaySigned: !!d.todaySignedIn,
          signInRewardPoints: d.signInRewardPoints || 0
        })
      })
      .catch(() => {})
      .finally(() => {
        wx.hideLoading()
      })
  },

  _loadAvailableGoods() {
    get(paths.marketing.pointsGoodsAvailable)
      .then((res) => {
        const rawList = normalizeGoodsList((res && res.data) || [])
        const sortedList = rawList.slice().sort((a, b) => {
          const aSort = Number(a && a.sortNo)
          const bSort = Number(b && b.sortNo)
          const aNaN = Number.isNaN(aSort)
          const bNaN = Number.isNaN(bSort)
          if (aNaN && bNaN) return 0
          if (aNaN) return 1
          if (bNaN) return -1
          return aSort - bSort
        })
        this.setData({
          rewardItems: sortedList.map(mapRewardItem)
        })
      })
      .catch(() => {
        this.setData({
          rewardItems: []
        })
      })
  },

  handleBack() {
    backWithFallback('/pages/profile/index')
  },

  openRules() {
    this.setData({
      showRulesPopup: true
    })
    this._loadPointsRules()
  },

  closeRulesPopup() {
    this.setData({
      showRulesPopup: false
    })
  },

  stopRulesPopupTap() {},

  _loadPointsRules() {
    if (this.data.rulesLoading) return
    this.setData({
      rulesLoading: true,
      rulesError: ''
    })

    get(paths.member.pointsRules)
      .then((res) => {
        const rawList = normalizeRulesList((res && res.data) || [])
        const sortedList = rawList.slice().sort((a, b) => {
          const aSort = Number(a && a.sortNo)
          const bSort = Number(b && b.sortNo)
          const aNaN = Number.isNaN(aSort)
          const bNaN = Number.isNaN(bSort)
          if (aNaN && bNaN) return 0
          if (aNaN) return 1
          if (bNaN) return -1
          return aSort - bSort
        })
        this.setData({
          rulesItems: sortedList.map(mapRuleItem),
          rulesError: ''
        })
      })
      .catch(() => {
        this.setData({
          rulesItems: [],
          rulesError: 'load_failed'
        })
      })
      .finally(() => {
        this.setData({
          rulesLoading: false
        })
      })
  },

  redeem(e) {
    const { id } = e.currentTarget.dataset
    if (this.data.redeemingId) return
    const target = this.data.rewardItems.find((item) => String(item.id) === String(id))
    if (!target) return
    if (!target.canRedeem) {
      wx.showToast({
        title: target.name + '当前不可兑换',
        icon: 'none'
      })
      return
    }
    if (target.goodsId === null || target.goodsId === undefined || target.goodsId === '') {
      wx.showToast({
        title: '商品ID无效，无法兑换',
        icon: 'none'
      })
      return
    }

    this.setData({ redeemingId: String(target.id) })
    wx.showLoading({ title: '兑换中', mask: true })

    post(paths.member.exchangeCoupon, {
      goodsId: target.goodsId
    })
      .then(() => {
        wx.showToast({
          title: '兑换成功',
          icon: 'success'
        })
        this._loadAvailableGoods()
        this._loadPointsCenter()
      })
      .catch(() => {})
      .finally(() => {
        this.setData({ redeemingId: '' })
        wx.hideLoading()
      })
  }
})
