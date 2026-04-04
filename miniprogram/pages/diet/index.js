const { getLayoutMetrics } = require("../../utils/layout")

const RECIPE_COVERS = [
  "/assets/mall/product-jujube.png",
  "/assets/mall/product-goji.png",
  "/assets/mall/product-apple.png",
  "/assets/mall/product-carrot.png"
]

const MOCK_DIET_DATA = {
  categories: ["有机果蔬", "超级食物", "便捷配方包"],
  cartCount: 32,
  planIntro: {
    title: "定制食养计划：",
    desc: "周计划 · 月计划 · 定时提醒",
    note: "个性化配方 · 顺应节气 · 科学食养"
  },
  weeklyPlan: {
    day: 2,
    totalDays: 7,
    progressText: "进行中",
    meals: [
      { id: "breakfast", title: "早餐", time: "08:00" },
      { id: "lunch", title: "午餐", time: "12:00" }
    ]
  },
  recipes: [
    {
      id: "r1",
      name: "养胃气血汁水",
      tags: ["养脾胃", "补气血"],
      type: "简单·气虚质",
      price: "68",
      unit: "/份"
    },
    {
      id: "r2",
      name: "清肝明目汁",
      tags: ["明目", "清肝火"],
      type: "简单·湿热质",
      price: "58",
      unit: "/份"
    },
    {
      id: "r3",
      name: "润燥生津汁",
      tags: ["滋阴", "润燥"],
      type: "简单·阴虚质",
      price: "72",
      unit: "/份"
    },
    {
      id: "r4",
      name: "健脾祛湿汁",
      tags: ["养脾胃", "补气血"],
      type: "简单·痰湿质",
      price: "58",
      unit: "/份"
    }
  ]
}

function fetchDietData() {
  // TODO: 后续替换为食养页接口
  return Promise.resolve(JSON.parse(JSON.stringify(MOCK_DIET_DATA)))
}

Page({
  data: {
    topInset: 32,
    configured: false,
    cartCount: 0,
    weeklyPercent: 0,
    categories: [],
    activeCategory: 0,
    planIntro: {},
    weeklyPlan: {},
    recipes: []
  },
  onLoad() {
    this.syncLayout()
    this.loadPageData()
  },
  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },
  syncLayout() {
    const { statusBarHeight } = getLayoutMetrics()
    this.setData({ topInset: Math.max(statusBarHeight + 12, 32) })
  },
  async loadPageData() {
    const payload = await fetchDietData()
    const recipes = (payload.recipes || []).map((item, idx) => ({
      ...item,
      cover: item.cover || RECIPE_COVERS[idx % RECIPE_COVERS.length]
    }))
    const weeklyPercent = payload.weeklyPlan
      ? Math.max(0, Math.min(100, Math.round((payload.weeklyPlan.day * 100) / payload.weeklyPlan.totalDays)))
      : 0
    this.setData({
      ...payload,
      recipes,
      weeklyPercent
    })
  },
  selectCategory(e) {
    const { index } = e.currentTarget.dataset
    this.setData({
      activeCategory: Number(index)
    })
  },
  openCart() {
    wx.navigateTo({ url: '/pages/cart/index' })
  },
  openDietPlan() {
    wx.navigateTo({
      url: "/pages/diet-plan/index"
    })
  },
  openRecipe(e) {
    const { id } = e.currentTarget.dataset
    wx.showToast({
      title: `演示版：${id}详情待接入`,
      icon: "none"
    })
  },
  addToCart(e) {
    const { id } = e.currentTarget.dataset
    wx.showToast({ title: '已加入购物车', icon: 'success' })
  }
})
