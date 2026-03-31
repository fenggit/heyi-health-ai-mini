const { getLayoutMetrics } = require("../../utils/layout")

const DEFAULT_REPLY = "你可以用语音或文字告诉我你的需求，我会尽力帮你！"

const MOCK_PAGE_DATA = {
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
      path: "/pages/my-plan/index",
      routeType: "navigate"
    },
    {
      id: "profile",
      label: "个人中心",
      path: "/pages/profile/index",
      routeType: "tab"
    }
  ],
  messages: [
    {
      id: "m1",
      role: "user",
      text: "你好",
      time: "12:22"
    },
    {
      id: "m2",
      role: "user",
      text: "帮我分析下体质",
      time: "12:23",
      leftIcon: "/assets/analysis/chat/voice_icon.png"
    },
    {
      id: "m3",
      role: "assistant",
      text: DEFAULT_REPLY,
      time: "12:22"
    }
  ]
}

function fetchPageData() {
  // TODO: 后续替换为真实会话数据接口
  return Promise.resolve(JSON.parse(JSON.stringify(MOCK_PAGE_DATA)))
}

function padClock(value) {
  return value < 10 ? `0${value}` : `${value}`
}

function formatClock(date = new Date()) {
  return `${padClock(date.getHours())}:${padClock(date.getMinutes())}`
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
    const payload = await fetchPageData()
    this.setData(payload)
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
  appendConversation(userText, userExtras = {}) {
    const latest = [createMessage("user", userText, userExtras), createMessage("assistant", DEFAULT_REPLY)]
    const messages = this.data.messages.concat(latest)
    this.setData(
      {
        messages,
        draftText: ""
      },
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
  sendText() {
    const value = (this.data.draftText || "").trim()
    if (!value) {
      wx.showToast({
        title: "请输入内容",
        icon: "none"
      })
      return
    }
    this.appendConversation(value)
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

    this.appendConversation("帮我分析下体质", { leftIcon: "/assets/analysis/chat/voice_icon.png" })
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
