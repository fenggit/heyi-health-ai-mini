const { get } = require("../../utils/request")
const paths = require("../../http/paths")
const { getLayoutMetrics } = require("../../utils/layout")

const DEFAULT_TITLE = "我的食养计划"
const MEAL_ICON_MAP = {
  BREAKFAST: "/assets/diet-plan/icon_breakfast.png",
  LUNCH: "/assets/diet-plan/icon_lunch.png",
  DINNER: "/assets/diet-plan/icon_dinner.png",
  早餐: "/assets/diet-plan/icon_breakfast.png",
  午餐: "/assets/diet-plan/icon_lunch.png",
  晚餐: "/assets/diet-plan/icon_dinner.png"
}

function normalizeText(value) {
  if (value === undefined || value === null) return ""
  return String(value).trim()
}

function toPositiveInt(value, fallback = 0) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return fallback
  return Math.floor(num)
}

function unwrapResponseData(res) {
  if (res && Object.prototype.hasOwnProperty.call(res, "data")) {
    return res.data
  }
  return res
}

function parseTagList(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.map(normalizeText).filter(Boolean)
  }

  const text = normalizeText(rawValue)
  if (!text) return []

  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeText).filter(Boolean)
    }
  } catch (e) {}

  return text.split(/[、,，]/).map(normalizeText).filter(Boolean)
}

function formatMonthDay(dateText) {
  const text = normalizeText(dateText)
  const match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!match) return text
  return `${Number(match[2])}月${Number(match[3])}日`
}

function buildPreferencesDesc(plan) {
  const preferenceText = normalizeText(plan && plan.preferencesDesc)
  if (preferenceText) return preferenceText

  if (!Array.isArray(plan && plan.preferences)) return ""
  return plan.preferences.map(normalizeText).filter(Boolean).join("·")
}

function buildReminder(mealTimes) {
  if (!Array.isArray(mealTimes) || !mealTimes.length) return ""
  return "今日提醒：请提前准备食材"
}

function getCycleLabel(planType, totalDays) {
  if (normalizeText(planType) === "SEVEN_DAY") return "计划"
  if (totalDays > 0) return "计划"
  return "计划"
}

function getPlanStatusText(planStatus) {
  switch (normalizeText(planStatus)) {
    case "COMPLETED":
      return "已完成"
    case "ACTIVE":
      return "进行中"
    default:
      return "未开始"
  }
}

function getDayStatusText(dayNo, currentDayNo) {
  if (dayNo === currentDayNo) return "进行中"
  if (dayNo < currentDayNo) return "已结束"
  if (dayNo > currentDayNo) return "未开始"
  return ""
}

function getEmptyPlanState() {
  return {
    title: DEFAULT_TITLE,
    cycleLabel: "计划",
    reminder: "",
    progress: {
      day: 0,
      totalDays: 0,
      status: ""
    },
    progressPercent: 0,
    info: [],
    weekPlans: [],
    currentDay: 0,
    swiperHeight: 0,
    dayTagText: "",
    dayDotsPercent: 0,
    hasPlan: false,
    loading: true
  }
}

function buildInfoList(plan) {
  const cycleText = [normalizeText(plan && plan.startDate), normalizeText(plan && plan.endDate)]
    .filter(Boolean)
    .join(" 至 ")

  return [
    { label: "体质类型", value: normalizeText(plan && plan.constitutionType) },
    { label: "用餐时间", value: buildPreferencesDesc(plan) },
    { label: "计划周期", value: cycleText }
  ].filter((item) => item.value)
}

function normalizeRecipeItem(item, dayNo, index) {
  const mealType = normalizeText(item && item.mealType)
  const mealLabel = normalizeText(item && item.mealLabel) || mealType
  const baseId = normalizeText(item && item.id) || normalizeText(item && item.refId) || `${dayNo}_${index}`

  return {
    key: `${dayNo}_${mealType}_${baseId}_${index}`,
    name: normalizeText(item && item.refName),
    tags: parseTagList(item && item.tagJson),
    meal: mealLabel,
    mealTime: normalizeText(item && item.mealTime),
    mealIcon: MEAL_ICON_MAP[mealType] || MEAL_ICON_MAP[mealLabel] || MEAL_ICON_MAP.早餐,
    coverImage: normalizeText(item && item.coverImage)
  }
}

function normalizeWeekPlans(plan, currentDayNo) {
  const days = Array.isArray(plan && plan.days) ? plan.days.slice() : []
  days.sort((left, right) => toPositiveInt(left && left.dayNo) - toPositiveInt(right && right.dayNo))

  return days.map((day, index) => {
    const dayNo = toPositiveInt(day && day.dayNo, index + 1)
    const recipes = Array.isArray(day && day.itemRefs)
      ? day.itemRefs.map((item, recipeIndex) => normalizeRecipeItem(item, dayNo, recipeIndex))
      : []

    return {
      dayNo,
      title: `第${dayNo}天（${formatMonthDay(day && day.planDate)}）`,
      status: getDayStatusText(dayNo, currentDayNo),
      recipes
    }
  })
}

function normalizePlanData(plan) {
  const days = Array.isArray(plan && plan.days) ? plan.days : []
  const totalDays = toPositiveInt(plan && plan.totalDays, days.length)
  const currentDayNo = Math.min(Math.max(toPositiveInt(plan && plan.currentDayNo, 1), 1), Math.max(totalDays, 1))
  const weekPlans = normalizeWeekPlans(plan, currentDayNo)

  return {
    title: DEFAULT_TITLE,
    cycleLabel: getCycleLabel(plan && plan.planType, totalDays),
    reminder: buildReminder(plan && plan.mealTimes),
    progress: {
      day: currentDayNo,
      totalDays,
      status: getPlanStatusText(plan && plan.planStatus)
    },
    progressPercent: totalDays ? Math.round((currentDayNo * 100) / totalDays) : 0,
    info: buildInfoList(plan),
    weekPlans,
    currentDay: Math.max(0, Math.min(currentDayNo - 1, Math.max(weekPlans.length - 1, 0))),
    swiperHeight: 0,
    dayTagText: totalDays ? `${totalDays}天食养方案` : "食养方案",
    dayDotsPercent: totalDays ? ((currentDayNo * 100) / totalDays) : 0,
    hasPlan: true,
    loading: false
  }
}

function getDayDotsPercent(currentIndex, totalDays) {
  const safeTotalDays = toPositiveInt(totalDays, 0)
  if (!safeTotalDays) return 0

  const safeIndex = Math.max(0, Number(currentIndex) || 0)
  return ((safeIndex + 1) * 100) / safeTotalDays
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
    ...getEmptyPlanState()
  },

  onLoad() {
    this.syncLayout()
  },

  onShow() {
    this.fetchCurrentPlan()
  },

  onUnload() {
    clearTimeout(this._swiperHeightTimer)
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

  async fetchCurrentPlan() {
    this.setData({ loading: true })

    try {
      const res = await get(paths.recipe.currentDietPlan, null, {
        showLoading: true,
        loadingTitle: "加载中"
      })
      const plan = unwrapResponseData(res)

      if (!plan || typeof plan !== "object" || !normalizeText(plan.id)) {
        this.setData({ ...getEmptyPlanState(), loading: false })
        wx.showToast({ title: "还没有制定计划", icon: "none" })
        return
      }

      const nextData = normalizePlanData(plan)
      this.setData(nextData, () => {
        this.updateSwiperHeight()
      })
    } catch (error) {
      this.setData({ loading: false })
    }
  },

  updateSwiperHeight(retryCount = 0) {
    if (!this.data.hasPlan || !this.data.weekPlans.length) return

    const selector = `#day-panel-${this.data.currentDay}`
    wx.createSelectorQuery()
      .in(this)
      .select(selector)
      .boundingClientRect((rect) => {
        if (rect && rect.height) {
          const nextHeight = Math.ceil(rect.height)
          if (nextHeight !== this.data.swiperHeight) {
            this.setData({ swiperHeight: nextHeight })
          }
          return
        }

        if (retryCount >= 3) return
        clearTimeout(this._swiperHeightTimer)
        this._swiperHeightTimer = setTimeout(() => {
          this.updateSwiperHeight(retryCount + 1)
        }, 80)
      })
      .exec()
  },

  onSwiperChange(e) {
    const idx = e.detail.current
    const totalDays = toPositiveInt(this.data.progress && this.data.progress.totalDays, this.data.weekPlans.length)
    this.setData({
      currentDay: idx,
      dayDotsPercent: getDayDotsPercent(idx, totalDays)
    }, () => {
      this.updateSwiperHeight()
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

  buyAll() {
    wx.switchTab({ url: "/pages/mall/index" })
  }
})
