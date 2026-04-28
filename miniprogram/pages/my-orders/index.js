const { initMiniNav, backWithFallback } = require('../../utils/mini-nav')
const { get, post } = require('../../utils/request')
const paths = require('../../http/paths')

const TAB_LIST = [
  { key: 'all', label: '全部订单' },
  { key: 'pending', label: '待发货' },
  { key: 'shipping', label: '配送中' },
  { key: 'completed', label: '已完成' }
]

function unwrapResponseData(res) {
  if (res && Object.prototype.hasOwnProperty.call(res, 'data') && res.data !== undefined && res.data !== null) {
    return res.data
  }
  return res
}

function normalizeArrayLike(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []

  const listKeys = ['records', 'list', 'items', 'rows', 'result', 'Items']
  for (let i = 0; i < listKeys.length; i += 1) {
    const key = listKeys[i]
    if (Array.isArray(data[key])) return data[key]
  }

  if (data.page && typeof data.page === 'object') {
    for (let i = 0; i < listKeys.length; i += 1) {
      const key = listKeys[i]
      if (Array.isArray(data.page[key])) return data.page[key]
    }
  }

  return []
}

function normalizeOrderItemList(raw) {
  if (!raw || typeof raw !== 'object') return []
  if (Array.isArray(raw.itemList)) return raw.itemList
  if (Array.isArray(raw.items)) return raw.items
  if (Array.isArray(raw.Items)) return raw.Items

  if (raw.itemList && typeof raw.itemList === 'object') {
    if (Array.isArray(raw.itemList.list)) return raw.itemList.list
    if (Array.isArray(raw.itemList.records)) return raw.itemList.records
    if (Array.isArray(raw.itemList.items)) return raw.itemList.items
    if (Array.isArray(raw.itemList.Items)) return raw.itemList.Items
  }

  return []
}

function normalizeText(value) {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

function toPositiveInt(value, fallback = 0) {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  if (num <= 0) return fallback
  return Math.floor(num)
}

function trimDecimalZero(text = '') {
  return String(text).replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '')
}

function toRequestItemId(value) {
  if (value == null || value === '') return ''
  return String(value).trim()
}

function toOptionalLong(value) {
  if (value == null || value === '') return null
  const text = String(value).trim()
  if (!text) return null
  if (!/^\d+$/.test(text)) return null
  return toRequestItemId(text)
}

function pickBizObject(data) {
  if (!data || typeof data !== 'object') return {}
  if (data.result && typeof data.result === 'object') return data.result
  if (data.data && typeof data.data === 'object') return data.data
  return data
}

function toWechatPayArgs(data) {
  const payload = pickBizObject(data)
  const timeStamp = payload.timeStamp != null ? String(payload.timeStamp) : ''
  const nonceStr = payload.nonceStr != null ? String(payload.nonceStr) : ''
  const packageValue = payload.packageValue != null
    ? String(payload.packageValue)
    : (payload.package != null ? String(payload.package) : '')
  const signType = payload.signType != null ? String(payload.signType) : 'RSA'
  const paySign = payload.paySign != null ? String(payload.paySign) : ''

  if (!timeStamp || !nonceStr || !packageValue || !paySign) return null

  return {
    timeStamp,
    nonceStr,
    package: packageValue,
    signType,
    paySign
  }
}

function requestWechatPayment(payArgs) {
  return new Promise((resolve, reject) => {
    wx.requestPayment({
      ...payArgs,
      success: () => resolve(),
      fail: (err) => {
        const error = err || new Error('微信支付失败')
        const message = String((err && err.errMsg) || '')
        if (message.toLowerCase().includes('cancel')) {
          error.__userCanceled = true
        }
        reject(error)
      }
    })
  })
}

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '0'
  const rawText = String(value).trim()
  if (/^-?\d+(\.\d+)?$/.test(rawText)) {
    return trimDecimalZero(rawText)
  }
  const num = Number(rawText)
  if (!Number.isFinite(num)) return '0'
  if (Number.isInteger(num)) return String(num)
  return trimDecimalZero(num.toFixed(2))
}

function formatDateTime(value) {
  const text = normalizeText(value)
  if (!text) return '--'

  const normalized = text.replace('T', ' ').replace(/\.\d+$/, '')
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/)
  if (match) {
    const year = match[1]
    const month = String(Number(match[2])).padStart(2, '0')
    const day = String(Number(match[3])).padStart(2, '0')
    const hour = String(Number(match[4] || 0)).padStart(2, '0')
    const minute = String(Number(match[5] || 0)).padStart(2, '0')
    const second = String(Number(match[6] || 0)).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`
  }

  return normalized
}

function mapOrderStatus(rawStatus) {
  const source = normalizeText(rawStatus)
  const upper = source.toUpperCase()

  if (upper === 'UNPAID' || source.indexOf('待付款') >= 0) {
    return { statusKey: 'pending', statusText: '待付款', statusClass: 'order-status--pending' }
  }
  if (upper === 'PAID' || source.indexOf('已付款') >= 0) {
    return { statusKey: 'pending', statusText: '已付款', statusClass: 'order-status--pending' }
  }
  if (upper === 'DELIVERED' || source.indexOf('已发货') >= 0) {
    return { statusKey: 'shipping', statusText: '已发货', statusClass: 'order-status--shipping' }
  }
  if (upper === 'CANCELLED' || source.indexOf('已取消') >= 0 || source.indexOf('关闭') >= 0) {
    return { statusKey: 'completed', statusText: '已取消', statusClass: 'order-status--completed' }
  }

  return { statusKey: 'pending', statusText: source || '待付款', statusClass: 'order-status--pending' }
}

function mapOrderItem(item, index) {
  const raw = item && typeof item === 'object' ? item : {}
  const idRaw = raw.id != null && raw.id !== '' ? raw.id : (raw.skuId != null ? raw.skuId : index)
  const spuName = normalizeText(raw.spuName)
  const skuName = normalizeText(raw.skuName)
  const title = normalizeText(`${spuName}${spuName && skuName ? ' ' : ''}${skuName}`) || '商品'
  const buyQty = toPositiveInt(raw.buyQty != null ? raw.buyQty : raw.count, 1)

  return {
    id: String(idRaw),
    title,
    skuSpec: normalizeText(raw.skuSpec),
    salePrice: formatPrice(raw.salePrice),
    count: buyQty,
    buyQty,
    image: normalizeText(raw.image || raw.skuImage || raw.spuImage || raw.coverImage || raw.picUrl || '/assets/mall/product-apple.png')
  }
}

function calcFallbackPayAmount(raw) {
  const goods = Number(raw.goodsAmount || 0)
  const delivery = Number(raw.deliveryAmount || 0)
  const coupon = Number(raw.couponAmount || 0)
  const total = goods + delivery - coupon
  if (!Number.isFinite(total)) return 0
  return total
}

function mapOrder(order, index) {
  const raw = order && typeof order === 'object' ? order : {}
  const orderId = raw.orderId != null && raw.orderId !== '' ? raw.orderId : (raw.id != null ? raw.id : index)
  const orderNo = normalizeText(raw.orderNo) || String(orderId)
  const statusMeta = mapOrderStatus(raw.orderStatus || raw.status || raw.statusText)

  const itemList = normalizeOrderItemList(raw).map(mapOrderItem)
  const totalCount = itemList.reduce((sum, row) => sum + toPositiveInt(row.buyQty, 0), 0)

  const payAmountRaw =
    raw.payAmount !== undefined && raw.payAmount !== null && raw.payAmount !== ''
      ? raw.payAmount
      : calcFallbackPayAmount(raw)

  return {
    orderId: String(orderId),
    id: orderNo,
    orderNo,
    userId: normalizeText(raw.userId),
    status: statusMeta.statusKey,
    statusText: statusMeta.statusText,
    statusClass: statusMeta.statusClass,
    items: itemList,
    totalCount,
    totalPrice: formatPrice(payAmountRaw),
    payAmount: formatPrice(payAmountRaw),
    payTime: formatDateTime(raw.payTime || raw.paySuccessTime || raw.paymentTime || raw.createTime || raw.orderTime),
    createTime: formatDateTime(raw.payTime || raw.paySuccessTime || raw.paymentTime || raw.createTime || raw.orderTime)
  }
}

function filterByTab(orderList = [], tab = 'all') {
  if (tab === 'all') return orderList
  return orderList.filter((item) => item.status === tab)
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
    loading: false,
    loadError: false,
    orders: [],
    filteredOrders: []
  },

  onLoad() {
    initMiniNav(this)
    this.loadOrders()
  },

  handleBack() {
    backWithFallback('/pages/profile/index')
  },

  applyTabFilter(tab, sourceOrders) {
    const nextOrders = Array.isArray(sourceOrders) ? sourceOrders : this.data.orders
    const filteredOrders = filterByTab(nextOrders, tab)
    this.setData({
      activeTab: tab,
      filteredOrders
    })
  },

  selectTab(e) {
    const { tab } = e.currentTarget.dataset
    this.applyTabFilter(tab)
  },

  loadOrders() {
    if (this._loadOrdersPromise) return this._loadOrdersPromise

    this.setData({
      loading: true,
      loadError: false
    })

    this._loadOrdersPromise = get(paths.order.indentList)
      .then((res) => {
        const payload = unwrapResponseData(res)
        const list = normalizeArrayLike(payload)
        const mapped = list.map(mapOrder)
        this.setData({
          orders: mapped
        })
        this.applyTabFilter(this.data.activeTab, mapped)
      })
      .catch((err) => {
        console.error('[my-orders] loadOrders failed', err)
        this.setData({
          loadError: true,
          orders: [],
          filteredOrders: []
        })
      })
      .finally(() => {
        this._loadOrdersPromise = null
        this.setData({
          loading: false
        })
      })

    return this._loadOrdersPromise
  },

  handleRetry() {
    this.loadOrders()
  },

  viewLogistics(e) {
    const { id } = e.currentTarget.dataset
    wx.showToast({ title: '订单 ' + id + ' 物流待接入', icon: 'none' })
  },

  viewDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.showToast({ title: '订单 ' + id + ' 详情待接入', icon: 'none' })
  },

  payOrder(e) {
    if (this._payingOrder) return

    const { id, orderId } = e.currentTarget.dataset
    const payOrderId = toOptionalLong(orderId)
    if (payOrderId == null) {
      wx.showToast({ title: '订单号异常，无法支付', icon: 'none' })
      return
    }

    this._payingOrder = true
    let loadingShown = true
    wx.showLoading({ title: '拉起支付中', mask: true })

    post(paths.order.indentPayWechatCreate, {
      orderId: payOrderId
    })
      .then((res) => {
        const payArgs = toWechatPayArgs(unwrapResponseData(res))
        if (!payArgs) {
          throw new Error('微信支付参数不完整')
        }
        if (loadingShown) {
          wx.hideLoading()
          loadingShown = false
        }
        return requestWechatPayment(payArgs)
      })
      .then(() => {
        wx.showToast({ title: '支付成功', icon: 'success' })
      })
      .catch((err) => {
        if (loadingShown) {
          wx.hideLoading()
          loadingShown = false
        }

        if (err && err.__userCanceled) {
          wx.showToast({ title: '已取消支付', icon: 'none' })
          return
        }

        console.warn('[my-orders] 支付失败:', err, id ? `orderNo=${id}` : '')
        const isHttpOrBizError = !!(err && (err.statusCode || err.code != null))
        if (!isHttpOrBizError) {
          wx.showToast({ title: '支付失败，请稍后重试', icon: 'none' })
        }
      })
      .finally(() => {
        this._payingOrder = false
        this.loadOrders().catch(() => {})
      })
  }
})
