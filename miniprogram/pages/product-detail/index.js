const { getLayoutMetrics } = require("../../utils/layout")
const { get, post, put } = require("../../utils/request")
const paths = require("../../http/paths")
const { toggleFavorite: requestToggleFavorite } = require("../../utils/favorite")

const STATIC_DETAIL_DATA = {
  cartCount: 0
}

const DEFAULT_PACK_DATA = {
  id: "",
  spuId: "",
  skuId: "",
  name: "商品详情",
  sellingPoints: "",
  description: "",
  shippingRemark: "",
  tags: [],
  price: "0",
  marketPrice: "",
  priceUnit: "",
  image: "",
  detailContentData: {
    version: 1,
    blocks: []
  },
  detailBlocks: []
}

function cloneDeep(value) {
  return JSON.parse(JSON.stringify(value))
}

function unwrapResponseData(res) {
  if (res && Object.prototype.hasOwnProperty.call(res, "data") && res.data !== undefined && res.data !== null) {
    return res.data
  }
  return res || {}
}

function toDisplayText(value, fallback = "") {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  return text || fallback
}

function toNumberOr(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function trimDecimalZero(text = "") {
  return String(text).replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "")
}

function formatNumberText(value, fallback = "0") {
  if (value === null || value === undefined || value === "") return fallback
  const raw = String(value).trim()
  if (!raw) return fallback
  if (/^-?\d+(\.\d+)?$/.test(raw)) return trimDecimalZero(raw)
  const num = Number(raw)
  if (!Number.isFinite(num)) return fallback
  if (Number.isInteger(num)) return String(num)
  return trimDecimalZero(num.toFixed(2))
}

function parseJsonSafely(value) {
  if (typeof value !== "string") return null
  const text = value.trim()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch (e) {
    return null
  }
}

function normalizeList(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== "object") return []

  const listKeys = ["list", "items", "Items", "records", "rows", "result"]
  for (const key of listKeys) {
    if (Array.isArray(data[key])) return data[key]
  }
  return []
}

function toObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value
  const parsed = parseJsonSafely(value)
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed
  return {}
}

function toArray(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === "object") return normalizeList(value)

  const parsed = parseJsonSafely(value)
  if (Array.isArray(parsed)) return parsed
  if (parsed && typeof parsed === "object") return normalizeList(parsed)

  const text = toDisplayText(value, "")
  if (!text) return []
  if (!text.includes(",") && !text.includes("，")) return [text]
  return text
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseTagList(rawTags) {
  if (Array.isArray(rawTags)) {
    return rawTags
      .map((item) => {
        if (typeof item === "string") return item
        if (!item || typeof item !== "object") return ""
        return item.name || item.label || item.tagName || ""
      })
      .map((item) => String(item || "").trim())
      .filter(Boolean)
  }

  const text = String(rawTags || "").trim()
  if (!text) return []

  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parseTagList(parsed)
  } catch (e) {
    // ignore parse error, fallback split by separator below
  }

  return text
    .split(/[，,、|]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeGalleryImages(rawImages) {
  const list = toArray(rawImages)
  return list
    .map((item, index) => {
      if (typeof item === "string") {
        const url = toDisplayText(item, "")
        if (!url) return null
        return {
          id: `img-${index + 1}`,
          url,
          alt: ""
        }
      }

      const row = item && typeof item === "object" ? item : {}
      const url = toDisplayText(row.url || row.imageUrl || row.src || row.coverImage, "")
      if (!url) return null

      return {
        id: row.id != null && row.id !== "" ? String(row.id) : `img-${index + 1}`,
        url,
        alt: toDisplayText(row.alt || row.title || row.name || "", "")
      }
    })
    .filter(Boolean)
}

function normalizeDetailBlockType(rawType, hasImages) {
  const type = toDisplayText(rawType, "").toLowerCase()
  if (type === "gallery") return "gallery"
  if (type === "text") return "text"
  return hasImages ? "gallery" : "text"
}

function normalizeDetailContentData(rawDetailContentData) {
  const data = toObject(rawDetailContentData)
  const rawBlocks = toArray(data.blocks || data.blockList || data.contentBlocks)

  const blocks = rawBlocks
    .map((item, index) => {
      const row = item && typeof item === "object" ? item : {}
      const text = toDisplayText(row.text || row.content || row.desc || "", "")
      const images = normalizeGalleryImages(row.images || row.imageList || row.items || row.Items)
      const type = normalizeDetailBlockType(row.type, images.length > 0)

      if (type === "gallery") {
        if (!images.length) return null
        return {
          id: row.id != null && row.id !== "" ? String(row.id) : `block-${index + 1}`,
          type,
          text: "",
          images
        }
      }

      if (!text) return null
      return {
        id: row.id != null && row.id !== "" ? String(row.id) : `block-${index + 1}`,
        type: "text",
        text,
        images: []
      }
    })
    .filter(Boolean)

  return {
    version: toNumberOr(data.version, 1),
    blocks
  }
}

function resolveCartTotalQty(payload) {
  if (payload == null) return 0
  if (typeof payload === "number") return Math.max(0, toNumberOr(payload, 0))
  if (typeof payload !== "object") return 0

  const directQty = payload.totalQty
  if (directQty !== undefined && directQty !== null && directQty !== "") {
    return Math.max(0, toNumberOr(directQty, 0))
  }

  const nested =
    (payload.cart && payload.cart.totalQty) ||
    (payload.summary && payload.summary.totalQty) ||
    (payload.result && payload.result.totalQty)
  return Math.max(0, toNumberOr(nested, 0))
}

function normalizeCartPayload(payload) {
  if (payload && typeof payload === "object") {
    if (payload.result && typeof payload.result === "object") return payload.result
    if (payload.cart && typeof payload.cart === "object") return payload.cart
    return payload
  }
  return {}
}

function normalizeCartItemList(payload) {
  if (!payload || typeof payload !== "object") return []
  if (Array.isArray(payload.itemList)) return payload.itemList
  if (payload.itemList && typeof payload.itemList === "object") {
    if (Array.isArray(payload.itemList.items)) return payload.itemList.items
    if (Array.isArray(payload.itemList.list)) return payload.itemList.list
    if (Array.isArray(payload.itemList.records)) return payload.itemList.records
  }
  if (Array.isArray(payload.items)) return payload.items
  if (Array.isArray(payload.list)) return payload.list
  if (Array.isArray(payload.records)) return payload.records
  return []
}

function toRequestItemId(value) {
  const numeric = Number(value)
  if (Number.isSafeInteger(numeric) && String(numeric) === String(value)) {
    return numeric
  }
  return String(value)
}

function resolveSpuDetailPath(spuId) {
  if (paths && paths.mall && typeof paths.mall.spuDetail === "function") {
    return paths.mall.spuDetail(spuId)
  }
  return `/mall/app/spu/${encodeURIComponent(spuId)}`
}

function resolveSkuId(source = {}) {
  const directCandidates = [
    source.skuId,
    source.defaultSkuId,
    source.mainSkuId,
    source.currentSkuId,
    source.defaultSku && source.defaultSku.skuId
  ]

  for (const candidate of directCandidates) {
    if (candidate !== null && candidate !== undefined && candidate !== "") {
      return String(candidate)
    }
  }

  const skuGroups = [source.skuList, source.skus, source.spuSkuList, source.skuItems]
  for (const group of skuGroups) {
    const list = toArray(group)
    for (const sku of list) {
      const row = sku && typeof sku === "object" ? sku : {}
      if (row.skuId !== null && row.skuId !== undefined && row.skuId !== "") {
        return String(row.skuId)
      }
      if (row.id !== null && row.id !== undefined && row.id !== "") {
        return String(row.id)
      }
    }
  }

  return ""
}

function resolveCoverImage(source = {}) {
  const coverImage = toDisplayText(source.coverImage, "")
  if (coverImage) return coverImage

  const albumImages = normalizeGalleryImages(source.albumImages)
  if (albumImages.length > 0) {
    return albumImages[0].url
  }

  return ""
}

function mapSpuDetail(detail = {}, spuId = "") {
  const source = detail && typeof detail === "object" ? detail : {}
  const defaultSku = source.defaultSku && typeof source.defaultSku === "object" ? source.defaultSku : {}
  const spuIdRaw = source.spuId != null && source.spuId !== "" ? source.spuId : spuId
  const finalSpuId = toDisplayText(spuIdRaw, "")
  const unitName = toDisplayText(defaultSku.unitName || source.unitName, "")
  const salePrice = defaultSku.salePrice != null ? defaultSku.salePrice : source.salePrice
  const sellingPoints = toDisplayText(source.sellingPoints, toDisplayText(source.description || source.detailContent, ""))
  const detailContentData = normalizeDetailContentData(source.detailContentData)

  return {
    id: finalSpuId,
    spuId: finalSpuId,
    skuId: resolveSkuId(source),
    name: toDisplayText(source.spuName || source.name, DEFAULT_PACK_DATA.name),
    sellingPoints,
    description: sellingPoints,
    shippingRemark: toDisplayText(source.shippingRemark, ""),
    tags: parseTagList(source.tags || source.tagList || source.customTags || source.tagJson),
    price: formatNumberText(salePrice, DEFAULT_PACK_DATA.price),
    marketPrice: formatNumberText(source.marketPrice, ""),
    priceUnit: unitName ? `/${unitName}` : "",
    image: resolveCoverImage(source),
    detailContentData,
    detailBlocks: detailContentData.blocks
  }
}

Page({
  data: {
    // layout
    topInset: 72,
    statusBarHeight: 20,
    navBarHeight: 44,
    menuWidth: 88,
    menuHeight: 32,
    menuTop: 26,
    menuRight: 12,
    safeAreaBottom: 0,
    // page
    spuId: "",
    packInfo: cloneDeep(DEFAULT_PACK_DATA),
    qty: 1,
    qtySelected: false,
    isFavorited: false,
    cartCount: STATIC_DETAIL_DATA.cartCount
  },

  onLoad(options = {}) {
    this._isPageAlive = true
    this._detailReqId = 0
    this._cartReqId = 0
    this.syncLayout()

    const spuId = toDisplayText(options.spuId || options.supId || options.id || options.recipeId, "")
    this.safeSetData({ spuId })
    this.loadPackInfo(spuId)
    this.syncCartCount()
  },

  onShow() {
    this.syncCartCount()
  },

  onUnload() {
    this._isPageAlive = false
  },

  safeSetData(nextData) {
    if (!this._isPageAlive) return
    this.setData(nextData)
  },

  loadPackInfo(spuId) {
    const reqId = (this._detailReqId || 0) + 1
    this._detailReqId = reqId
    if (!spuId) {
      this.safeSetData({ packInfo: cloneDeep(DEFAULT_PACK_DATA) })
      return
    }

    wx.showLoading({ title: "加载中", mask: true })
    get(resolveSpuDetailPath(spuId))
      .then((res) => {
        if (!this._isPageAlive || this._detailReqId !== reqId) return
        const payload = unwrapResponseData(res)
        const packInfo = mapSpuDetail(payload, spuId)
        this.safeSetData({ packInfo })
      })
      .catch((err) => {
        if (!this._isPageAlive || this._detailReqId !== reqId) return
        console.warn("[product-detail] 拉取商品详情失败，使用默认数据:", err)
        const fallback = cloneDeep(DEFAULT_PACK_DATA)
        fallback.id = String(spuId)
        fallback.spuId = String(spuId)
        this.safeSetData({ packInfo: fallback })
      })
      .finally(() => {
        if (!this._isPageAlive || this._detailReqId !== reqId) return
        wx.hideLoading()
      })
  },

  syncCartCount() {
    if (this._cartCountPromise) return this._cartCountPromise
    const reqId = (this._cartReqId || 0) + 1
    this._cartReqId = reqId

    this._cartCountPromise = get(paths.mall.cart)
      .then((res) => {
        if (!this._isPageAlive || this._cartReqId !== reqId) return
        const payload = unwrapResponseData(res)
        const totalQty = resolveCartTotalQty(payload)
        this.safeSetData({
          cartCount: totalQty
        })
      })
      .catch((err) => {
        console.warn("[product-detail] 获取购物车数量失败:", err)
      })
      .finally(() => {
        this._cartCountPromise = null
      })

    return this._cartCountPromise
  },

  syncLayout() {
    const { statusBarHeight, navBarHeight, headerHeight } = getLayoutMetrics()
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const windowWidth = (windowInfo && (windowInfo.windowWidth || windowInfo.screenWidth)) || 375

    let menuWidth = 88
    let menuHeight = 32
    let menuTop = statusBarHeight + (navBarHeight - menuHeight) / 2
    let menuRight = 12
    if (wx.getMenuButtonBoundingClientRect) {
      const menu = wx.getMenuButtonBoundingClientRect()
      if (menu && menu.width && menu.height) {
        menuWidth = menu.width
        menuHeight = menu.height
        menuTop = menu.top || menuTop
        menuRight = Math.max(10, windowWidth - menu.right)
      }
    }
    this.safeSetData({
      topInset: Math.max(headerHeight + 8, 72),
      statusBarHeight,
      navBarHeight,
      menuWidth,
      menuHeight,
      menuTop,
      menuRight,
      safeAreaBottom: getLayoutMetrics().safeBottom - 10 || 0
    })
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: "/pages/home/index" })
  },

  addCurrentSkuToCart(onSuccess) {
    const skuId = toDisplayText(this.data.packInfo && this.data.packInfo.skuId, "")
    if (!skuId) {
      wx.showToast({
        title: "SKU信息缺失",
        icon: "none"
      })
      return
    }
    if (this._isAddingCart) return

    this._isAddingCart = true
    return post(paths.mall.cartAdd, {
      skuId,
      buyQty: 1
    })
      .then(() => {
        if (typeof onSuccess === "function") onSuccess()
      })
      .catch(() => {})
      .finally(() => {
        this._isAddingCart = false
      })
  },

  findCurrentCartItem() {
    const skuId = toDisplayText(this.data.packInfo && this.data.packInfo.skuId, "")
    if (!skuId) return Promise.resolve(null)

    return get(paths.mall.cart).then((res) => {
      const payload = normalizeCartPayload(unwrapResponseData(res))
      const items = normalizeCartItemList(payload)
      return items.find((item) => String(item && item.skuId != null ? item.skuId : "") === skuId) || null
    })
  },

  onFirstAdd() {
    this.addCurrentSkuToCart(() => {
      const nextCount = toNumberOr(this.data.cartCount, 0) + 1
      this.safeSetData({
        qtySelected: true,
        qty: 1,
        cartCount: nextCount
      })
    })
  },

  increaseQty() {
    this.addCurrentSkuToCart(() => {
      const nextCount = toNumberOr(this.data.cartCount, 0) + 1
      this.safeSetData({
        qty: this.data.qty + 1,
        cartCount: nextCount
      })
    })
  },

  decreaseQty() {
    if (this._isChangingCartQty) return

    this._isChangingCartQty = true
    this.findCurrentCartItem()
      .then((item) => {
        if (!item) return

        const itemId = item.itemId != null && item.itemId !== "" ? item.itemId : item.id
        if (itemId == null || itemId === "") return

        const currentBuyQty = Math.max(0, toNumberOr(item.buyQty != null ? item.buyQty : item.count, 0))
        if (currentBuyQty <= 0) return

        const nextBuyQty = Math.max(0, currentBuyQty - 1)
        return put(paths.mall.cartItemQty, {
          itemId: toRequestItemId(itemId),
          buyQty: nextBuyQty
        }).then(() => {
          const nextCartCount = Math.max(0, toNumberOr(this.data.cartCount, 0) - 1)
          this.safeSetData({
            qty: nextBuyQty > 0 ? nextBuyQty : 1,
            qtySelected: nextBuyQty > 0,
            cartCount: nextCartCount
          })
        })
      })
      .catch(() => {})
      .finally(() => {
        this._isChangingCartQty = false
      })
  },

  getCurrentSpuId() {
    const fromPackInfo = this.data.packInfo && (this.data.packInfo.spuId || this.data.packInfo.id)
    return toDisplayText(fromPackInfo, toDisplayText(this.data.spuId, ""))
  },

  onToggleFavorite() {
    const spuId = this.getCurrentSpuId()
    if (!spuId) {
      wx.showToast({
        title: "商品信息缺失",
        icon: "none"
      })
      return
    }
    if (this._isTogglingFavorite) return

    const isFavorited = !!this.data.isFavorited
    const nextFavorited = !isFavorited
    this._isTogglingFavorite = true

    requestToggleFavorite({
      bizType: "SPU",
      bizId: spuId,
      isFavorited
    })
      .then(() => {
        this.safeSetData({ isFavorited: nextFavorited })
        wx.showToast({
          title: nextFavorited ? "收藏成功" : "已取消收藏",
          icon: "none"
        })
      })
      .catch(() => {})
      .finally(() => {
        this._isTogglingFavorite = false
      })
  },

  openCart() {
    wx.navigateTo({ url: "/pages/cart/index" })
  },

  onShare() {
    wx.showToast({ title: "分享功能开发中", icon: "none" })
  }
})
