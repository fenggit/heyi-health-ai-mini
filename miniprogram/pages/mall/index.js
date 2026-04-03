const { getLayoutMetrics } = require("../../utils/layout")

const MOCK_MALL_DATA = {
  mallTitle: "合一商城",
  city: "成都市",
  searchPlaceholder: "关键词搜索",
  categories: [
    { key: "organic", label: "有机果蔬" },
    { key: "superfood", label: "超级食物" },
    { key: "ready-pack", label: "便捷配方包" }
  ],
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
  products: [
    {
      id: "jujube",
      name: "有机红枣",
      categories: ["organic"],
      badge: "新品",
      badgeType: "new",
      score: "4.8",
      stock: 156,
      price: "28.8",
      unit: "/500g",
      image: "/assets/mall/product-jujube.png"
    },
    {
      id: "goji",
      name: "宁夏枸杞",
      categories: ["organic", "superfood"],
      badge: "推荐",
      badgeType: "recommend",
      score: "4.9",
      stock: 19,
      price: "35",
      unit: "/250g",
      image: "/assets/mall/product-goji.png"
    },
    {
      id: "carrot",
      name: "有机胡萝卜",
      categories: ["organic", "ready-pack"],
      badge: "热销",
      badgeType: "hot",
      score: "4.8",
      stock: 236,
      price: "12.8",
      unit: "/1kg",
      image: "/assets/mall/product-carrot.png"
    },
    {
      id: "apple",
      name: "新鲜苹果",
      categories: ["organic", "ready-pack"],
      score: "4.6",
      stock: 178,
      price: "19.9",
      unit: "/500g",
      image: "/assets/mall/product-apple.png"
    }
  ],
  cartCount: 32
}

function fetchMallData() {
  // TODO: 后续替换为商城接口
  return Promise.resolve(JSON.parse(JSON.stringify(MOCK_MALL_DATA)))
}

Page({
  data: {
    topInset: 32,
    mallTitle: "",
    city: "",
    searchPlaceholder: "",
    searchKeyword: "",
    categories: [],
    activeCategory: 0,
    activeCategoryKey: "",
    bannerCurrent: 0,
    activityBanners: [],
    sourceProducts: [],
    products: [],
    cartCount: 0
  },
  onLoad() {
    this.syncLayout()
    this.loadPageData()
  },
  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },
  syncLayout() {
    const { statusBarHeight } = getLayoutMetrics()
    this.setData({
      topInset: Math.max(statusBarHeight + 12, 32)
    })
  },
  async loadPageData() {
    const payload = await fetchMallData()
    const { categories = [], products = [] } = payload
    const activeCategoryKey = categories.length ? categories[0].key : ""
    this.setData(
      {
        ...payload,
        sourceProducts: products,
        activeCategoryKey
      },
      () => {
        this.applyProductFilters()
      }
    )
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
  selectCategory(e) {
    const { index, key } = e.currentTarget.dataset
    this.setData(
      {
        activeCategory: Number(index),
        activeCategoryKey: key || ""
      },
      () => {
        this.applyProductFilters()
      }
    )
  },
  onBannerChange(e) {
    this.setData({
      bannerCurrent: e.detail.current
    })
  },
  applyProductFilters() {
    const { sourceProducts, searchKeyword, activeCategoryKey } = this.data
    const normalizedKeyword = (searchKeyword || "").trim().toLowerCase()
    const nextProducts = sourceProducts.filter((product) => {
      const categoryList = Array.isArray(product.categories) ? product.categories : [product.category]
      const inCategory = !activeCategoryKey || categoryList.includes(activeCategoryKey)
      if (!inCategory) return false
      if (!normalizedKeyword) return true
      const matchedText = `${product.name}${product.badge || ""}`.toLowerCase()
      return matchedText.includes(normalizedKeyword)
    })
    this.setData({
      products: nextProducts
    })
  },
  openCart() {
    wx.navigateTo({
      url: "/pages/cart/index"
    })
  },
  openProduct(e) {
    const { id } = e.currentTarget.dataset
    wx.showToast({
      title: id ? "已选中商品" : "商品详情开发中",
      icon: "none"
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
