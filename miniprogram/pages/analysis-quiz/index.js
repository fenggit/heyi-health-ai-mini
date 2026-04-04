const { getLayoutMetrics } = require("../../utils/layout")
const { get } = require("../../utils/request")
const paths = require("../../http/paths")

/**
 * 获取问卷详情
 * @param {number|string} [questionnaireId] 问卷ID，可选
 */
function fetchQuizData(questionnaireId) {
  const data = questionnaireId ? { questionnaireId } : {}
  return get(paths.assessment.questionnaireDetail, data).then((res) => {
    const detail = (res && res.data) || {}
    // 将接口数据映射为页面所需结构
    const questions = (detail.questions || []).map((q) => ({
      id: q.id,
      questionCode: q.questionCode,
      questionType: q.questionType,
      title: q.title,
      dimensionCode: q.dimensionCode,
      sortNo: q.sortNo,
      requiredFlag: q.requiredFlag,
      adaptiveFlag: q.adaptiveFlag,
      options: (q.options || [])
        .slice()
        .sort((a, b) => (a.sortNo || 0) - (b.sortNo || 0))
        .map((opt) => ({
          id: opt.id,
          optionCode: opt.optionCode,
          optionText: opt.optionText,
          scoreJson: opt.scoreJson,
          nextRuleJson: opt.nextRuleJson,
          sortNo: opt.sortNo
        }))
    }))
    return {
      questionnaireId: detail.questionnaireId,
      questionnaireCode: detail.questionnaireCode,
      name: detail.name || "",
      desc: detail.description || "",
      version: detail.version || "",
      modelYear: detail.modelYear || "",
      tips: "请根据您最近一个月的实际情况作答，以便获得更准确的体质分析结果。",
      questions
    }
  })
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
    name: "",
    desc: "",
    tips: "",
    currentIndex: 0,
    questions: [],
    answers: []
  },
  onLoad(options) {
    this._questionnaireId = options && options.questionnaireId ? options.questionnaireId : undefined
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
    wx.showLoading({ title: "加载中", mask: true })
    try {
      const payload = await fetchQuizData(this._questionnaireId)
      this.setData({
        ...payload,
        answers: new Array(payload.questions.length).fill(-1)
      })
    } catch (err) {
      console.error("[analysis-quiz] 加载问卷失败", err)
    } finally {
      wx.hideLoading()
    }
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
    const currentQuestion = questions[currentIndex]
    const isOptional = currentQuestion && currentQuestion.requiredFlag === true
    if (!isOptional && answers[currentIndex] < 0) {
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
