const { getLayoutMetrics } = require("../../utils/layout")
const { navigateToReport } = require("../../utils/navigateReport")
const { get } = require("../../utils/request")
const { fetchUserInfo, loadUserInfoFromStorage } = require("../../http/auth")
const paths = require("../../http/paths")

const CURRENT_PLAN_CHIP_BG = "/assets/profile-pages/vip/current_img@2x.png"
const RECOMMEND_PLAN_CHIP_BG = "/assets/profile-pages/vip/recommend_img@2x.png"

const DEFAULT_MEMBER_PLANS = [
  {
    id: "normal",
    title: "当前：普通会员",
    price: 0,
    unit: "",
    dark: false,
    chipBg: CURRENT_PLAN_CHIP_BG
  },
  {
    id: "gold",
    title: "推荐：黄金会员",
    price: 99,
    unit: "/月",
    dark: true,
    chipBg: RECOMMEND_PLAN_CHIP_BG
  },
  {
    id: "diamond",
    title: "钻石会员",
    price: 999,
    unit: "/年",
    dark: true,
    chipBg: RECOMMEND_PLAN_CHIP_BG
  }
]

const MOCK_PROFILE_DATA = {
  pageTitle: "个人中心",
  user: {
    nickname: "西兰花护体专员",
    avatarUrl: "",
    userId: "20260327",
    memberLevel: "普通会员",
    points: 1280
  },
  quickEntry: {
    name: "会员签到",
    icon: "/assets/profile/home.png"
  },
  stats: [
    { label: "收藏配方", value: 12 },
    { label: "历史订单", value: 8 },
    { label: "优惠券", value: 5 },
    { label: "推荐好友", value: 3 }
  ],
  featureMenus: [
    { name: "我的食养计划", icon: "/assets/profile/plan.png" },
    { name: "我的体质报告", icon: "/assets/profile/report.png" },
    { name: "视觉AI分析报告", icon: "/assets/profile/report.png" },
    { name: "我的订单", icon: "/assets/profile/order.png" },
    { name: "我的收藏", icon: "/assets/profile/collection.png" },
    { name: "优惠券", icon: "/assets/profile-pages/coupon_icon.png" },
    { name: "积分兑换", icon: "/assets/profile/points.png" },
    { name: "邀请好友", icon: "/assets/profile/share.png" },
    { name: "设置", icon: "/assets/profile/settings.png" },
    { name: "帮助中心", icon: "/assets/profile/help.png" },
    { name: "关于我们", icon: "/assets/profile/about.png" }
  ]
}

const PROFILE_PAGE_ROUTE_MAP = {
  我的订单: "/pages/my-orders/index",
  我的收藏: "/pages/my-favorites/index",
  优惠券: "/pages/my-coupons/index",
  优惠卷: "/pages/my-coupons/index",
  积分兑换: "/pages/points-exchange/index",
  邀请好友: "/pages/invite-friends/index",
  设置: "/pages/settings/index",
  帮助中心: "/pages/help-center/index",
  关于我们: "/pages/about-us/index",
  我的食养计划: "/pages/my-week-plan/index"
}

const PROFILE_STAT_ROUTE_MAP = {
  收藏配方: "/pages/my-favorites/index",
  历史订单: "/pages/my-orders/index",
  优惠券: "/pages/my-coupons/index",
  优惠卷: "/pages/my-coupons/index",
  推荐好友: "/pages/invite-friends/index"
}

const PROFILE_REPORT_MENU_MAP = {
  我的体质报告: { title: "我的体质报告", key: "questionnaireReportUrl" },
  视觉AI分析报告: { title: "视觉AI分析报告", key: "aiReportUrl" }
}

function cloneDeep(value) {
  return JSON.parse(JSON.stringify(value))
}

function toStatNumber(value, fallback = 0) {
  if (value == null || value === "") return fallback
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function buildProfileStats(stat) {
  const safeStat = stat && typeof stat === "object" ? stat : {}
  return [
    { label: "收藏配方", value: toStatNumber(safeStat.favoriteRecipeCount, 0) },
    { label: "历史订单", value: toStatNumber(safeStat.historyOrderCount, 0) },
    { label: "优惠券", value: toStatNumber(safeStat.couponCount, 0) },
    { label: "推荐好友", value: toStatNumber(safeStat.referralCount, 0) }
  ]
}

function fetchProfileData() {
  const fallback = cloneDeep(MOCK_PROFILE_DATA)
  return fetchUserInfo()
    .then((res) => {
      const profile = res && res.data && typeof res.data === "object" ? res.data : {}
      fallback.stats = buildProfileStats(profile.stat)
      return fallback
    })
    .catch(() => fallback)
}

function sortBySortField(list) {
  return list.slice().sort((a, b) => {
    const aSort = a && a.sort != null ? Number(a.sort) : 0
    const bSort = b && b.sort != null ? Number(b.sort) : 0
    return aSort - bSort
  })
}

function toDisplayPrice(rawValue, fallback = 0) {
  if (rawValue == null || rawValue === "") return fallback
  const num = Number(rawValue)
  if (!Number.isFinite(num)) return fallback
  return Number.isInteger(num) ? num : Number(num.toFixed(2))
}

function toDisplayBillingCycle(rawCycle) {
  if (rawCycle == null || rawCycle === "") return ""
  const cycle = String(rawCycle)
  const cycleMap = {
    DAY: "日",
    MONTH: "月",
    YEAR: "年"
  }
  return cycleMap[cycle.toUpperCase()] || cycle
}

function normalizeBenefitItems(rawList) {
  const source = Array.isArray(rawList) ? rawList : []
  return sortBySortField(source)
    .map((item) => {
      if (typeof item === "string") return item
      if (!item || typeof item !== "object") return ""
      return item.text || item.name || item.title || ""
    })
    .filter(Boolean)
}

function normalizePerkItems(rawList) {
  const source = Array.isArray(rawList) ? rawList : []
  return sortBySortField(source)
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const label = item.text || item.name || item.title || ""
      if (!label) return null
      return {
        icon: item.iconUrl || "",
        label
      }
    })
    .filter(Boolean)
}

function buildMemberPlansFromUpgradePage(payload, fallbackPlans) {
  const upgradeData = payload && typeof payload === "object" ? payload : {}
  const planSource = Array.isArray(upgradeData.levelList) ? upgradeData.levelList : []

  if (!planSource.length) {
    const currentName =
      (upgradeData.currentLevelBenefits && upgradeData.currentLevelBenefits.levelName) ||
      upgradeData.currentLevelName ||
      ""
    if (!currentName) return cloneDeep(fallbackPlans)
    const nextPlans = cloneDeep(fallbackPlans)
    if (nextPlans[0]) {
      nextPlans[0].title = `当前：${currentName}`
      nextPlans[0].chipBg = CURRENT_PLAN_CHIP_BG
      nextPlans[0].dark = false
    }
    return nextPlans
  }

  const currentLevelCode = upgradeData.currentLevelCode != null ? String(upgradeData.currentLevelCode) : ""
  const currentLevelId = upgradeData.currentLevelId != null ? String(upgradeData.currentLevelId) : ""

  const plans = planSource.map((item, index) => {
    const levelName = item.levelName || item.name || item.title || `会员等级${index + 1}`
    const planId = item.levelCode != null
      ? String(item.levelCode)
      : (item.levelId != null ? String(item.levelId) : String(item.id || `plan_${index + 1}`))
    const subscriptionPlan = item.subscriptionPlan && typeof item.subscriptionPlan === "object" ? item.subscriptionPlan : {}
    const billingCycle = toDisplayBillingCycle(subscriptionPlan.billingCycle)

    const isCurrent =
      item.currentLevel === true ||
      (currentLevelCode && item.levelId != null && String(item.levelId) === currentLevelCode) ||
      (currentLevelId && item.levelId != null && String(item.levelId) === currentLevelId)

    const isRecommended =
      subscriptionPlan.recommended === true ||
      subscriptionPlan.recommended === 1 ||
      String(subscriptionPlan.recommended).toLowerCase() === "true"

    return {
      id: planId,
      levelId: item.levelId != null ? String(item.levelId) : "",
      title: `${isCurrent ? "当前：" : (isRecommended ? "推荐：" : "")}${levelName}`,
      price: toDisplayPrice(subscriptionPlan.priceAmount, 0),
      unit: billingCycle ? `/${billingCycle}` : "",
      dark: !isCurrent,
      chipBg: isCurrent ? CURRENT_PLAN_CHIP_BG : RECOMMEND_PLAN_CHIP_BG,
      currentLevel: isCurrent,
      benefitItems: normalizeBenefitItems(item.benefitItemList),
      perkItems: normalizePerkItems(item.perkItemList)
    }
  })

  return plans.length ? plans : cloneDeep(fallbackPlans)
}

function pickPlanDetails(plans, selectedPlanId) {
  if (!Array.isArray(plans) || !plans.length) {
    return {
      memberBenefits: [],
      memberWelfares: []
    }
  }
  const matched = plans.find((item) => String(item.id) === String(selectedPlanId || "")) || plans[0]
  return {
    memberBenefits: Array.isArray(matched.benefitItems) ? matched.benefitItems : [],
    memberWelfares: Array.isArray(matched.perkItems) ? matched.perkItems : []
  }
}

function pickSelectedPlanId(plans, payload, fallbackSelectedPlanId) {
  if (!Array.isArray(plans) || !plans.length) return fallbackSelectedPlanId || ""

  const currentLevelCode = payload && payload.currentLevelCode != null ? String(payload.currentLevelCode) : ""
  const currentLevelId = payload && payload.currentLevelId != null ? String(payload.currentLevelId) : ""

  if (currentLevelCode) {
    const matchedByCode = plans.find((item) => String(item.levelId) === currentLevelCode)
    if (matchedByCode) return matchedByCode.id
  }
  if (currentLevelId) {
    const matchedById = plans.find((item) => String(item.levelId || item.id) === currentLevelId)
    if (matchedById) return matchedById.id
  }

  const currentPlan = plans.find((item) => item.currentLevel)
  if (currentPlan) return currentPlan.id

  const fallbackMatched = plans.find((item) => String(item.id) === String(fallbackSelectedPlanId || ""))
  if (fallbackMatched) return fallbackMatched.id

  return plans[0].id
}

Page({
  data: {
    topInset: 32,
    pageTitle: "",
    user: {},
    quickEntry: {},
    stats: [],
    featureMenus: [],
    showMemberSheet: false,
    selectedMemberPlanId: "normal",
    memberPlans: cloneDeep(DEFAULT_MEMBER_PLANS),
    memberBenefits: [],
    memberWelfares: [],
    upgradePageFetchSuccess: false,
    memberFaqs: [
      {
        id: "f1",
        q: "Q：会员可以退款吗?",
        a: "A：开通后7天内未使用任何会员权益可申请全额退。"
      },
      {
        id: "f2",
        q: "Q：积分如何使用?",
        a: "A：积分可在商城购物时抵扣现金，100积分=1元。"
      },
      {
        id: "f3",
        q: "Q：会员到期后怎么办?",
        a: "A：到期后自动转为普通会员，可随时续费恢复权益。"
      }
    ]
  },
  onLoad() {
    this.syncLayout()
  },
  onShow() {
    this.refreshProfileDataAndUI({ showLoading: true })
    if (typeof this.getTabBar === "function") {
      const tabBar = this.getTabBar()
      if (tabBar) {
        tabBar.setData({ selected: 3 })
      }
    }
  },
  onUnload() {
    this.hidePageLoading()
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
  refreshProfileDataAndUI(options = {}) {
    const { showLoading = false } = options
    if (showLoading) {
      this.showPageLoading()
    }

    if (this._profileRefreshPromise) {
      this._profileRefreshPending = true
      return this._profileRefreshPromise.finally(() => {
        if (showLoading) {
          this.hidePageLoading()
        }
      })
    }

    this.syncLayout()
    this.syncUserInfo({ fallbackToStorage: true })

    this._profileRefreshPromise = Promise.all([
      // 基础 UI 数据（统计、菜单等）每次返回“我的”页都重新刷新
      this.loadPageData().catch(() => {}),
      this.loadUpgradePageData({ force: true }).catch(() => {})
    ])
      .then(() => {
        // 以积分中心数据为准，避免“我的”页显示旧积分
        return this.loadPointsCenterData().catch(() => {})
      })
      .finally(() => {
        this._profileRefreshPromise = null
        if (this._profileRefreshPending) {
          this._profileRefreshPending = false
          this.refreshProfileDataAndUI()
        }
        if (showLoading) {
          this.hidePageLoading()
        }
      })

    return this._profileRefreshPromise
  },
  loadPointsCenterData() {
    return get(paths.member.pointsCenter).then((res) => {
      const d = (res && res.data) || {}
      const profile = d.profile && typeof d.profile === "object" ? d.profile : {}
      const patch = {}
      const avatarUrl = d.avatarUrl || profile.avatarUrl || ""
      if (avatarUrl) {
        patch["user.avatarUrl"] = avatarUrl
      }
      const nickName = d.nickName || d.nickname || profile.nickName || profile.nickname || ""
      if (nickName) {
        patch["user.nickname"] = nickName
      }
      if (d.currentLevelName) {
        patch["user.memberLevel"] = d.currentLevelName
      }
      if (d.availablePoints != null && d.availablePoints !== "") {
        patch["user.points"] = Number(d.availablePoints) || 0
      }

      if (Object.keys(patch).length) {
        this.setData(patch)
      }
      return d
    })
  },
  syncLayout() {
    const { statusBarHeight } = getLayoutMetrics()
    this.setData({
      topInset: Math.max(statusBarHeight + 12, 32)
    })
  },
  async loadPageData() {
    const payload = await fetchProfileData()
    this.setData(payload)
    this.syncUserInfo()
    if (this._upgradePagePayload) {
      this.applyUpgradePageData(this._upgradePagePayload)
    }
  },
  syncUserInfo({ fallbackToStorage = false } = {}) {
    const app = getApp()
    let userInfo = (app && app.globalData && app.globalData.userInfo) || {}
    if (
      fallbackToStorage &&
      (!userInfo || typeof userInfo !== "object" || !Object.keys(userInfo).length)
    ) {
      userInfo = loadUserInfoFromStorage() || {}
    }
    this._userInfo = userInfo

    const profile = userInfo.profile && typeof userInfo.profile === "object" ? userInfo.profile : {}
    const memberInfo = userInfo.memberInfo || {}
    const patch = {
      "user.avatarUrl":
        profile.avatarUrl ||
        profile.avatar ||
        userInfo.avatarUrl ||
        userInfo.avatar ||
        userInfo.headImgUrl ||
        userInfo.headImg ||
        "",
      "user.userId": userInfo.userId || "",
      "user.memberLevel": memberInfo.currentLevelName || "普通会员",
      "user.points": memberInfo.totalPoints != null ? memberInfo.totalPoints : 0
    }

    const nickName = profile.nickName || profile.nickname || userInfo.nickName || userInfo.nickname || ""
    if (nickName) {
      patch["user.nickname"] = nickName
    }

    this.setData(patch)
  },
  loadUpgradePageData({ force = false, showLoading = false } = {}) {
    if (this._upgradePageRequestPromise) {
      return this._upgradePageRequestPromise
    }

    if (!force && this.data.upgradePageFetchSuccess && this._upgradePagePayload) {
      return Promise.resolve(this._upgradePagePayload)
    }

    if (showLoading) {
      wx.showLoading({ title: "加载中", mask: true })
    }

    this._upgradePageRequestPromise = get(paths.member.upgradePage)
      .then((res) => {
        const payload = (res && res.data) || {}
        this._upgradePagePayload = payload
        this.applyUpgradePageData(payload)
        this.setData({ upgradePageFetchSuccess: true })
        return payload
      })
      .catch((err) => {
        this.setData({ upgradePageFetchSuccess: false })
        return Promise.reject(err)
      })
      .finally(() => {
        if (showLoading) {
          wx.hideLoading()
        }
        this._upgradePageRequestPromise = null
      })

    return this._upgradePageRequestPromise
  },
  applyUpgradePageData(payload) {
    const upgradeData = payload && typeof payload === "object" ? payload : {}
    const nextPlans = buildMemberPlansFromUpgradePage(upgradeData, this.data.memberPlans)
    const nextSelectedPlanId = pickSelectedPlanId(nextPlans, upgradeData, this.data.selectedMemberPlanId)
    const planDetails = pickPlanDetails(nextPlans, nextSelectedPlanId)

    const patch = {
      memberPlans: nextPlans,
      selectedMemberPlanId: nextSelectedPlanId,
      memberBenefits: planDetails.memberBenefits,
      memberWelfares: planDetails.memberWelfares
    }

    if (upgradeData.userId != null) {
      patch["user.userId"] = String(upgradeData.userId)
    }
    if (upgradeData.nickName) {
      patch["user.nickname"] = upgradeData.nickName
    }

    const memberLevelName =
      (upgradeData.currentLevelBenefits && upgradeData.currentLevelBenefits.levelName) ||
      upgradeData.currentLevelName ||
      ""
    if (memberLevelName) {
      patch["user.memberLevel"] = memberLevelName
    }

    const totalPoints =
      upgradeData.totalPoints != null
        ? upgradeData.totalPoints
        : (upgradeData.availablePoints != null ? upgradeData.availablePoints : null)

    if (totalPoints != null && totalPoints !== "") {
      patch["user.points"] = Number(totalPoints) || 0
    }

    this.setData(patch)
  },
  openItem(e) {
    const { name } = e.currentTarget.dataset
    if (name === "会员升级") {
      this.openMemberSheet()
      return
    }

    const reportConfig = PROFILE_REPORT_MENU_MAP[name]
    if (reportConfig) {
      const userInfo = this._userInfo || {}
      const reportUrl = userInfo[reportConfig.key] || ""
      if (!reportUrl) {
        wx.showToast({
          title: "报告地址为空",
          icon: "none"
        })
        return
      }
      navigateToReport(reportConfig.title, reportUrl)
      return
    }

    const url = PROFILE_PAGE_ROUTE_MAP[name]
    if (url) {
      wx.navigateTo({ url })
      return
    }
    wx.showToast({
      title: `${name}功能待接入`,
      icon: "none"
    })
  },
  openStatItem(e) {
    const { label } = e.currentTarget.dataset
    const url = PROFILE_STAT_ROUTE_MAP[label]
    if (url) {
      wx.navigateTo({ url })
      return
    }
    wx.showToast({
      title: `${label}功能待接入`,
      icon: "none"
    })
  },
  openMemberSheet() {
    if (this.data.upgradePageFetchSuccess) {
      if (this._upgradePagePayload) {
        this.applyUpgradePageData(this._upgradePagePayload)
      }
      this.setData({ showMemberSheet: true })
      return
    }

    this.loadUpgradePageData({ force: true, showLoading: true })
      .catch(() => {})
      .finally(() => {
        this.setData({ showMemberSheet: true })
      })
  },
  closeMemberSheet() {
    this.setData({ showMemberSheet: false })
  },
  selectMemberPlan(e) {
    const { id } = e.currentTarget.dataset
    const planDetails = pickPlanDetails(this.data.memberPlans, id)
    this.setData({
      selectedMemberPlanId: id,
      memberBenefits: planDetails.memberBenefits,
      memberWelfares: planDetails.memberWelfares
    })
  },
  confirmMemberUpgrade() {
    const current = this.data.memberPlans.find((item) => item.id === this.data.selectedMemberPlanId)
    if (!current) return
    wx.showToast({
      title: `已选择${current.title}，支付流程待接入`,
      icon: "none"
    })
  },
  noop() {}
})
