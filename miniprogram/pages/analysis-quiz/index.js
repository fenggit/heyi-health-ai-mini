const { getLayoutMetrics } = require("../../utils/layout")

const MOCK_QUIZ_DATA = {
  title: "趣味分析，个性化建议",
  subTitle: "AI生活状态趋势分析",
  tips: "请根据您最近一个月的实际情况作答，以便获得更准确的体质分析结果。",
  questions: [
    {
      id: "q1",
      title: "您的睡眠质量如何？",
      options: ["很好，很少失眠", "一般，偶尔失眠", "较差，经常失眠", "很差，长期失眠"]
    },
    {
      id: "q2",
      title: "您最近是否感觉容易疲劳？",
      options: ["几乎没有", "偶尔会", "经常会", "持续明显"]
    },
    {
      id: "q3",
      title: "平时手脚怕冷的情况？",
      options: ["从不怕冷", "偶尔怕冷", "经常怕冷", "一年四季都怕冷"]
    },
    {
      id: "q4",
      title: "消化状态（胃口/腹胀）如何？",
      options: ["状态稳定", "轻微波动", "经常不适", "明显影响日常"]
    },
    {
      id: "q5",
      title: "最近情绪与压力状态？",
      options: ["轻松平稳", "偶尔焦虑", "经常紧张", "持续压力很大"]
    }
  ]
}

function fetchQuizData() {
  // TODO: 后续替换为问卷题目接口
  return Promise.resolve(JSON.parse(JSON.stringify(MOCK_QUIZ_DATA)))
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
    title: "",
    subTitle: "",
    tips: "",
    currentIndex: 0,
    questions: [],
    answers: []
  },
  onLoad() {
    this.syncLayout()
    this.loadPageData()
  },
  syncLayout() {
    const { statusBarHeight, navBarHeight, headerHeight } = getLayoutMetrics()
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
      menuRight
    })
  },
  async loadPageData() {
    const payload = await fetchQuizData()
    this.setData({
      ...payload,
      answers: new Array(payload.questions.length).fill(-1)
    })
  },
  chooseOption(e) {
    const { index } = e.currentTarget.dataset
    const nextAnswers = [...this.data.answers]
    nextAnswers[this.data.currentIndex] = Number(index)
    this.setData({
      answers: nextAnswers
    })
  },
  handleBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: "/pages/home/index" })
  },
  prevQuestion() {
    if (this.data.currentIndex <= 0) return
    this.setData({
      currentIndex: this.data.currentIndex - 1
    })
  },
  nextQuestion() {
    const { currentIndex, questions, answers } = this.data
    if (!questions.length) return
    if (answers[currentIndex] < 0) {
      wx.showToast({
        title: "请先选择一个答案",
        icon: "none"
      })
      return
    }
    if (currentIndex >= questions.length - 1) {
      wx.navigateTo({ url: "/pages/analysis-upload/index" })
      return
    }
    this.setData({
      currentIndex: currentIndex + 1
    })
  }
})
