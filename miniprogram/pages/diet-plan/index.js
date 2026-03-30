const { getLayoutMetrics } = require("../../utils/layout")

const STEP_NAMES = ["选择计划", "选择体质", "设置时间", "确认信息"]
const STEP_PREFIX = ["一", "二", "三", "四"]

const PLAN_TYPES = [
  { id: "week", name: "周计划", days: 7, desc: "7天食养方案", price: "29.9" },
  { id: "month", name: "月计划", days: 30, desc: "30天系统调理", price: "99.9" }
]

const CONSTITUTIONS = ["气虚质", "阴虚质", "湿热质", "阳虚质", "痰湿质", "平和质"]

const MEALS = [
  { id: "breakfast", name: "早餐", icon: "/assets/diet-plan/icon_breakfast.png", enabled: true, time: "08:00" },
  { id: "lunch", name: "午餐", icon: "/assets/diet-plan/icon_lunch.png", enabled: false, time: "" },
  { id: "dinner", name: "晚餐", icon: "/assets/diet-plan/icon_dinner.png", enabled: false, time: "" }
]

const MEAL_TIME_OPTIONS = {
  breakfast: ["07:00", "07:30", "08:00", "08:30", "09:00"],
  lunch: ["11:30", "12:00", "12:30", "13:00", "13:30"],
  dinner: ["17:30", "18:00", "18:30", "19:00", "19:30"]
}

const PREFERENCES = [
  { id: "vegetarian", label: "素食" },
  { id: "lowOil", label: "少油" },
  { id: "lowSugar", label: "低糖" },
  { id: "lowSalt", label: "低盐" },
  { id: "noSpicy", label: "无辣" },
  { id: "warm", label: "温热食物" },
  { id: "easyDigest", label: "易消化" },
  { id: "highProtein", label: "高蛋白" }
]

function buildStepMeta(step) {
  return {
    step,
    stepName: STEP_NAMES[step - 1],
    stepPrefix: STEP_PREFIX[step - 1],
    stepPercent: Math.round((step * 100) / STEP_NAMES.length)
  }
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

    steps: STEP_NAMES,
    step: 1,
    stepName: STEP_NAMES[0],
    stepPrefix: STEP_PREFIX[0],
    stepPercent: 25,

    planTypes: PLAN_TYPES,
    selectedPlan: "week",

    constitutions: CONSTITUTIONS,
    selectedConstitution: "",

    meals: MEALS,

    preferences: PREFERENCES,
    selectedPreferences: ["lowOil", "lowSugar", "highProtein"],
    remark: "",

    summary: {
      planText: "周计划 (7天)",
      constitutionText: "未选择",
      preferenceText: "3项",
      mealTimeText: "08:00 / 12:00",
      price: "29.9"
    }
  },

  onLoad() {
    this.syncLayout()
    this.updateDerivedData()
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

  syncStep(step) {
    this.setData(buildStepMeta(step))
  },

  updateDerivedData() {
    const { planTypes, selectedPlan, constitutions, selectedConstitution, meals, preferences, selectedPreferences } = this.data
    const selectedPlanItem = planTypes.find((item) => item.id === selectedPlan) || planTypes[0]
    const constitutionText = selectedConstitution
      ? constitutions.find((item) => item === selectedConstitution) || selectedConstitution
      : "未选择"
    const preferenceText = `${selectedPreferences.length}项`
    const selectedMealTimes = meals.filter((item) => item.enabled && item.time).map((item) => item.time)
    const mealTimeText = selectedMealTimes.length ? selectedMealTimes.join(" / ") : "未设置"
    const selectedLabels = preferences
      .filter((item) => selectedPreferences.includes(item.id))
      .map((item) => item.label)

    this.setData({
      summary: {
        planText: `${selectedPlanItem.name} (${selectedPlanItem.days}天)`,
        constitutionText,
        preferenceText,
        preferenceLabels: selectedLabels,
        mealTimeText,
        price: selectedPlanItem.price
      }
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

  choosePlanType(e) {
    const { id } = e.currentTarget.dataset
    if (!id || id === this.data.selectedPlan) return
    this.setData({ selectedPlan: id }, () => this.updateDerivedData())
  },

  chooseConstitution(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    this.setData({ selectedConstitution: id }, () => this.updateDerivedData())
  },

  goAnalysis() {
    wx.navigateTo({ url: "/pages/analysis/index" })
  },

  toggleMeal(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    const meals = this.data.meals.map((item) => {
      if (item.id !== id) return item
      const enabled = !item.enabled
      const fallbackOptions = MEAL_TIME_OPTIONS[id] || []
      const time = enabled && !item.time ? fallbackOptions[0] || "" : item.time
      return {
        ...item,
        enabled,
        time
      }
    })
    this.setData({ meals }, () => this.updateDerivedData())
  },

  pickMealTime(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    const options = MEAL_TIME_OPTIONS[id] || []
    if (!options.length) return

    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        const selectedTime = options[res.tapIndex]
        const meals = this.data.meals.map((item) =>
          item.id === id
            ? {
                ...item,
                enabled: true,
                time: selectedTime
              }
            : item
        )
        this.setData({ meals }, () => this.updateDerivedData())
      }
    })
  },

  togglePreference(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return

    const selected = new Set(this.data.selectedPreferences)
    if (selected.has(id)) {
      selected.delete(id)
    } else {
      selected.add(id)
    }

    this.setData(
      {
        selectedPreferences: Array.from(selected)
      },
      () => this.updateDerivedData()
    )
  },

  onRemarkInput(e) {
    this.setData({
      remark: (e.detail && e.detail.value) || ""
    })
  },

  prevStep() {
    if (this.data.step <= 1) return
    this.syncStep(this.data.step - 1)
  },

  nextStep() {
    const { step, selectedConstitution, meals } = this.data

    if (step === 2 && !selectedConstitution) {
      wx.showToast({
        title: "请先选择体质",
        icon: "none"
      })
      return
    }

    if (step === 3) {
      const hasMeal = meals.some((item) => item.enabled && item.time)
      if (!hasMeal) {
        wx.showToast({
          title: "请至少设置一个用餐时间",
          icon: "none"
        })
        return
      }
    }

    if (step >= 4) {
      this.confirmPlan()
      return
    }

    this.syncStep(step + 1)
  },

  confirmPlan() {
    wx.showToast({
      title: "定制成功",
      icon: "success"
    })

    setTimeout(() => {
      wx.redirectTo({
        url: "/pages/my-plan/index"
      })
    }, 350)
  }
})
