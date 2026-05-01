const { getLayoutMetrics } = require("../../utils/layout")
const { getGuestToken } = require("../../http/auth")
const { get } = require("../../utils/request")
const paths = require("../../http/paths")

function createProgressSegments(filled, total) {
  return Array.from({ length: total }, (_, index) => ({
    id: index,
    active: index < filled
  }))
}

const DEFAULT_HOME_DATA = {
  greetingTitle: "天元食养",
  greetingText: "早上好，开启健康新一天~",
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
  healthStatus: {
    title: "今日身体状况：",
    level: "良好"
  },
  healthMetrics: [
    {
      id: "heart-rate",
      label: "心率",
      value: "-",
      icon: "/assets/icons/heart.png"
    },
    {
      id: "steps",
      label: "步数",
      value: "-",
      icon: "/assets/icons/steps.png"
    },
    {
      id: "sleep",
      label: "睡眠",
      value: "-",
      icon: "/assets/icons/sleep.png"
    }
  ],
  hydration: {
    title: "-",
    value: "-/-",
    segments: createProgressSegments(0, 10)
  },
  shortcuts: [
    {
      id: "analysis",
      title: "AI趣味分析",
      description: "3分钟分析生活趋势",
      styleType: "robot",
      bgImage: "/assets/home/shortcut_bg_left.png",
      checkCircle: "/assets/home/shortcut_icon_circle_left.png",
      checkTick: "/assets/home/shortcut_icon_tick_left.png",
      path: "/pages/analysis/index"
    },
    {
      id: "constitution",
      title: "AI体质测评",
      description: "个性化推荐食养方案",
      styleType: "bubble",
      bgImage: "/assets/home/shortcut_bg_right.png",
      checkCircle: "/assets/home/shortcut_icon_circle_right.png",
      checkTick: "/assets/home/shortcut_icon_tick_right.png",
      path: "/pages/qr-page/index"
    }
  ],
  recommendation: {
    recipeId: "",
    title: "AI推荐：今日专属果蔬汁",
    actionText: "查看详情",
    image: "/assets/test/home-banner2.png",
    name: "养胃气血汁",
    description: "根据您的体质特点，推荐富含铁质和维生素C的配方，有助于补血养气，改善春季疲乏。",
    tags: ["补气血", "养脾胃"]
  },
  tip: {
    title: "今日养生提示",
    content: "春季养肝正当时，建议多食用绿叶蔬菜和柑橘类水果，早睡早起，适当运动，保持心情舒畅。"
  }
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

function normalizeList(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== "object") return []

  const listKeys = ["list", "items", "Items", "records", "rows", "result"]
  for (const key of listKeys) {
    if (Array.isArray(data[key])) return data[key]
  }
  return []
}

function normalizeHealthMetricValue(value, { sleep = false } = {}) {
  const fallback = "-"
  if (value === null || value === undefined || value === "") return fallback

  const text = String(value).trim()
  if (!text) return fallback
  return text
}

function pickTodayBodyStatus(payload = {}) {
  if (payload.todayBodyStatus && typeof payload.todayBodyStatus === "object") {
    return payload.todayBodyStatus
  }
  return {}
}

function normalizeRatioPart(value) {
  if (value === null || value === undefined || value === "") return "-"
  const text = String(value).trim()
  return text || "-"
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

function parseCustomTagList(customTags) {
  if (Array.isArray(customTags)) {
    return customTags
      .map((item) => {
        if (!item || typeof item !== "object") return ""
        return item.tagName || ""
      })
      .map((item) => String(item || "").trim())
      .filter(Boolean)
  }

  if (customTags && typeof customTags === "object") {
    const tagName = String(customTags.tagName || "").trim()
    return tagName ? [tagName] : []
  }

  return []
}

function mapBannerList(rawBannerList) {
  const list = normalizeList(rawBannerList)
  return list
    .map((item) => {
      const row = item && typeof item === "object" ? item : {}
      const image = toDisplayText(row.bannerImage, "")
      if (!image) return null

      const id = toDisplayText(row.id, "")

      return {
        id,
        image
      }
    })
    .filter(Boolean)
}

function mapHealthStatus(payload = {}) {
  const status = payload.healthStatus && typeof payload.healthStatus === "object" ? payload.healthStatus : {}
  return {
    title: toDisplayText(status.title || payload.healthStatusTitle, DEFAULT_HOME_DATA.healthStatus.title),
    level: toDisplayText(status.level || payload.healthLevel || payload.healthStatusLevel, DEFAULT_HOME_DATA.healthStatus.level)
  }
}

function mapHealthMetrics(payload = {}) {
  const defaults = cloneDeep(DEFAULT_HOME_DATA.healthMetrics)
  const metricMap = {
    "heart-rate": defaults[0],
    steps: defaults[1],
    sleep: defaults[2]
  }
  const todayBodyStatus = pickTodayBodyStatus(payload)

  const list = normalizeList(payload.healthMetrics || payload.healthMetricList || payload.todayHealthMetrics)
  if (list.length) {
    list.forEach((item) => {
      const row = item && typeof item === "object" ? item : {}
      const keyText = String(
        row.id || row.metricKey || row.metricCode || row.name || row.label || ""
      ).toLowerCase()

      let key = ""
      if (/heart|心率/.test(keyText)) key = "heart-rate"
      if (/step|步数/.test(keyText)) key = "steps"
      if (/sleep|睡眠/.test(keyText)) key = "sleep"
      if (!key) return

      const target = metricMap[key]
      if (!target) return

      if (row.label || row.metricName || row.name) {
        target.label = toDisplayText(row.label || row.metricName || row.name, target.label)
      }
      if (row.iconUrl || row.icon) {
        target.icon = toDisplayText(row.iconUrl || row.icon, target.icon)
      }
      target.value = normalizeHealthMetricValue(
        row.value != null ? row.value : row.metricValue,
        { sleep: key === "sleep" }
      )
    })
  } else {
    defaults[0].value = normalizeHealthMetricValue(
      todayBodyStatus.heartRate != null ? todayBodyStatus.heartRate : (payload.heartRate != null ? payload.heartRate : payload.hr)
    )
    defaults[1].value = normalizeHealthMetricValue(
      todayBodyStatus.stepCount != null ? todayBodyStatus.stepCount : (payload.stepCount != null ? payload.stepCount : payload.steps)
    )
    defaults[2].value = normalizeHealthMetricValue(
      todayBodyStatus.sleepHours != null ? todayBodyStatus.sleepHours : (payload.sleepHours != null ? payload.sleepHours : payload.sleepDuration),
      { sleep: true }
    )
  }

  return defaults
}

function mapHydration(payload = {}) {
  const todayBodyStatus = pickTodayBodyStatus(payload)
  const hydration = payload.hydration && typeof payload.hydration === "object" ? payload.hydration : {}
  const actualIntake = todayBodyStatus.todayJuiceActualIntake != null
    ? todayBodyStatus.todayJuiceActualIntake
    : hydration.actualIntake
  const targetIntake = todayBodyStatus.todayJuiceTargetIntake != null
    ? todayBodyStatus.todayJuiceTargetIntake
    : hydration.targetIntake
  const juiceUnit = toDisplayText(todayBodyStatus.juiceUnit != null ? todayBodyStatus.juiceUnit : hydration.juiceUnit, "")
  const actualNumber = Number(actualIntake)
  const targetNumber = Number(targetIntake)

  if (Number.isFinite(targetNumber) && targetNumber > 0 && Number.isFinite(actualNumber)) {
    const hydrationProgress = Math.max(0, Math.min(100, Math.round((actualNumber * 100) / targetNumber)))

    return {
      data: {
        title: normalizeRatioPart(actualIntake),
        value: `${normalizeRatioPart(actualIntake)}/${normalizeRatioPart(targetIntake)}${juiceUnit}`,
        segments: createProgressSegments(0, 10)
      },
      progress: hydrationProgress
    }
  }

  const total = Number(hydration.totalSegments)
  const filled = Number(hydration.filledSegments)

  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(filled)) {
    return {
      data: {
        title: normalizeRatioPart(actualIntake) === "-" ? toDisplayText(hydration.title, DEFAULT_HOME_DATA.hydration.title) : normalizeRatioPart(actualIntake),
        value: normalizeRatioPart(actualIntake) === "-" && normalizeRatioPart(targetIntake) === "-"
          ? toDisplayText(hydration.value, DEFAULT_HOME_DATA.hydration.value)
          : `${normalizeRatioPart(actualIntake)}/${normalizeRatioPart(targetIntake)}${juiceUnit}`,
        segments: cloneDeep(DEFAULT_HOME_DATA.hydration.segments)
      },
      progress: 0
    }
  }

  const totalSegments = total
  const filledSegments = Math.max(0, Math.min(totalSegments, filled))
  const segments = createProgressSegments(filledSegments, totalSegments)
  const hydrationProgress = Math.round((filledSegments * 100) / totalSegments)

  return {
    data: {
      title: normalizeRatioPart(actualIntake) === "-" ? toDisplayText(hydration.title, DEFAULT_HOME_DATA.hydration.title) : normalizeRatioPart(actualIntake),
      value: normalizeRatioPart(actualIntake) === "-" && normalizeRatioPart(targetIntake) === "-"
        ? toDisplayText(hydration.value, DEFAULT_HOME_DATA.hydration.value)
        : `${normalizeRatioPart(actualIntake)}/${normalizeRatioPart(targetIntake)}${juiceUnit}`,
      segments
    },
    progress: hydrationProgress
  }
}

function mapRecommendation(todayRecommend = {}) {
  const source = todayRecommend && typeof todayRecommend === "object" ? todayRecommend : {}
  const hasSource = Object.keys(source).length > 0
  if (!hasSource) return {}

  const tags = parseCustomTagList(source.customTags)
  const recipeIdRaw = source.recipeId != null ? source.recipeId : source.id
  const recipeId = recipeIdRaw != null && recipeIdRaw !== "" ? String(recipeIdRaw) : ""
  if (!recipeId) return {}

  return {
    recipeId,
    title: "AI推荐：今日专属果蔬汁",
    actionText: "查看详情",
    image: toDisplayText(source.bannerImage, ""),
    name: toDisplayText(source.recipeName || source.name, ""),
    description: toDisplayText(source.recommendReason || source.intro || source.description, ""),
    tags
  }
}

function mapTip(payload = {}) {
  const todayHealthTip = payload && payload.todayHealthTip
  const tipContent = typeof todayHealthTip === "object" && todayHealthTip !== null
    ? toDisplayText(todayHealthTip.content || todayHealthTip.tip || todayHealthTip.text, "")
    : toDisplayText(todayHealthTip, "")

  return {
    title: DEFAULT_HOME_DATA.tip.title,
    content: tipContent || DEFAULT_HOME_DATA.tip.content
  }
}

function normalizeHomePayload(payload = {}) {
  const source = payload && typeof payload === "object" ? payload : {}
  const hydration = mapHydration(source)

  return {
    greetingTitle: DEFAULT_HOME_DATA.greetingTitle,
    greetingText: DEFAULT_HOME_DATA.greetingText,
    activityBanners: mapBannerList(source.bannerList || source.activityBanners),
    healthStatus: mapHealthStatus(source),
    healthMetrics: mapHealthMetrics(source),
    hydration: hydration.data,
    hydrationProgress: hydration.progress,
    shortcuts: cloneDeep(DEFAULT_HOME_DATA.shortcuts),
    recommendation: mapRecommendation(source.todayRecommend),
    tip: mapTip(source)
  }
}

function fetchHomeData() {
  return get(paths.recipe.homeIndex).then((res) => normalizeHomePayload(unwrapResponseData(res)))
}

function createEmptyHomeData() {
  return {
    greetingTitle: "",
    greetingText: "",
    activityBanners: [],
    healthStatus: {
      title: DEFAULT_HOME_DATA.healthStatus.title,
      level: ""
    },
    healthMetrics: cloneDeep(DEFAULT_HOME_DATA.healthMetrics),
    hydration: {
      title: DEFAULT_HOME_DATA.hydration.title,
      value: "",
      segments: createProgressSegments(0, 10)
    },
    hydrationProgress: 0,
    shortcuts: cloneDeep(DEFAULT_HOME_DATA.shortcuts),
    recommendation: {},
    tip: {
      title: DEFAULT_HOME_DATA.tip.title,
      content: ""
    }
  }
}

Page({
  data: Object.assign({
    topInset: 32,
    bannerCurrent: 0
  }, createEmptyHomeData()),
  onLoad() {
    this._isPageAlive = true
    this._loadReqId = 0
    this._hasLoadedHomeDataSuccessfully = false
    this.syncLayout()
  },
  onShow() {
    if (typeof this.getTabBar === "function") {
      const tabBar = this.getTabBar()
      if (tabBar) {
        tabBar.setData({ selected: 0 })
      }
    }
    this.loadPageData({ showLoading: !this._hasLoadedHomeDataSuccessfully })
  },
  onUnload() {
    this._isPageAlive = false
    this.hidePageLoading()
  },
  safeSetData(nextData) {
    if (!this._isPageAlive) return
    this.setData(nextData)
  },
  showPageLoading(title = "加载中...") {
    if (this._pageLoadingVisible) return
    this._pageLoadingVisible = true
    wx.showLoading({
      title,
      mask: true
    })
  },
  hidePageLoading() {
    if (!this._pageLoadingVisible) return
    this._pageLoadingVisible = false
    wx.hideLoading()
  },
  syncLayout() {
    const { statusBarHeight } = getLayoutMetrics()
    this.safeSetData({
      topInset: Math.max(statusBarHeight + 12, 32)
    })
  },
  async loadPageData(options = {}) {
    const { showLoading = false } = options
    const reqId = (this._loadReqId || 0) + 1
    this._loadReqId = reqId
    if (showLoading) {
      this.showPageLoading()
    }
    try {
      const payload = await fetchHomeData()
      if (!this._isPageAlive || this._loadReqId !== reqId) return
      this._hasLoadedHomeDataSuccessfully = true
      this.safeSetData(payload)
    } catch (err) {
      console.warn("[home] 拉取首页接口失败，清空首页数据:", err)
      if (!this._isPageAlive || this._loadReqId !== reqId) return
      this.safeSetData(Object.assign({
        bannerCurrent: 0
      }, createEmptyHomeData()))
    } finally {
      if (showLoading && this._loadReqId === reqId) {
        this.hidePageLoading()
      }
    }
  },
  onBannerChange(e) {
    this.safeSetData({
      bannerCurrent: e.detail.current
    })
  },
  openActivityDetail(e) {
    const { id } = e.currentTarget.dataset
    if (id === undefined || id === null || id === "") return
    wx.navigateTo({
      url: `/pages/home-banner-detail/index?id=${encodeURIComponent(String(id))}`
    })
  },
  openShortcut(e) {
    const { path } = e.currentTarget.dataset
    if (!path) return

    // analysis 入口：未登录时先确保拿到 guestToken 再跳转
    if (path.indexOf('/pages/analysis/') !== -1) {
      const app = getApp()
      const isLogin = !!(app && app.globalData.isLogin)
      console.log('[home] 点击 analysis，当前登录状态:', isLogin ? '已登录' : '未登录')
      if (!isLogin) {
        wx.showLoading({ title: '准备中...', mask: true })
        getGuestToken({
          success: () => {
            wx.hideLoading()
            wx.navigateTo({ url: path })
          },
          fail: (err) => {
            wx.hideLoading()
            console.error('[home] 获取 guestToken 失败:', err)
            wx.showToast({ title: '网络异常，请重试', icon: 'none' })
          }
        })
        return
      }
    }

    wx.navigateTo({ url: path })
  },
  openIngredientPackDetail() {
    const recipeId = this.data && this.data.recommendation ? this.data.recommendation.recipeId : ""
    const query = recipeId ? `?recipeId=${encodeURIComponent(recipeId)}` : ""
    wx.navigateTo({
      url: `/pages/food-detail/index${query}`
    })
  }
})
