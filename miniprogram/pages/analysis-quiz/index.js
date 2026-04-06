const { getLayoutMetrics } = require("../../utils/layout")
const { post } = require("../../utils/request")
const paths = require("../../http/paths")

/**
 * 初始化问卷（POST /assessment/app/questionnaire/init）
 * @param {object} params
 * @param {number|string} [params.questionnaireId]
 * @param {string} [params.guestToken]
 */
function fetchQuizData({ questionnaireId, guestToken } = {}) {
  const body = {}
  if (questionnaireId) body.questionnaireId = questionnaireId
  if (guestToken) body.guestToken = guestToken
  return post(paths.assessment.questionnaireInit, body).then((res) => {
    const record = (res && res.data && res.data.record) || {}
    const detail = (res && res.data && res.data.detail) || {}
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
      recordId: record.id,
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

/**
 * 提交问卷答案
 * @param {object} params
 * @param {number} params.recordId
 * @param {string} [params.guestToken]
 * @param {Array} params.questions  - 问题列表
 * @param {Array} params.answers    - 每题选中的选项 index（与 questions 对应）
 */
function submitQuiz({ recordId, guestToken, questions, answers }) {
  const answerList = questions
    .map((q, i) => {
      const optIndex = answers[i]
      if (optIndex < 0 || !q.options[optIndex]) return null
      return { questionId: q.id, optionId: q.options[optIndex].id }
    })
    .filter(Boolean)

  const body = { recordId, answers: answerList }
  const app = getApp()
  if (!(app && app.globalData.isLogin) && guestToken) {
    body.guestToken = guestToken
  }
  return post(paths.assessment.questionnaireSubmit, body)
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
    this._guestToken = (options && options.guestToken) || ''
    console.log('[analysis-quiz] onLoad, guestToken:', this._guestToken)
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
      const payload = await fetchQuizData({
        questionnaireId: this._questionnaireId,
        guestToken: this._guestToken
      })
      this._recordId = payload.recordId
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
    this.setData({ answers: nextAnswers })

    const { questions, currentIndex } = this.data
    const q = questions[currentIndex]
    const opt = q && q.options[Number(index)]
    console.log('[analysis-quiz] 当前选择:', JSON.stringify({ questionId: q && q.id, title: q && q.title, optionId: opt && opt.id, optionText: opt && opt.optionText }))
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
      this._submitQuiz()
      return
    }
    this.setData({
      currentIndex: currentIndex + 1
    })
  },
  async _submitQuiz() {
    const { questions, answers } = this.data
    wx.showLoading({ title: '提交中', mask: true })
    try {
      const res = await submitQuiz({
        recordId: this._recordId,
        guestToken: this._guestToken,
        questions,
        answers
      })
      console.log('[analysis-quiz] 提交成功', res)
      const app = getApp()
      const isLogin = !!(app && app.globalData.isLogin)
      if (isLogin) {
        wx.redirectTo({ url: `/pages/analysis-report/index?recordId=${this._recordId}` })
      } else {
        wx.redirectTo({ url: `/pages/analysis-auth/index?recordId=${this._recordId}&guestToken=${this._guestToken}` })
      }
    } catch (err) {
      console.error('[analysis-quiz] 提交失败', err)
    } finally {
      wx.hideLoading()
    }
  }
})