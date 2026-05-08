const { initMiniNav, backWithFallback } = require('../../utils/mini-nav')
const { get } = require('../../utils/request')
const paths = require('../../http/paths')

function normalizeText(value) {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '0.00'
  const num = Number(value)
  if (!Number.isFinite(num)) return '0.00'
  return num.toFixed(2)
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
  const source = normalizeText(rawStatus).toUpperCase()
  if (source === 'UNPAID') return { statusKey: 'pending', statusText: '待付款', statusClass: 'status-tag--pending' }
  if (source === 'PAID') return { statusKey: 'paid', statusText: '已付款', statusClass: 'status-tag--paid' }
  if (source === 'DELIVERED') return { statusKey: 'shipping', statusText: '运输中', statusClass: 'status-tag--shipping' }
  if (source === 'CANCELLED') return { statusKey: 'cancelled', statusText: '已取消', statusClass: 'status-tag--cancelled' }
  return { statusKey: 'pending', statusText: normalizeText(rawStatus) || '待付款', statusClass: 'status-tag--pending' }
}

function mapOrderItem(item, index) {
  const raw = item && typeof item === 'object' ? item : {}
  const id = raw.id != null ? raw.id : index
  const spuName = normalizeText(raw.spuName)
  const skuName = normalizeText(raw.skuName)
  const title = [spuName, skuName].filter(Boolean).join(' ') || '商品'
  return {
    id: String(id),
    title,
    skuSpec: normalizeText(raw.skuSpec),
    price: formatPrice(raw.salePrice),
    count: Math.max(1, Number(raw.buyQty) || 1),
    image: normalizeText(raw.coverImage || '')
  }
}

Page({
  data: {
    topInset: 72,
    statusBarHeight: 20,
    navBarHeight: 44,
    headerHeight: 64,
    menuWidth: 88,
    menuHeight: 32,
    menuTop: 26,
    menuRight: 12,
    loading: false,
    order: null
  },

  onLoad(options) {
    initMiniNav(this)
    const orderId = options.orderId || ''
    if (orderId) {
      this.loadOrderDetail(orderId)
    }
  },

  handleBack() {
    backWithFallback('/pages/my-orders/index')
  },

  loadOrderDetail(orderId) {
    this.setData({ loading: true })
    get(paths.order.indentDetail(orderId), null, { showLoading: true, loadingTitle: '加载中' })
      .then((res) => {
        const raw = (res && res.data !== undefined ? res.data : res) || {}
        if (!raw || !raw.orderId) {
          this.setData({ loading: false })
          return
        }

        const statusMeta = mapOrderStatus(raw.orderStatus || '')
        const items = Array.isArray(raw.itemList) ? raw.itemList.map(mapOrderItem) : []

        const order = {
          orderId: String(raw.orderId),
          orderNo: normalizeText(raw.orderNo) || String(raw.orderId),
          statusText: statusMeta.statusText,
          statusClass: statusMeta.statusClass,
          receiverName: normalizeText(raw.receiverName),
          receiverPhone: normalizeText(raw.receiverMobile),
          receiverAddress: normalizeText(raw.addressSummary),
          estimatedDelivery: '',
          items,
          goodsAmount: formatPrice(raw.goodsAmount),
          deliveryAmount: formatPrice(raw.deliveryAmount),
          couponAmount: formatPrice(raw.couponAmount),
          payAmount: formatPrice(raw.payAmount),
          createTime: formatDateTime(raw.createTime)
        }
        this.setData({ order, loading: false })
      })
      .catch((err) => {
        console.error('[order-detail] load failed', err)
        this.setData({ loading: false })
      })
  }
})
