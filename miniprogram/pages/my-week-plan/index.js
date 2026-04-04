const { getLayoutMetrics } = require("../../utils/layout")

const MEAL_ICON_MAP = {
  早餐: "/assets/diet-plan/icon_breakfast.png",
  午餐: "/assets/diet-plan/icon_lunch.png",
  晚餐: "/assets/diet-plan/icon_dinner.png"
}

// 生成7天mock数据
function buildWeekPlans() {
  const days = [
    { day: "第一天", date: "3月19日", recipes: [
      { id: "d1r1", name: "养胃气血汁水", tags: ["养脾胃", "补气血"], meal: "早餐", mealTime: "08:00", price: "68", unit: "/份", done: true },
      { id: "d1r2", name: "清肝明目汁", tags: ["明目", "清肝火"], meal: "午餐", mealTime: "12:00", price: "58", unit: "/份", done: false }
    ]},
    { day: "第二天", date: "3月20日", recipes: [
      { id: "d2r1", name: "健脾养胃粥", tags: ["健脾", "养胃"], meal: "早餐", mealTime: "08:00", price: "48", unit: "/份", done: false },
      { id: "d2r2", name: "清热解毒汤", tags: ["清热", "解毒"], meal: "午餐", mealTime: "12:00", price: "62", unit: "/份", done: false }
    ]},
    { day: "第三天", date: "3月21日", recipes: [
      { id: "d3r1", name: "补气养血羹", tags: ["补气", "养血"], meal: "早餐", mealTime: "08:00", price: "72", unit: "/份", done: false },
      { id: "d3r2", name: "滋阴润肺汤", tags: ["滋阴", "润肺"], meal: "晚餐", mealTime: "18:00", price: "65", unit: "/份", done: false }
    ]},
    { day: "第四天", date: "3月22日", recipes: [
      { id: "d4r1", name: "益气健脾粥", tags: ["益气", "健脾"], meal: "早餐", mealTime: "08:00", price: "55", unit: "/份", done: false },
      { id: "d4r2", name: "养心安神汤", tags: ["养心", "安神"], meal: "午餐", mealTime: "12:00", price: "68", unit: "/份", done: false }
    ]},
    { day: "第五天", date: "3月23日", recipes: [
      { id: "d5r1", name: "补肾强腰汤", tags: ["补肾", "强腰"], meal: "早餐", mealTime: "08:00", price: "78", unit: "/份", done: false },
      { id: "d5r2", name: "疏肝理气茶", tags: ["疏肝", "理气"], meal: "午餐", mealTime: "12:00", price: "45", unit: "/份", done: false }
    ]},
    { day: "第六天", date: "3月24日", recipes: [
      { id: "d6r1", name: "活血化瘀汤", tags: ["活血", "化瘀"], meal: "早餐", mealTime: "08:00", price: "70", unit: "/份", done: false },
      { id: "d6r2", name: "清心降火饮", tags: ["清心", "降火"], meal: "晚餐", mealTime: "18:00", price: "52", unit: "/份", done: false }
    ]},
    { day: "第七天", date: "3月25日", recipes: [
      { id: "d7r1", name: "固本培元粥", tags: ["固本", "培元"], meal: "早餐", mealTime: "08:00", price: "60", unit: "/份", done: false },
      { id: "d7r2", name: "调和五脏汤", tags: ["调和", "五脏"], meal: "午餐", mealTime: "12:00", price: "75", unit: "/份", done: false }
    ]}
  ]
  return days.map((d, i) => ({
    index: i,
    title: `${d.day}（${d.date}）`,
    status: i === 0 ? "进行中" : "未开始",
    recipes: d.recipes.map(r => ({
      ...r,
      mealIcon: MEAL_ICON_MAP[r.meal] || MEAL_ICON_MAP["早餐"]
    }))
  }))
}

const MOCK_PLAN = {
  cycleLabel: "周计划",
  title: "我的食养计划",
  introTag: "定制计划",
  reminder: "今日提醒：早餐时间将在 08:00 提醒您，请提前准备食材",
  progress: { day: 1, totalDays: 7, status: "进行中" },
  info: [
    { label: "体质类型", value: "平和质" },
    { label: "用餐时间", value: "08:00 / 12:00 / 18:00" },
    { label: "饮食偏好", value: "少油·低糖·高蛋白" },
    { label: "开始日期", value: "2026-03-19" }
  ]
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
    weekPlans: [],
    currentDay: 0,
    swiperHeight: 500,
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

    let menuWidth = 88, menuHeight = 32
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
      statusBarHeight, navBarHeight, headerHeight,
      menuWidth, menuHeight, menuTop, menuRight, safeBottom
    })
  },

  loadPageData() {
    const weekPlans = buildWeekPlans()
    const WEEK_TOTAL = 7
    const progressPercent = Math.max(0, Math.min(100, Math.round((MOCK_PLAN.progress.day * 100) / WEEK_TOTAL)))

    // 计算 swiper 高度：取所有天中食谱数最多的那天
    // 每条 item: 212rpx，间距 16rpx，头部(标题行): 60rpx
    const maxRecipes = Math.max(...weekPlans.map(p => p.recipes.length))
    const swiperHeight = 60 + maxRecipes * 212 + (maxRecipes - 1) * 16

    this.setData({
      ...MOCK_PLAN,
      progressPercent,
      weekPlans,
      currentDay: 0,
      swiperHeight,
      allDone: weekPlans[0].recipes.every(r => !!r.done)
    })
  },

  onSwiperChange(e) {
    const idx = e.detail.current
    const weekPlans = this.data.weekPlans
    this.setData({
      currentDay: idx,
      allDone: weekPlans[idx].recipes.every(r => !!r.done)
    })
  },

  handleBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) { wx.navigateBack(); return }
    wx.switchTab({ url: "/pages/diet/index" })
  },

  toggleAllDone() {
    const { currentDay, weekPlans } = this.data
    const nextDone = !this.data.allDone
    const plans = weekPlans.map((plan, i) => {
      if (i !== currentDay) return plan
      return { ...plan, recipes: plan.recipes.map(r => ({ ...r, done: nextDone })) }
    })
    this.setData({ weekPlans: plans, allDone: nextDone })
  },

  toggleRecipeDone(e) {
    const { id } = e.currentTarget.dataset
    const { checked } = e.detail
    const { currentDay, weekPlans } = this.data
    const plans = weekPlans.map((plan, i) => {
      if (i !== currentDay) return plan
      const recipes = plan.recipes.map(r => r.id === id ? { ...r, done: checked } : r)
      return { ...plan, recipes }
    })
    this.setData({
      weekPlans: plans,
      allDone: plans[currentDay].recipes.every(r => !!r.done)
    })
  },

  adjustPlan() { wx.navigateTo({ url: "/pages/diet-plan/index" }) },
  buyAll() { wx.switchTab({ url: "/pages/mall/index" }) },
  openRecipe(e) {
    const { id } = e.currentTarget.dataset
    wx.showToast({ title: `演示版：${id}详情待接入`, icon: "none" })
  }
})
