const { getLayoutMetrics } = require("../../utils/layout")
const { getCachedUserInfo, setCachedUserInfo } = require("../../http/auth")
const {
  createAssistantSession,
  getAssistantMessages,
  chatWithAssistant,
  extractSessionId,
  normalizeSessionId
} = require("../../http/assistant")

const STORAGE_ASSISTANT_SESSION_KEY = "assistantSessionId"
const DEFAULT_REPLY = "你可以用语音或文字告诉我你的需求，我会尽力帮你！"

const STATIC_PAGE_DATA = {
  title: "哈喽，我是小亿！",
  subTitle: "你的AI食养助手",
  capabilities: ["进行趣味性生活状态分析", "提供个性化饮食建议", "解答饮食健康问题", "快速访问各项功能"],
  noticeText: "提示: 本服务仅供娱乐与生活参考，不能替代医疗建议~",
  quickActions: [
    {
      id: "start-analysis",
      label: "开启趣味分析",
      path: "/pages/analysis/index",
      routeType: "navigate"
    },
    {
      id: "mall",
      label: "浏览食材商城",
      path: "/pages/mall/index",
      routeType: "tab"
    },
    {
      id: "diet",
      label: "查看我的计划",
      path: "/pages/my-week-plan/index",
      routeType: "navigate"
    },
    {
      id: "profile",
      label: "个人中心",
      path: "/pages/profile/index",
      routeType: "tab"
    }
  ]
}

function padClock(value) {
  return value < 10 ? `0${value}` : `${value}`
}

function formatClock(date = new Date()) {
  return `${padClock(date.getHours())}:${padClock(date.getMinutes())}`
}

function parseDateValue(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === "") return null

  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    const timestamp = rawValue < 1e12 ? rawValue * 1000 : rawValue
    const dateFromNumber = new Date(timestamp)
    return Number.isNaN(dateFromNumber.getTime()) ? null : dateFromNumber
  }

  const text = String(rawValue).trim()
  if (!text) return null

  if (/^\d+$/.test(text)) {
    const numeric = Number(text)
    if (Number.isFinite(numeric)) {
      const timestamp = numeric < 1e12 ? numeric * 1000 : numeric
      const dateFromTextNumber = new Date(timestamp)
      if (!Number.isNaN(dateFromTextNumber.getTime())) return dateFromTextNumber
    }
  }

  const dateFromString = new Date(text.replace(/-/g, "/"))
  if (!Number.isNaN(dateFromString.getTime())) return dateFromString

  return null
}

function formatServerClock(rawValue) {
  const parsedDate = parseDateValue(rawValue)
  if (parsedDate) return formatClock(parsedDate)

  if (typeof rawValue === "string") {
    const match = rawValue.match(/(\d{2}:\d{2})/)
    if (match && match[1]) return match[1]
  }

  return formatClock()
}

function createMessage(role, text, extras = {}) {
  return {
    id: `m${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    role,
    text,
    time: formatClock(),
    ...extras
  }
}

function extractProfileSessionId(userInfo) {
  const safeUserInfo = userInfo && typeof userInfo === "object" ? userInfo : {}
  const profile = safeUserInfo.profile && typeof safeUserInfo.profile === "object" ? safeUserInfo.profile : {}

  const candidates = [
    profile.sessionId,
    profile.sessionID,
    profile.SessionId,
    safeUserInfo.sessionId,
    safeUserInfo.sessionID,
    safeUserInfo.SessionId
  ]

  for (let i = 0; i < candidates.length; i += 1) {
    const normalized = normalizeSessionId(candidates[i])
    if (normalized !== "") return normalized
  }

  return ""
}

function readCachedSessionId() {
  return normalizeSessionId(wx.getStorageSync(STORAGE_ASSISTANT_SESSION_KEY))
}

function syncSessionIdToUserInfo(sessionId) {
  const normalizedSessionId = normalizeSessionId(sessionId)
  if (normalizedSessionId === "") return

  const app = getApp()
  const globalUserInfo = app && app.globalData ? app.globalData.userInfo : null
  const cachedUserInfo = getCachedUserInfo()
  const baseUserInfo =
    (globalUserInfo && typeof globalUserInfo === "object" && globalUserInfo) ||
    (cachedUserInfo && typeof cachedUserInfo === "object" && cachedUserInfo) ||
    {}

  const nextUserInfo = Object.assign({}, baseUserInfo)
  const nextProfile = Object.assign({}, nextUserInfo.profile && typeof nextUserInfo.profile === "object" ? nextUserInfo.profile : {})
  nextProfile.sessionId = normalizedSessionId
  nextUserInfo.profile = nextProfile

  setCachedUserInfo(nextUserInfo)
}

function mapHistoryMessage(item, index, fallbackTime) {
  const safeItem = item && typeof item === "object" ? item : null
  if (!safeItem) return null

  const text = String(safeItem.messageText || "").trim()
  if (!text) return null

  const roleType = String(safeItem.roleType || "").toUpperCase()
  const role = roleType === "USER" ? "user" : "assistant"
  const createTime = safeItem.createTime || safeItem.replyTime || fallbackTime

  return {
    id: `history-${safeItem.id || Date.now()}-${index}`,
    role,
    text,
    time: formatServerClock(createTime)
  }
}

function buildAssistantMessage(response) {
  const body = response && typeof response === "object" ? response : {}
  const data = body.data && typeof body.data === "object" ? body.data : {}
  const answer = String(data.answer || body.answer || "").trim() || DEFAULT_REPLY
  const replyTime = data.replyTime || body.replyTime || data.createTime || body.createTime

  return createMessage("assistant", answer, {
    time: formatServerClock(replyTime)
  })
}

const WAVE_BARS = [10, 18, 12, 22, 14, 26, 16, 20, 12, 24, 15, 28, 13, 21, 11, 24, 14, 26, 12, 20, 10, 22, 13, 18]

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
    inputDockHeight: 96,
    chatScrollTop: 0,
    title: "",
    subTitle: "",
    capabilities: [],
    noticeText: "",
    quickActions: [],
    messages: [],
    sessionId: "",
    pageLoading: true,
    sendLoading: false,
    inputMode: "text",
    inputFocus: false,
    draftText: "",
    voiceHintVisible: false,
    voiceHintCancel: false,
    voiceHolding: false,
    waveBars: WAVE_BARS
  },
  onLoad() {
    this.syncLayout()
    this.loadPageData()
  },
  onReady() {
    this.measureInputDock()
  },
  onShow() {
    this.measureInputDock()
  },
  syncLayout() {
    const { statusBarHeight, navBarHeight, headerHeight } = getLayoutMetrics()
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const windowWidth = (windowInfo && (windowInfo.windowWidth || windowInfo.screenWidth)) || 375
    const windowHeight = (windowInfo && (windowInfo.windowHeight || windowInfo.screenHeight)) || 812

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

    const safeAreaBottom =
      windowInfo && windowInfo.safeArea && windowInfo.safeArea.bottom ? windowInfo.safeArea.bottom : windowHeight
    const safeBottom = Math.max(0, windowHeight - safeAreaBottom)

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
  async loadPageData() {
    this.setData(
      Object.assign({}, STATIC_PAGE_DATA, {
        pageLoading: true
      })
    )

    try {
      const profileSessionId = this.getProfileSessionIdForMessages()
      if (profileSessionId) {
        const sessionId = this.persistSessionId(profileSessionId)
        await this.loadHistoryMessages(sessionId, { closePageLoading: true })
        return
      }

      const sessionId = await this.ensureSessionId()
      await this.loadHistoryMessages(sessionId, { closePageLoading: true })
    } catch (error) {
      console.warn("[ai-chat] 初始化会话失败:", error)
    } finally {
      if (this.data.pageLoading) {
        this.setData({
          pageLoading: false
        })
      }
    }
  },
  getProfileSessionIdForMessages() {
    const app = getApp()
    const globalUserInfo = app && app.globalData ? app.globalData.userInfo : null
    let sessionId = extractProfileSessionId(globalUserInfo)

    if (!sessionId) {
      sessionId = extractProfileSessionId(getCachedUserInfo())
    }

    return sessionId
  },
  async ensureSessionId() {
    if (this._sessionPromise) return this._sessionPromise

    this._sessionPromise = this._ensureSessionIdCore()
      .finally(() => {
        this._sessionPromise = null
      })

    return this._sessionPromise
  },
  async _ensureSessionIdCore() {
    let sessionId = ""

    if (!sessionId) {
      const app = getApp()
      sessionId = extractProfileSessionId(app && app.globalData ? app.globalData.userInfo : null)
    }

    if (!sessionId) {
      sessionId = extractProfileSessionId(getCachedUserInfo())
    }

    if (!sessionId) {
      sessionId = readCachedSessionId()
    }

    if (!sessionId) {
      const sessionRes = await createAssistantSession()
      sessionId = extractSessionId(sessionRes)
    }

    if (!sessionId) {
      throw new Error("未获取到有效 sessionId")
    }

    return this.persistSessionId(sessionId)
  },
  persistSessionId(rawSessionId) {
    const sessionId = normalizeSessionId(rawSessionId)
    if (sessionId === "") return ""

    wx.setStorageSync(STORAGE_ASSISTANT_SESSION_KEY, sessionId)
    syncSessionIdToUserInfo(sessionId)

    if (this.data.sessionId !== sessionId) {
      this.setData({ sessionId })
    }

    return sessionId
  },
  async loadHistoryMessages(sessionId, options = {}) {
    const { closePageLoading = false } = options
    const finalSessionId =
      normalizeSessionId(sessionId) ||
      normalizeSessionId(this.data.sessionId) ||
      normalizeSessionId(this.getProfileSessionIdForMessages()) ||
      readCachedSessionId()

    if (!finalSessionId) {
      if (closePageLoading && this.data.pageLoading) {
        this.setData({ pageLoading: false })
      }
      return
    }

    try {
      const res = await getAssistantMessages(finalSessionId)
      const data = res && res.data && typeof res.data === "object" ? res.data : {}
      const items = Array.isArray(data.items) ? data.items : []
      const fallbackTime = data.createTime
      const messages = items
        .map((item, index) => mapHistoryMessage(item, index, fallbackTime))
        .filter((item) => !!item)

      this.setData(
        {
          messages
        },
        () => {
          this.scrollToLatest()
        }
      )
    } catch (error) {
      console.warn("[ai-chat] 获取历史消息失败:", error)
    } finally {
      if (closePageLoading && this.data.pageLoading) {
        this.setData({ pageLoading: false })
      }
    }
  },
  scrollToLatest() {
    const { messages } = this.data
    if (!messages || !messages.length) return
    this.setData({
      chatScrollTop: this.data.chatScrollTop + 100000
    })
  },
  measureInputDock() {
    const query = this.createSelectorQuery()
    query.select(".analysis-input-dock").boundingClientRect()
    query.exec((res) => {
      const rect = res && res[0]
      if (!rect || !rect.height) return
      const nextHeight = Math.ceil(rect.height)
      if (Math.abs(nextHeight - this.data.inputDockHeight) < 2) return
      this.setData({
        inputDockHeight: nextHeight
      })
    })
  },
  appendMessage(message, options = {}) {
    const { clearDraft = false } = options
    const messages = this.data.messages.concat(message)
    const payload = { messages }
    if (clearDraft) payload.draftText = ""

    this.setData(
      payload,
      () => {
        this.scrollToLatest()
      }
    )
  },
  onInputChange(e) {
    this.setData({
      draftText: (e.detail && e.detail.value) || ""
    })
  },
  focusInput() {
    if (this.data.inputMode !== "text") return
    this.setData({
      inputFocus: true
    })
  },
  onInputBlur() {
    if (!this.data.inputFocus) return
    this.setData({
      inputFocus: false
    })
  },
  async sendQuestionText(questionText, options = {}) {
    const { clearDraft = false, userExtras = {} } = options
    const value = String(questionText || "").trim()
    if (!value) return
    if (this._sendingQuestion) return

    // 兜底关闭系统 loading，发送阶段只保留聊天区小 loading。
    wx.hideLoading()

    this.appendMessage(createMessage("user", value, userExtras), { clearDraft })
    this._sendingQuestion = true
    this.setData(
      {
        sendLoading: true
      },
      () => {
        this.scrollToLatest()
      }
    )

    try {
      let sessionId = this.data.sessionId
      if (!sessionId) {
        sessionId = await this.ensureSessionId()
      }

      const response = await chatWithAssistant({
        sessionId,
        questionText: value
      })

      this.appendMessage(buildAssistantMessage(response))
    } catch (error) {
      console.warn("[ai-chat] 发送消息失败:", error)
      this.appendMessage(createMessage("assistant", "抱歉，暂时无法回复，请稍后重试。"))
    } finally {
      this._sendingQuestion = false
      if (this.data.sendLoading) {
        this.setData({
          sendLoading: false
        })
      }
      wx.hideLoading()
    }
  },
  async sendText() {
    const value = (this.data.draftText || "").trim()
    if (!value) {
      wx.showToast({
        title: "请输入内容",
        icon: "none"
      })
      return
    }

    await this.sendQuestionText(value, {
      clearDraft: true
    })
  },
  switchToVoice() {
    this.setData(
      {
        inputMode: "voice",
        inputFocus: false
      },
      () => {
        this.measureInputDock()
      }
    )
  },
  switchToText() {
    this.setData(
      {
        inputMode: "text",
        inputFocus: true
      },
      () => {
        this.measureInputDock()
      }
    )
  },
  onVoiceHoldStart(e) {
    const touch = (e.touches && e.touches[0]) || null
    this.voiceStartY = touch ? touch.clientY : 0
    this.setData({
      voiceHintVisible: true,
      voiceHintCancel: false,
      voiceHolding: true
    })
  },
  onVoiceHoldMove(e) {
    if (!this.data.voiceHintVisible) return
    const touch = (e.touches && e.touches[0]) || null
    if (!touch) return
    const moveDistance = this.voiceStartY - touch.clientY
    this.setData({
      voiceHintCancel: moveDistance > 90
    })
  },
  onVoiceHoldEnd() {
    const isCancel = this.data.voiceHintCancel
    this.setData({
      voiceHintVisible: false,
      voiceHintCancel: false,
      voiceHolding: false
    })

    if (isCancel) {
      wx.showToast({
        title: "已取消发送",
        icon: "none"
      })
      return
    }

    this.sendQuestionText("帮我分析下体质", {
      userExtras: { leftIcon: "/assets/analysis/chat/voice_icon.png" }
    })
  },
  onVoiceHoldCancel() {
    this.setData({
      voiceHintVisible: false,
      voiceHintCancel: false,
      voiceHolding: false
    })
  },
  tapQuickAction(e) {
    const { path, routeType } = e.currentTarget.dataset
    if (!path) return

    if (routeType === "tab") {
      wx.switchTab({ url: path })
      return
    }

    wx.navigateTo({ url: path })
  },
  handleBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: "/pages/home/index" })
  }
})
