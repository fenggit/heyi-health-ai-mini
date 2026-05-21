const { getLayoutMetrics } = require("../../utils/layout")
const { getCachedUserInfo, setCachedUserInfo } = require("../../http/auth")
const {
  createAssistantSession,
  getAssistantMessages,
  chatWithAssistant,
  extractSessionId,
  normalizeSessionId
} = require("../../http/assistant")

let recordRecognitionManager = null

try {
  const wechatSI = requirePlugin("WechatSI")
  recordRecognitionManager = wechatSI.getRecordRecognitionManager()
} catch (error) {
  console.warn("[ai-chat] WechatSI 插件未就绪:", error)
}

const STORAGE_ASSISTANT_SESSION_KEY = "assistantSessionId"
const DEFAULT_REPLY = "你可以用语音或文字告诉我你的需求，我会尽力帮你！"
const VOICE_MESSAGE_ICON = "/assets/analysis/chat/voice_icon.png"
const VOICE_UNAVAILABLE_MESSAGE = "当前小程序未配置语音识别服务"
const FEATURE_KEY_AI_ASSESSMENT = "ai-assessment"

const STATIC_PAGE_DATA = {
  title: "哈喽，我是天天！",
  subTitle: "你的AI食养顾问",
  capabilities: ["进行趣味性生活状态分析", "提供个性化饮食建议", "解答饮食健康问题", "快速访问各项功能"],
  noticeText: "提示: 本服务由AI生成，仅供参考，不能替代医疗建议~",
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
      id: "profile",
      label: "个人中心",
      path: "/pages/profile/index",
      routeType: "tab",
      requiresLogin: true
    },
    {
      id: "my-plan",
      label: "我的计划",
      path: "/pages/my-week-plan/index",
      routeType: "navigate",
      requiresLogin: true
    },
    {
      id: "visual-analysis",
      label: "AI视觉分析",
      path: "/pages/analysis-ai-image/index",
      routeType: "navigate",
      requiresLogin: true
    },
    {
      id: "checkin",
      label: "打卡",
      path: "/pages/checkin/index",
      routeType: "tab",
      requiresLogin: true
    }
  ]
}

function buildStaticPageData(functionMap = {}) {
  const safeFunctionMap = functionMap && typeof functionMap === "object" ? functionMap : {}
  const showAiAssessment = !!safeFunctionMap[FEATURE_KEY_AI_ASSESSMENT]

  return Object.assign({}, STATIC_PAGE_DATA, {
    quickActions: STATIC_PAGE_DATA.quickActions.filter((item) => {
      if (item.id !== "visual-analysis") return true
      return showAiAssessment
    })
  })
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

  let parsedMessageJson = null
  if (safeItem.messageJson && typeof safeItem.messageJson === "string") {
    try {
      parsedMessageJson = JSON.parse(safeItem.messageJson)
    } catch (e) {
      parsedMessageJson = null
    }
  } else if (safeItem.messageJson && typeof safeItem.messageJson === "object") {
    parsedMessageJson = safeItem.messageJson
  }

  const text = String(
    safeItem.messageText ||
    safeItem.text ||
    safeItem.content ||
    safeItem.questionText ||
    (parsedMessageJson && (parsedMessageJson.answer || parsedMessageJson.content || parsedMessageJson.text)) ||
    ""
  ).trim()
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

function extractHistoryItems(response) {
  const body = response && typeof response === "object" ? response : {}
  const data = body.data

  if (Array.isArray(data)) return data
  if (!data || typeof data !== "object") return []

  const candidates = [
    data.items,
    data.list,
    data.records,
    data.rows,
    data.messages
  ]

  for (let i = 0; i < candidates.length; i += 1) {
    if (Array.isArray(candidates[i])) return candidates[i]
  }

  return []
}

function extractHistoryFallbackTime(response) {
  const body = response && typeof response === "object" ? response : {}
  const data = body.data
  if (!data || typeof data !== "object" || Array.isArray(data)) return body.createTime || body.replyTime

  return data.createTime || data.replyTime || body.createTime || body.replyTime
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

function buildMessageMergeKey(message) {
  const safeMessage = message && typeof message === "object" ? message : {}
  return [
    safeMessage.role || "",
    safeMessage.text || "",
    safeMessage.time || "",
    safeMessage.leftIcon || ""
  ].join("::")
}

function mergeMessages(historyMessages, liveMessages) {
  const merged = []
  const seen = {}
  const source = []

  if (Array.isArray(historyMessages)) {
    source.push(...historyMessages)
  }
  if (Array.isArray(liveMessages)) {
    source.push(...liveMessages)
  }

  for (let i = 0; i < source.length; i += 1) {
    const item = source[i]
    if (!item || typeof item !== "object") continue
    const key = buildMessageMergeKey(item)
    if (seen[key]) continue
    seen[key] = true
    merged.push(item)
  }

  return merged
}

function getVoiceErrorMessage(error) {
  const retcode = error && error.retcode

  if (retcode === -30011) return "语音识别仍在进行中，请稍后重试"
  if (retcode === -30006) return "语音识别超时，请重试"
  if (retcode === -40001) return "语音识别请求过于频繁，请稍后再试"
  if (retcode === -30001 || retcode === -30003 || retcode === -30008 || retcode === -30010) {
    return "录音或网络异常，请稍后重试"
  }

  const message = String((error && error.msg) || "").trim()
  return message || "语音识别失败，请稍后重试"
}

function bindRecordRecognitionEvent(manager, eventName, handler) {
  if (!manager || typeof handler !== "function") return false

  manager[eventName] = handler
  console.log(`[ai-chat] bind ${eventName}`, {
    assigned: typeof manager[eventName] === "function",
    managerKeys: Object.keys(manager || {})
  })
  return true
}

function logAiChat(eventName, payload) {
  if (payload === undefined) {
    console.log(`[ai-chat] ${eventName}`)
    return
  }

  console.log(`[ai-chat] ${eventName}`, payload)
}

function safeSerialize(value) {
  if (value === undefined) return "undefined"
  try {
    return JSON.stringify(value)
  } catch (error) {
    return String(value)
  }
}

function extractRecognitionText(payload) {
  const safePayload = payload && typeof payload === "object" ? payload : {}
  const candidates = [
    safePayload.result,
    safePayload.resultText,
    safePayload.resultString,
    safePayload.text,
    safePayload.content,
    safePayload.message,
    safePayload.msg
  ]

  for (let i = 0; i < candidates.length; i += 1) {
    const value = String(candidates[i] || "").trim()
    if (value) return value
  }

  return ""
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
    isLogin: false,
    pageLoading: true,
    sendLoading: false,
    inputMode: "text",
    inputFocus: false,
    draftText: "",
    voiceEntryEnabled: false,
    voiceHintVisible: false,
    voiceHintCancel: false,
    voiceHolding: false,
    waveBars: WAVE_BARS
  },
  onLoad() {
    this._pageUnloaded = false
    this._initialPageLoadingVisible = false
    this.initVoiceRecognition()
    this.syncLayout()

    const app = getApp()
    const isLogin = !!(app && app.globalData && app.globalData.isLogin)
    this.setData({ isLogin })
    this.syncFeatureSwitch()

    if (app && typeof app.ensureFunctionMapLoaded === "function") {
      app.ensureFunctionMapLoaded().then(() => {
        if (this._pageUnloaded) return
        this.syncFeatureSwitch()
      })
    }

    if (isLogin) {
      this.showInitialPageLoading()
      this.loadPageData()
    } else {
      // 未登录：只渲染静态内容，不请求任何接口
      this.setData(
        Object.assign({}, buildStaticPageData(app && app.globalData ? app.globalData.functionMap : null), {
          messages: [],
          pageLoading: false
        })
      )
    }
  },
  // 弹出登录提示，引导用户去登录
  promptLogin() {
    wx.showModal({
      title: "温馨提示",
      content: "登录后才可使用 AI 食养，是否前往登录？",
      confirmText: "去登录",
      cancelText: "再看看",
      success: (res) => {
        if (!res.confirm) return
        wx.navigateTo({ url: "/pages/login/index" })
      }
    })
  },
  // 检查登录，未登录则弹提示并返回 false
  requireLogin() {
    if (this.data.isLogin) return true
    this.promptLogin()
    return false
  },
  onReady() {
    this.measureInputDock()
  },
  onShow() {
    this.measureInputDock()
    // 每次页面显示时同步登录状态（如从登录页返回后）
    const app = getApp()
    const isLogin = !!(app && app.globalData && app.globalData.isLogin)
    const wasLogin = this.data.isLogin
    this.setData({ isLogin })
    this.syncFeatureSwitch()
    // 刚完成登录，触发数据加载
    if (!wasLogin && isLogin) {
      this.showInitialPageLoading()
      this.loadPageData()
    }
  },
  onUnload() {
    this._pageUnloaded = true
    this._voiceCancelOnStop = true
    this._voiceStopAfterStart = true
    this.resetVoiceState()
    this.stopVoiceRecognition({ silent: true })
    this.hideInitialPageLoading()
  },
  showInitialPageLoading(title = "加载中...") {
    if (this._initialPageLoadingVisible) return
    this._initialPageLoadingVisible = true
    wx.showLoading({
      title,
      mask: true
    })
  },
  hideInitialPageLoading() {
    if (!this._initialPageLoadingVisible) return
    this._initialPageLoadingVisible = false
    wx.hideLoading()
  },
  initVoiceRecognition() {
    this._recordRecognitionManager = recordRecognitionManager
    this.setData({
      voiceEntryEnabled: !!this._recordRecognitionManager
    })
    logAiChat("initVoiceRecognition", {
      voiceEntryEnabled: !!this._recordRecognitionManager,
      managerType: this._recordRecognitionManager ? typeof this._recordRecognitionManager : "null"
    })
    if (!this._recordRecognitionManager) return

    bindRecordRecognitionEvent(this._recordRecognitionManager, "onStart", (res) => {
      console.log("[ai-chat] recordRecoManager.onStart", res)
      logAiChat("voice.onStart", {
        rawResult: res,
        serializedResult: safeSerialize(res)
      })
      this._voiceStarting = false
      this._voiceRecordingActive = true

      if (this._voiceStopAfterStart) {
        this._voiceStopAfterStart = false
        this.stopVoiceRecognition({ silent: true })
      }
    })

    bindRecordRecognitionEvent(this._recordRecognitionManager, "onRecognize", (res) => {
      const recognizedText = String((res && res.result) || "").trim() || extractRecognitionText(res)
      this._voiceStarting = false
      this._voiceRecordingActive = true
      logAiChat("voice.onRecognize", {
        result: res && res.result,
        recognizedText,
        resultLength: recognizedText.length,
        rawResult: res,
        serializedResult: safeSerialize(res)
      })

      if (this._voiceStopAfterStart) {
        logAiChat("voice.onRecognize.stopAfterStart")
        this._voiceStopAfterStart = false
        this.stopVoiceRecognition({ silent: true })
      }
    })

    bindRecordRecognitionEvent(this._recordRecognitionManager, "onStop", (res) => {
      const shouldCancel = !!this._voiceCancelOnStop
      const result = String((res && res.result) || "").trim()
      const recognizedText = result || extractRecognitionText(res)
      console.log("[ai-chat] recordRecoManager.onStop", res)
      console.log("[ai-chat] record file path", res && res.tempFilePath)
      console.log("[ai-chat] result", result)
      logAiChat("voice.onStop", {
        shouldCancel,
        result,
        recognizedText,
        resultLength: recognizedText.length,
        rawResult: res,
        serializedResult: safeSerialize(res)
      })

      console.log("[ai-chat] recordRecoManager.onStop result", result)
      console.log("[ai-chat] recognizedText(final)", recognizedText)

      this._voiceStarting = false
      this._voiceRecordingActive = false
      this._voiceCancelOnStop = false
      this._voiceStopAfterStart = false

      if (this._pageUnloaded) return

      this.resetVoiceState()

      if (shouldCancel) {
        return
      }

      if (!recognizedText) {
        this.setData({
          draftText: safeSerialize(res)
        })
        wx.showToast({
          title: "未识别到语音内容",
          icon: "none"
        })
        return
      }

      this.setData({
        draftText: recognizedText
      })

      this.sendQuestionText(recognizedText, {
        userExtras: { leftIcon: VOICE_MESSAGE_ICON }
      })
    })

    bindRecordRecognitionEvent(this._recordRecognitionManager, "onError", (error) => {
      console.error("[ai-chat] recordRecoManager.onError", error)
      console.error("[ai-chat] error msg", error && error.msg)
      logAiChat("voice.onError", error)
      const shouldCancel = !!this._voiceCancelOnStop

      this._voiceStarting = false
      this._voiceRecordingActive = false
      this._voiceCancelOnStop = false
      this._voiceStopAfterStart = false

      if (this._pageUnloaded) return

      this.resetVoiceState()

      if (shouldCancel && error && error.retcode === -30012) return

      wx.showToast({
        title: getVoiceErrorMessage(error),
        icon: "none"
      })
    })
  },
  resetVoiceState() {
    if (this._pageUnloaded) return
    if (!this.data.voiceHintVisible && !this.data.voiceHintCancel && !this.data.voiceHolding) return
    this.setData({
      voiceHintVisible: false,
      voiceHintCancel: false,
      voiceHolding: false
    })
  },
  ensureRecordPermission() {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (settingRes) => {
          if (settingRes && settingRes.authSetting && settingRes.authSetting["scope.record"]) {
            resolve(true)
            return
          }

          wx.authorize({
            scope: "scope.record",
            success: () => {
              resolve(true)
            },
            fail: () => {
              wx.showToast({
                title: "请允许录音后再试",
                icon: "none"
              })
              resolve(false)
            }
          })
        },
        fail: () => {
          wx.showToast({
            title: "无法获取录音权限",
            icon: "none"
          })
          resolve(false)
        }
      })
    })
  },
  async startVoiceRecognition() {
    logAiChat("voice.start.request", {
      hasManager: !!this._recordRecognitionManager,
      voiceStarting: !!this._voiceStarting,
      voiceRecordingActive: !!this._voiceRecordingActive
    })
    if (!this._recordRecognitionManager) {
      wx.showToast({
        title: "当前环境不支持语音识别",
        icon: "none"
      })
      this.resetVoiceState()
      return
    }

    if (this._voiceStarting || this._voiceRecordingActive) return

    this._voiceCancelOnStop = false
  this._voiceStopAfterStart = false
    this._voiceStarting = true

    const permissionGranted = await this.ensureRecordPermission()
    logAiChat("voice.start.permission", { permissionGranted })
    if (!permissionGranted) {
      this._voiceStarting = false
      this.resetVoiceState()
      return
    }

    try {
      logAiChat("voice.start.invoke", {
        duration: 60000,
        lang: "zh_CN"
      })
      this._recordRecognitionManager.start({
        duration: 60000,
        lang: "zh_CN"
      })
    } catch (error) {
      logAiChat("voice.start.catch", error)
      this._voiceStarting = false
      this.resetVoiceState()
      wx.showToast({
        title: getVoiceErrorMessage(error),
        icon: "none"
      })
    }
  },
  stopVoiceRecognition(options = {}) {
    const { silent = false } = options
    logAiChat("voice.stop.request", {
      silent,
      voiceStarting: !!this._voiceStarting,
      voiceRecordingActive: !!this._voiceRecordingActive
    })

    if (!this._recordRecognitionManager) return
    if (!this._voiceStarting && !this._voiceRecordingActive) return

    try {
      logAiChat("voice.stop.invoke")
      this._recordRecognitionManager.stop()
    } catch (error) {
      logAiChat("voice.stop.catch", error)
      this._voiceStarting = false
      this._voiceRecordingActive = false
      this._voiceCancelOnStop = false
      if (!silent) {
        wx.showToast({
          title: getVoiceErrorMessage(error),
          icon: "none"
        })
      }
    }
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
  syncFeatureSwitch() {
    const app = getApp()
    const functionMap = app && app.globalData ? app.globalData.functionMap : null
    this.setData(buildStaticPageData(functionMap))
  },
  async loadPageData() {
    this._historyInitialized = false
    this.setData(
      Object.assign({}, buildStaticPageData(getApp() && getApp().globalData ? getApp().globalData.functionMap : null), {
        messages: [],
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
      this.hideInitialPageLoading()
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
      const items = extractHistoryItems(res)
      const fallbackTime = extractHistoryFallbackTime(res)
      const historyMessages = items
        .map((item, index) => mapHistoryMessage(item, index, fallbackTime))
        .filter((item) => !!item)
      const messages = this._historyInitialized
        ? this.data.messages
        : mergeMessages(historyMessages, this.data.messages)

      this._historyInitialized = true

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
    logAiChat("appendMessage", {
      role: message && message.role,
      text: message && message.text,
      nextMessageCount: messages.length,
      clearDraft
    })

    this.setData(
      payload,
      () => {
        this.scrollToLatest()
      }
    )
  },
  copyMessage(e) {
    const text = String(e && e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.text || "" : "").trim()
    if (!text) return

    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({
          title: "已复制",
          icon: "none"
        })
      }
    })
  },
  onInputChange(e) {
    this.setData({
      draftText: (e.detail && e.detail.value) || ""
    })
  },
  focusInput() {
    if (!this.requireLogin()) return
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
    logAiChat("sendQuestionText.enter", {
      rawQuestionText: questionText,
      normalizedValue: value,
      clearDraft,
      userExtras,
      sendingQuestion: !!this._sendingQuestion
    })
    if (!value) {
      logAiChat("sendQuestionText.skip.empty")
      return
    }
    if (this._sendingQuestion) {
      logAiChat("sendQuestionText.skip.busy")
      return
    }

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
      logAiChat("sendQuestionText.request", {
        sessionId,
        questionText: value
      })

      const response = await chatWithAssistant({
        sessionId,
        questionText: value
      })
      logAiChat("sendQuestionText.response", response)

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
    if (!this.requireLogin()) return
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
    if (!this.requireLogin()) return
    if (!this.data.voiceEntryEnabled) {
      wx.showToast({
        title: VOICE_UNAVAILABLE_MESSAGE,
        icon: "none"
      })
      return
    }

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
    if (!this.requireLogin()) return
    const touch = (e.touches && e.touches[0]) || null
    this.voiceStartY = touch ? touch.clientY : 0
    logAiChat("voice.holdStart", {
      startY: this.voiceStartY
    })
    this.setData({
      voiceHintVisible: true,
      voiceHintCancel: false,
      voiceHolding: true
    })

    this.startVoiceRecognition()
  },
  onVoiceHoldMove(e) {
    if (!this.data.voiceHintVisible) return
    const touch = (e.touches && e.touches[0]) || null
    if (!touch) return
    const moveDistance = this.voiceStartY - touch.clientY
    logAiChat("voice.holdMove", {
      moveDistance,
      willCancel: moveDistance > 90
    })
    this.setData({
      voiceHintCancel: moveDistance > 90
    })
  },
  onVoiceHoldEnd() {
    const isCancel = this.data.voiceHintCancel
    logAiChat("voice.holdEnd", {
      isCancel,
      voiceStarting: !!this._voiceStarting,
      voiceRecordingActive: !!this._voiceRecordingActive
    })
    this.resetVoiceState()

    this._voiceCancelOnStop = isCancel
    if (this._voiceStarting && !this._voiceRecordingActive) {
      this._voiceStopAfterStart = true
      return
    }

    this.stopVoiceRecognition()
  },
  onVoiceHoldCancel() {
    logAiChat("voice.holdCancel", {
      voiceStarting: !!this._voiceStarting,
      voiceRecordingActive: !!this._voiceRecordingActive
    })
    this._voiceCancelOnStop = true
    this.resetVoiceState()
    if (this._voiceStarting && !this._voiceRecordingActive) {
      this._voiceStopAfterStart = true
      return
    }

    this.stopVoiceRecognition({ silent: true })
  },
  tapQuickAction(e) {
    const { path, routeType, requiresLogin } = e.currentTarget.dataset
    if (!path) return

    if (requiresLogin && !this.requireLogin()) return

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
