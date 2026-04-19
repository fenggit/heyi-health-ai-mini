const { getLayoutMetrics } = require("../../utils/layout")
const { get } = require("../../utils/request")
const paths = require("../../http/paths")

const STATIC_DETAIL_DATA = {
  cartCount: 0
}

const DEFAULT_PACK_DATA = {
  id: "yang-wei-qi-xue",
  recipeId: "",
  name: "养胃气血汁",
  description: "富含铁质和维生素C的配方，有助于补血养气，改善春季疲乏。",
  tags: ["补气血", "养脾胃", "春季养生"],
  price: "68",
  priceUnit: "/包",
  kcal: "180",
  tipText: "所有食材已按比例配好，一包可制作2人份。",
  image: "/assets/test/home-banner2.png",
  videoUrl: "",
  videoCover: "",
  ingredients: [
    { id: "ingredient-1", name: "红枣", amount: "5 颗" },
    { id: "ingredient-2", name: "枸杞", amount: "10 g" },
    { id: "ingredient-3", name: "胡萝卜", amount: "1 根" },
    { id: "ingredient-4", name: "苹果", amount: "1 个" },
    { id: "ingredient-5", name: "柠檬", amount: "半个" },
    { id: "ingredient-6", name: "蜂蜜", amount: "适量" }
  ],
  steps: [
    "将红枣去核，枸杞清洗干净备用",
    "将所有食材放入破壁机中",
    "加入适量温水，搅打2-3分钟",
    "过滤后加入柠檬汁和蜂蜜调味",
    "倒入杯中即可饮用"
  ],
  effects: [
    "补气养血：红枣和枸杞富含铁质",
    "促进消化：胡萝卜有助于脾胃健康",
    "增强免疫：维生素C提升抵抗力",
    "美容养颜：抗氧化成分保护肌肤"
  ]
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

function normalizeList(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== "object") return []

  const listKeys = ["list", "items", "Items", "records", "rows", "result"]
  for (const key of listKeys) {
    if (Array.isArray(data[key])) return data[key]
  }
  return []
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

function sortByNumberField(sourceList = [], fieldName) {
  const list = sourceList.slice()
  list.sort((a, b) => {
    const left = Number(a && a[fieldName])
    const right = Number(b && b[fieldName])
    if (Number.isFinite(left) && Number.isFinite(right)) return left - right
    if (Number.isFinite(left)) return -1
    if (Number.isFinite(right)) return 1
    return 0
  })
  return list
}

function formatAmountText(amount, unit) {
  const amountText = toDisplayText(formatNumberText(amount, ""), "")
  const unitText = toDisplayText(unit, "")
  if (amountText && unitText) return `${amountText} ${unitText}`
  if (amountText) return amountText
  if (unitText) return unitText
  return "--"
}

function mapIngredients(rawIngredients) {
  const list = sortByNumberField(normalizeList(rawIngredients), "sortNo")
  const mapped = list
    .map((item, index) => {
      const row = item && typeof item === "object" ? item : {}
      const name = toDisplayText(row.ingredientName || row.name, "")
      if (!name) return null
      return {
        name,
        amount: formatAmountText(row.amount, row.unit),
        id: row.id != null && row.id !== "" ? String(row.id) : `ingredient-${index + 1}`
      }
    })
    .filter(Boolean)
  return mapped.length ? mapped : cloneDeep(DEFAULT_PACK_DATA.ingredients)
}

function mapSteps(rawSteps) {
  const list = sortByNumberField(normalizeList(rawSteps), "stepNo")
  const mapped = list
    .map((item) => {
      const row = item && typeof item === "object" ? item : {}
      return toDisplayText(row.stepDesc || row.desc || row.remark, "")
    })
    .filter(Boolean)

  return mapped.length ? mapped : cloneDeep(DEFAULT_PACK_DATA.steps)
}

function splitEffectDesc(effectDesc) {
  const text = toDisplayText(effectDesc, "")
  if (!text) return []
  return text
    .split(/\r?\n|；|;|。/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildNutritionEffects(rawNutritions) {
  const list = normalizeList(rawNutritions)
  const mapped = list
    .map((item) => {
      const row = item && typeof item === "object" ? item : {}
      const nutrientName = toDisplayText(row.nutrientName || row.name, "")
      if (!nutrientName) return ""
      const nutrientValue = formatNumberText(row.nutrientValue, "")
      const unit = toDisplayText(row.unit, "")
      const valueText = nutrientValue || unit ? `${nutrientValue}${unit}` : ""
      return valueText ? `${nutrientName}：${valueText}` : nutrientName
    })
    .filter(Boolean)
  return mapped
}

function mapEffects(effectDesc, rawNutritions) {
  const effectList = splitEffectDesc(effectDesc)
  if (effectList.length) return effectList

  const nutritionEffects = buildNutritionEffects(rawNutritions)
  if (nutritionEffects.length) return nutritionEffects

  return cloneDeep(DEFAULT_PACK_DATA.effects)
}

function buildTipText(detail = {}) {
  const prepMinutes = Number(detail.prepMinutes)
  const difficultyLevel = Number(detail.difficultyLevel)
  const defaultQuantity = Number(detail.defaultQuantity)
  const unitName = toDisplayText(detail.unitName, "")
  const tipParts = []

  if (Number.isFinite(prepMinutes) && prepMinutes > 0) {
    tipParts.push(`制作时长约${prepMinutes}分钟`)
  }
  if (Number.isFinite(difficultyLevel) && difficultyLevel > 0) {
    tipParts.push(`制作难度${difficultyLevel}级`)
  }
  if (Number.isFinite(defaultQuantity) && defaultQuantity > 0) {
    tipParts.push(`默认份量${defaultQuantity}${unitName}`)
  }

  if (tipParts.length) {
    return `${tipParts.join("，")}。`
  }
  return DEFAULT_PACK_DATA.tipText
}

function resolveFormulaDetailPath(recipeId) {
  if (paths && paths.recipe && typeof paths.recipe.formulaDetail === "function") {
    return paths.recipe.formulaDetail(recipeId)
  }
  return `/recipe/app/formula/${encodeURIComponent(recipeId)}/detail`
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

function mapRecipeDetail(detail = {}, recipeId = "") {
  const source = detail && typeof detail === "object" ? detail : {}
  const recipeIdRaw = source.recipeId != null ? source.recipeId : recipeId
  const finalRecipeId = recipeIdRaw != null && recipeIdRaw !== "" ? String(recipeIdRaw) : ""
  const tags = parseTagList(source.tagJson || source.tags || source.tagList)
  const unitName = toDisplayText(source.unitName, "")
  const coverUrl = toDisplayText(source.coverUrl, "")
  const videoCoverUrl = toDisplayText(source.videoCoverUrl, "")

  return {
    id: finalRecipeId || DEFAULT_PACK_DATA.id,
    recipeId: finalRecipeId,
    name: toDisplayText(source.recipeName || source.name, DEFAULT_PACK_DATA.name),
    description: toDisplayText(source.intro || source.description, DEFAULT_PACK_DATA.description),
    tags: tags.length ? tags : cloneDeep(DEFAULT_PACK_DATA.tags),
    price: formatNumberText(source.priceAmount, DEFAULT_PACK_DATA.price),
    priceUnit: unitName ? `/${unitName}` : DEFAULT_PACK_DATA.priceUnit,
    kcal: formatNumberText(source.calories, DEFAULT_PACK_DATA.kcal),
    tipText: buildTipText(source),
    image: coverUrl || videoCoverUrl || DEFAULT_PACK_DATA.image,
    videoUrl: toDisplayText(source.videoUrl, ""),
    videoCover: videoCoverUrl || coverUrl || DEFAULT_PACK_DATA.image,
    ingredients: mapIngredients(source.ingredients),
    steps: mapSteps(source.steps),
    effects: mapEffects(source.effectDesc, source.nutritions)
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
    recipeId: "",
    packInfo: cloneDeep(DEFAULT_PACK_DATA),
    qty: 1,
    qtySelected: false, // false=未选择(只显示+按钮), true=已选择(显示减数字加)
    isLiked: false,
    cartCount: STATIC_DETAIL_DATA.cartCount
  },

  onLoad(options = {}) {
    this._isPageAlive = true
    this._detailReqId = 0
    this._cartReqId = 0
    this.syncLayout()
    const recipeId = toDisplayText(options.recipeId || options.id, "")
    this.safeSetData({ recipeId })
    this.loadPackInfo(recipeId)
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

  loadPackInfo(recipeId) {
    const reqId = (this._detailReqId || 0) + 1
    this._detailReqId = reqId
    if (!recipeId) {
      this.safeSetData({ packInfo: cloneDeep(DEFAULT_PACK_DATA) })
      return
    }

    wx.showLoading({ title: "加载中", mask: true })
    get(resolveFormulaDetailPath(recipeId))
      .then((res) => {
        if (!this._isPageAlive || this._detailReqId !== reqId) return
        const payload = unwrapResponseData(res)
        const packInfo = mapRecipeDetail(payload, recipeId)
        this.safeSetData({ packInfo })
      })
      .catch((err) => {
        if (!this._isPageAlive || this._detailReqId !== reqId) return
        console.warn("[food-detail] 拉取配方详情失败，使用默认数据:", err)
        const fallback = cloneDeep(DEFAULT_PACK_DATA)
        fallback.id = String(recipeId)
        fallback.recipeId = String(recipeId)
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
        console.warn("[food-detail] 获取购物车数量失败:", err)
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

  // 第一次点击加购：切换到数量控制模式
  onFirstAdd() {
    this.safeSetData({ qtySelected: true, qty: 1 })
  },

  increaseQty() {
    this.safeSetData({ qty: this.data.qty + 1 })
  },

  decreaseQty() {
    if (this.data.qty <= 1) {
      // 减到0时退回未选择状态
      this.safeSetData({ qty: 1, qtySelected: false })
      return
    }
    this.safeSetData({ qty: this.data.qty - 1 })
  },

  toggleLike() {
    this.safeSetData({ isLiked: !this.data.isLiked })
  },

  openCart() {
    wx.navigateTo({ url: "/pages/cart/index" })
  },

  onShare() {
    wx.showToast({ title: "分享功能开发中", icon: "none" })
  },

  playVideo() {
    const videoUrl = toDisplayText(this.data.packInfo && this.data.packInfo.videoUrl, "")
    if (!videoUrl) {
      wx.showToast({ title: "暂无视频教程", icon: "none" })
      return
    }

    if (typeof wx.previewMedia === "function") {
      wx.previewMedia({
        sources: [{ url: videoUrl, type: "video" }],
        current: 0,
        fail: () => {
          wx.navigateTo({
            url: `/pages/webview-page/index?title=${encodeURIComponent("视频教程")}&url=${encodeURIComponent(videoUrl)}`
          })
        }
      })
      return
    }

    wx.navigateTo({
      url: `/pages/webview-page/index?title=${encodeURIComponent("视频教程")}&url=${encodeURIComponent(videoUrl)}`
    })
  }
})
