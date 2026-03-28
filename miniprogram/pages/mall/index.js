const { getLayoutMetrics } = require("../../utils/layout")

const MOCK_MALL_DATA = {
  city: "成都市",
  searchPlaceholder: "关键词搜索",
  notice: "全场满99元包邮 · 新人专享",
  categories: ["有机果蔬", "超级食物", "便捷配方包"],
  products: [
    { id: "jujube", name: "有机红枣", score: "4.8", stock: 156, price: "28.8", unit: "/500g", label: "鲜" },
    { id: "carrot", name: "有机胡萝卜", score: "4.8", stock: 236, price: "12.8", unit: "/1kg", label: "鲜" },
    { id: "goji", name: "宁夏枸杞", score: "4.9", stock: 19, price: "35", unit: "/250g", label: "鲜" },
    { id: "apple", name: "新鲜苹果", score: "4.6", stock: 178, price: "19.9", unit: "/500g", label: "鲜" }
  ]
}

function fetchMallData() {
  // TODO: 后续替换为商城接口
  return Promise.resolve(JSON.parse(JSON.stringify(MOCK_MALL_DATA)))
}

Page({
  data: {
    topInset: 32,
    city: "",
    searchPlaceholder: "",
    searchKeyword: "",
    notice: "",
    categories: [],
    activeCategory: 0,
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
    this.setData(payload)
  },
  onInputSearch(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
  },
  selectCategory(e) {
    const { index } = e.currentTarget.dataset
    this.setData({
      activeCategory: Number(index)
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
