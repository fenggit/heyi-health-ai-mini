const { getLayoutMetrics } = require("../../utils/layout")

const MOCK_PLAN = {
  cycleLabel: "周计划",
  title: "我的食养计划",
  introTag: "定制计划",
  reminder: "今日提醒：早餐时间将在 08:00 提醒您，请提前准备食材",
  progress: {
    day: 1,
    totalDays: 7,
    status: "进行中"
  },
  info: [
    { label: "开始日期", value: "2026-03-19" },
    { label: "体质类型", value: "平和质" },
    { label: "饮食偏好", value: "少油·低糖·高蛋白" },
    { label: "用餐时间", value: "08:00 / 12:00 / 18:00" }
  ],
  dayPlan: {
    title: "第一天 (3月19日)",
    status: "进行中",
    recipes: [
      {
        id: "r1",
        name: "养胃气血汁水",
        tags: ["养脾胃", "补气血"],
        meal: "早餐",
        mealTime: "08:00",
        price: "68",
        unit: "/份",
        type: "简单 · 平和质",
        done: true
      },
      {
        id: "r2",
        name: "清肝明目汁",
        tags: ["明目", "清肝火"],
        meal: "午餐",
        mealTime: "12:00",
        price: "58",
        unit: "/份",
        type: "简单 · 平和质",
        done: false
      }
    ]
  }
}

const MEAL_ICON_MAP = {
  早餐: "/assets/diet-plan/icon_breakfast.png",
  午餐: "/assets/diet-plan/icon_lunch.png",
  晚餐: "/assets/diet-plan/icon_dinner.png"
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
    safeBottom: 0,

    cycleLabel: "",
    title: "",
    introTag: "",
    reminder: "",
    progress: {},
    progressPercent: 0,
    info: [],
    dayPlan: {
      recipes: []
    },
    allDone: false
  },

  onLoad() {
    this.syncLayout()
    this.loadPageData()
  },

  syncLayout() {
    const { statusBarHeight, navBarHeight, headerHeight, safeBottom } = getLayoutMetrics()
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

    this.setData({
      topInset: Math.max(headerHeight + 8, 72),
      statusBarHeight,
      navBarHeight,
      headerHeight,
      menuWidth,
      menuHeight,
      menuTop,
      menuRight,
      safeBottom
    })
  },

  loadPageData() {
    const payload = JSON.parse(JSON.stringify(MOCK_PLAN))
    payload.dayPlan.recipes = (payload.dayPlan.recipes || []).map((item) => ({
      ...item,
      mealIcon: MEAL_ICON_MAP[item.meal] || "/assets/diet-plan/icon_breakfast.png"
    }))
    const progressPercent = Math.max(
      0,
      Math.min(100, Math.round((payload.progress.day * 100) / payload.progress.totalDays))
    )

    this.setData({
      ...payload,
      progressPercent,
      allDone: payload.dayPlan.recipes.every((item) => !!item.done)
    })
  },

  handleBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: "/pages/diet/index" })
  },

  toggleAllDone() {
    const nextDone = !this.data.allDone
    const recipes = (this.data.dayPlan.recipes || []).map((item) => ({
      ...item,
      done: nextDone
    }))

    this.setData({
      allDone: nextDone,
      dayPlan: {
        ...this.data.dayPlan,
        recipes
      }
    })
  },

  adjustPlan() {
    wx.navigateTo({ url: "/pages/diet-plan/index" })
  },

  buyAll() {
    wx.switchTab({ url: "/pages/mall/index" })
  },

  openRecipe(e) {
    const { id } = e.currentTarget.dataset
    wx.showToast({
      title: `演示版：${id}详情待接入`,
      icon: "none"
    })
  }
})
