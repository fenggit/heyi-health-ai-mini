const { getLayoutMetrics } = require("../../utils/layout")
const { get } = require("../../utils/request")
const paths = require("../../http/paths")

const DEFAULT_PAGE_SIZE = 10

const STATIC_MALL_DATA = {
  mallTitle: "合一商城",
  city: "定位中",
  searchPlaceholder: "关键词搜索",
  activityBanners: [
    {
      id: "tea-experience",
      image: "/assets/test/home-banner1.png"
    },
    {
      id: "food-market",
      image: "/assets/test/home-banner2.png"
    }
  ],
  cartCount: 32
}

function unwrapResponseData(res) {
  if (res && Object.prototype.hasOwnProperty.call(res, "data") && res.data !== undefined && res.data !== null) {
    return res.data
  }
  return res
}

function normalizeArrayLike(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== "object") return []

  const listKeys = ["records", "list", "items", "rows", "result"]
  for (const key of listKeys) {
    if (Array.isArray(data[key])) return data[key]
  }

  if (data.page && typeof data.page === "object") {
    for (const key of listKeys) {
      if (Array.isArray(data.page[key])) return data.page[key]
    }
  }

  return []
}

function toNumberOr(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function formatPriceValue(value) {
  if (value === null || value === undefined || value === "") return "0"
  const num = Number(value)
  if (!Number.isFinite(num)) return String(value)
  if (Number.isInteger(num)) return String(num)
  return num.toFixed(2).replace(/\.?0+$/, "")
}

function formatWeightText(weightValue, weightUnit) {
  if (weightValue === null || weightValue === undefined || weightValue === "") return "--"
  const unit = weightUnit == null ? "" : String(weightUnit)
  return `${weightValue}${unit}`
}

function buildPriceUnitText(weightValue, weightUnit, unitName) {
  if (weightValue !== null && weightValue !== undefined && weightValue !== "") {
    const unit = weightUnit == null ? "" : String(weightUnit)
    return `/${weightValue}${unit}`
  }
  if (unitName) return `/${unitName}`
  return ""
}

function toBoolYes(value) {
  const text = String(value || "").trim().toUpperCase()
  return text === "Y" || text === "YES" || text === "TRUE" || text === "1"
}

function mergeProductList(prevList = [], nextList = []) {
  const merged = []
  const picked = new Set()
  const source = prevList.concat(nextList)

  source.forEach((item, index) => {
    const row = item && typeof item === "object" ? item : {}
    const id = row.id != null && row.id !== "" ? String(row.id) : `row-${index}`
    if (picked.has(id)) return
    picked.add(id)
    merged.push({
      ...row,
      id
    })
  })

  return merged
}

function normalizeCategoryList(payload) {
  const list = normalizeArrayLike(payload)
  const mapped = list
    .map((item, index) => {
      const row = item && typeof item === "object" ? item : {}
      const categoryId =
        row.categoryId != null && row.categoryId !== ""
          ? String(row.categoryId)
          : (row.id != null && row.id !== "" ? String(row.id) : "")
      if (!categoryId) return null

      return {
        id: categoryId,
        key: categoryId,
        label: row.categoryName || row.name || `分类${index + 1}`,
        sortNo: toNumberOr(row.sortNo, index)
      }
    })
    .filter(Boolean)

  mapped.sort((a, b) => a.sortNo - b.sortNo)
  return mapped
}

function resolvePagePayload(payload) {
  const pageData = payload && typeof payload === "object" && payload.page ? payload.page : payload
  const list = normalizeArrayLike(pageData)

  const pageNum = toNumberOr(
    pageData && (pageData.current || pageData.pageNum || pageData.pageNo || pageData.pageIndex),
    1
  )
  const pageSize = toNumberOr(pageData && (pageData.size || pageData.pageSize || pageData.limit), DEFAULT_PAGE_SIZE)

  let pages = toNumberOr(pageData && (pageData.pages || pageData.totalPage || pageData.pageCount), NaN)
  let total = toNumberOr(pageData && (pageData.total || pageData.totalCount || pageData.count), NaN)

  if (!Number.isFinite(total)) {
    total = NaN
  }
  if (!Number.isFinite(pages) && Number.isFinite(total) && pageSize > 0) {
    pages = Math.ceil(total / pageSize)
  }

  return {
    list,
    pageNum,
    pageSize,
    pages,
    total
  }
}

function mapMallProduct(item, index) {
  const row = item && typeof item === "object" ? item : {}
  const sku = row.defaultSku && typeof row.defaultSku === "object" ? row.defaultSku : {}

  const rawId =
    row.spuId != null && row.spuId !== ""
      ? row.spuId
      : (row.id != null && row.id !== "" ? row.id : (sku.spuId != null ? sku.spuId : ""))
  const id = rawId !== "" ? String(rawId) : `spu-${index}`

  const stockQty = toNumberOr(sku.stockQty != null ? sku.stockQty : row.stockQty, 0)
  const unitName = sku.unitName || row.unitName || ""
  const salePrice = sku.salePrice != null ? sku.salePrice : row.salePrice
  const weightValue = sku.weightValue != null ? sku.weightValue : row.weightValue
  const weightUnit = sku.weightUnit != null ? sku.weightUnit : row.weightUnit
  const scoreValue = row.score != null && row.score !== "" ? row.score : sku.score
  const scoreText =
    scoreValue === null || scoreValue === undefined || scoreValue === ""
      ? ""
      : String(scoreValue)
  const priceUnitText = buildPriceUnitText(weightValue, weightUnit, unitName)

  return {
    id,
    spuId: id,
    name: row.spuName || row.spuTitle || row.name || "未命名商品",
    image: row.coverImage || sku.coverImage || "/assets/mall/product-apple.png",
    badge: toBoolYes(row.newFlag) ? "新品" : "",
    badgeType: "new",
    stockQty,
    stockText: `库存 ${stockQty}`,
    scoreText,
    price: formatPriceValue(salePrice),
    unit: priceUnitText,
    weightText: formatWeightText(weightValue, weightUnit)
  }
}

function computeHasMore({ pageNum, pageSize, pages, total, loadedCount, fetchedCount }) {
  if (Number.isFinite(pages) && pages > 0) {
    return pageNum < pages
  }
  if (Number.isFinite(total) && total >= 0) {
    return loadedCount < total
  }
  if (pageSize > 0) {
    return fetchedCount >= pageSize
  }
  return fetchedCount > 0
}

function buildLoadMoreText({ isLoading, hasMore, hasProducts }) {
  if (isLoading) return "加载中..."
  if (!hasProducts) return "暂无商品"
  if (hasMore) return "上拉加载更多"
  return "没有更多了"
}

function formatCityName(rawCity = "") {
  const city = String(rawCity || "").trim()
  if (!city) return ""
  if (city === "定位中" || city === "定位失败") return city
  if (/市$|自治州$|地区$|盟$/.test(city)) return city
  return `${city}市`
}

function pickCityByAddressText(text = "") {
  const input = String(text || "")
  if (!input) return ""
  const matched = input.match(/([^省\s]+?(?:市|自治州|地区|盟))/)
  return matched ? matched[1] : ""
}

function extractCityFromLocationResult(result = {}) {
  const directCity =
    result.city ||
    result.locality ||
    result.cityName ||
    (result.addressComponent && result.addressComponent.city) ||
    (result.ad_info && result.ad_info.city)

  const normalizedDirectCity = formatCityName(directCity)
  if (normalizedDirectCity) return normalizedDirectCity

  const addressCity = pickCityByAddressText(result.address || result.formatted_address || "")
  return formatCityName(addressCity)
}

function isLocationPermissionError(err) {
  const message = String((err && err.errMsg) || "").toLowerCase()
  if (!message) return false
  return /auth deny|auth denied|authorize no response|permission denied|no permission|scope\./.test(message)
}

Page({
  data: {
    topInset: 32,
    mallTitle: STATIC_MALL_DATA.mallTitle,
    city: STATIC_MALL_DATA.city,
    searchPlaceholder: STATIC_MALL_DATA.searchPlaceholder,
    searchKeyword: "",
    categories: [],
    activeCategory: 0,
    activeCategoryKey: "",
    activeCategoryId: "",
    bannerCurrent: 0,
    activityBanners: STATIC_MALL_DATA.activityBanners,
    sourceProducts: [],
    products: [],
    cartCount: STATIC_MALL_DATA.cartCount,

    pageNum: 0,
    pageSize: DEFAULT_PAGE_SIZE,
    hasMore: false,
    isLoadingProducts: false,
    loadMoreText: "暂无商品"
  },

  onLoad() {
    this.syncLayout()
    this.syncCurrentCity()
    this.loadMallData({ showLoading: true, keepActiveCategory: false })
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    this.syncCurrentCity()
  },

  onPullDownRefresh() {
    this.loadMallData({ showLoading: false, keepActiveCategory: true }).finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    this.loadMoreProducts()
  },

  syncLayout() {
    const { statusBarHeight } = getLayoutMetrics()
    this.setData({
      topInset: Math.max(statusBarHeight + 12, 32)
    })
  },

  refreshLoadMoreText() {
    const hasProducts = Array.isArray(this.data.sourceProducts) && this.data.sourceProducts.length > 0
    const text = buildLoadMoreText({
      isLoading: !!this.data.isLoadingProducts,
      hasMore: !!this.data.hasMore,
      hasProducts
    })
    this.setData({
      loadMoreText: text
    })
  },

  fetchCategoryList() {
    return get(paths.mall.categoryList).then((res) => {
      const payload = unwrapResponseData(res)
      return normalizeCategoryList(payload)
    })
  },

  loadMallData({ showLoading = false, keepActiveCategory = true } = {}) {
    if (this._mallDataPromise) return this._mallDataPromise

    const previousCategoryId = keepActiveCategory ? String(this.data.activeCategoryId || "") : ""

    if (showLoading) {
      wx.showLoading({ title: "加载中", mask: true })
    }

    this._mallDataPromise = this.fetchCategoryList()
      .then((categories) => {
        const preferredIndex = previousCategoryId
          ? categories.findIndex((item) => item.id === previousCategoryId)
          : 0
        const activeIndex = preferredIndex >= 0 ? preferredIndex : 0
        const activeCategory = categories[activeIndex] || null
        const cachedCity = formatCityName(this.data.city)

        this.setData({
          mallTitle: STATIC_MALL_DATA.mallTitle,
          city: cachedCity || STATIC_MALL_DATA.city,
          searchPlaceholder: STATIC_MALL_DATA.searchPlaceholder,
          activityBanners: STATIC_MALL_DATA.activityBanners,
          cartCount: STATIC_MALL_DATA.cartCount,
          categories,
          activeCategory: activeCategory ? activeIndex : 0,
          activeCategoryKey: activeCategory ? activeCategory.key : "",
          activeCategoryId: activeCategory ? activeCategory.id : "",
          sourceProducts: [],
          products: [],
          pageNum: 0,
          hasMore: !!activeCategory,
          isLoadingProducts: false
        })
        this.refreshLoadMoreText()

        if (!activeCategory) return
        return this.loadProductsByCategory({ categoryId: activeCategory.id, reset: true })
      })
      .catch((err) => {
        console.warn("[mall] 拉取分类失败:", err)
        this.setData({
          categories: [],
          activeCategory: 0,
          activeCategoryKey: "",
          activeCategoryId: "",
          sourceProducts: [],
          products: [],
          pageNum: 0,
          hasMore: false,
          isLoadingProducts: false
        })
        this.refreshLoadMoreText()
      })
      .finally(() => {
        if (showLoading) wx.hideLoading()
        this._mallDataPromise = null
      })

    return this._mallDataPromise
  },

  loadProductsByCategory({ categoryId, reset = false } = {}) {
    const targetCategoryId = String(categoryId || this.data.activeCategoryId || "")
    if (!targetCategoryId) return Promise.resolve()
    if (this.data.isLoadingProducts && !reset) return this._productPagePromise || Promise.resolve()
    if (!reset && !this.data.hasMore) return Promise.resolve()

    const nextPageNum = reset ? 1 : this.data.pageNum + 1
    const pageSize = this.data.pageSize || DEFAULT_PAGE_SIZE
    const requestKey = `${targetCategoryId}-${nextPageNum}-${Date.now()}`
    this._latestProductRequestKey = requestKey

    this.setData({ isLoadingProducts: true })
    this.refreshLoadMoreText()

    this._productPagePromise = get(paths.mall.spuPage, {
      categoryId: targetCategoryId,
      pageNum: nextPageNum,
      pageSize
    })
      .then((res) => {
        if (this._latestProductRequestKey !== requestKey) return
        const payload = unwrapResponseData(res)
        const pagePayload = resolvePagePayload(payload)
        const list = pagePayload.list.map(mapMallProduct)
        const merged = reset ? list : mergeProductList(this.data.sourceProducts, list)

        const hasMore = computeHasMore({
          pageNum: nextPageNum,
          pageSize: pagePayload.pageSize || pageSize,
          pages: pagePayload.pages,
          total: pagePayload.total,
          fetchedCount: list.length,
          loadedCount: merged.length
        })

        this.setData(
          {
            sourceProducts: merged,
            pageNum: nextPageNum,
            hasMore
          },
          () => {
            this.applyProductFilters()
          }
        )
      })
      .catch((err) => {
        if (this._latestProductRequestKey !== requestKey) return
        console.warn("[mall] 拉取商品列表失败:", err)
        if (reset) {
          this.setData({
            sourceProducts: [],
            products: [],
            pageNum: 0,
            hasMore: false
          })
        }
      })
      .finally(() => {
        if (this._latestProductRequestKey !== requestKey) return
        this.setData({ isLoadingProducts: false })
        this.refreshLoadMoreText()
        this._productPagePromise = null
      })

    return this._productPagePromise
  },

  loadMoreProducts() {
    if (!this.data.activeCategoryId) return
    if (this.data.isLoadingProducts) return
    if (!this.data.hasMore) return

    this.loadProductsByCategory({
      categoryId: this.data.activeCategoryId,
      reset: false
    })
  },

  onInputSearch(e) {
    this.setData(
      {
        searchKeyword: e.detail.value
      },
      () => {
        this.applyProductFilters()
      }
    )
  },

  onTapLocation() {
    if (this.isLocatingCity) {
      wx.showToast({
        title: "正在定位中",
        icon: "none"
      })
      return
    }

    this.setData({ city: "定位中" })
    this.syncCurrentCity()
  },

  promptLocationPermission() {
    if (this._locationPermissionModalVisible) return
    this._locationPermissionModalVisible = true

    wx.showModal({
      title: "需要定位权限",
      content: "开启定位权限后，可自动显示你当前所在城市。",
      confirmText: "去设置",
      cancelText: "暂不",
      success: (res) => {
        if (!res.confirm) return
        wx.openSetting({
          success: (settingRes) => {
            const authSetting = (settingRes && settingRes.authSetting) || {}
            const hasLocationAuth = !!(
              authSetting["scope.userLocation"] || authSetting["scope.userFuzzyLocation"]
            )

            if (hasLocationAuth) {
              this.setData({ city: "定位中" })
              this.syncCurrentCity()
              return
            }

            wx.showToast({
              title: "未开启定位权限",
              icon: "none"
            })
          }
        })
      },
      complete: () => {
        this._locationPermissionModalVisible = false
      }
    })
  },

  selectCategory(e) {
    const { index, key, id } = e.currentTarget.dataset
    const nextCategoryId = String(id || key || "")
    const nextIndex = Number(index)

    if (!nextCategoryId) return
    if (nextCategoryId === this.data.activeCategoryId && this.data.sourceProducts.length) return

    this.setData(
      {
        activeCategory: Number.isFinite(nextIndex) ? nextIndex : 0,
        activeCategoryKey: String(key || nextCategoryId),
        activeCategoryId: nextCategoryId,
        sourceProducts: [],
        products: [],
        pageNum: 0,
        hasMore: true
      },
      () => {
        this.refreshLoadMoreText()
        this.loadProductsByCategory({
          categoryId: nextCategoryId,
          reset: true
        })
      }
    )
  },

  onBannerChange(e) {
    this.setData({
      bannerCurrent: e.detail.current
    })
  },

  applyProductFilters() {
    const { sourceProducts, searchKeyword } = this.data
    const normalizedKeyword = (searchKeyword || "").trim().toLowerCase()

    const nextProducts = sourceProducts.filter((product) => {
      if (!normalizedKeyword) return true
      const matchedText = `${product.name}${product.badge || ""}`.toLowerCase()
      return matchedText.includes(normalizedKeyword)
    })

    this.setData({
      products: nextProducts
    })
  },

  syncCurrentCity() {
    if (this.isLocatingCity) return
    this.isLocatingCity = true

    const applyCity = (city) => {
      const nextCity = formatCityName(city)
      if (!nextCity) return false
      this.setData({ city: nextCity })
      return true
    }

    const finalize = () => {
      this.isLocatingCity = false
    }

    const setFallbackIfNeeded = () => {
      if (!this.data.city || this.data.city === "定位中") {
        this.setData({ city: "定位失败" })
      }
    }

    if (typeof wx.getFuzzyLocation !== "function") {
      setFallbackIfNeeded()
      finalize()
      return
    }

    wx.getFuzzyLocation({
      success: (res) => {
        const city = extractCityFromLocationResult(res)
        if (!applyCity(city)) {
          setFallbackIfNeeded()
        }
      },
      fail: (err) => {
        console.warn("[mall] 获取当前城市失败:", err)
        if (isLocationPermissionError(err)) {
          this.promptLocationPermission()
        }
        setFallbackIfNeeded()
      },
      complete: finalize
    })
  },

  openCart() {
    wx.navigateTo({
      url: "/pages/cart/index"
    })
  },

  openProduct(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/food-detail/index?id=${id || ""}`
    })
  },

  addToCart(e) {
    const { id } = e.currentTarget.dataset
    const nextCount = this.data.cartCount + 1
    this.setData({
      cartCount: nextCount
    })
    wx.showToast({
      title: "已加入购物车",
      icon: "none"
    })
    this.lastAddedProduct = id
  }
})
