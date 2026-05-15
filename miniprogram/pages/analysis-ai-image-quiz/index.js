const { getLayoutMetrics } = require("../../utils/layout")
const { post } = require("../../utils/request")
const paths = require("../../http/paths")

/**
 * 获取 AI 视觉分析题目（降级用，正常由上一页传入数据）
 * POST /assessment/app/ai/inquiry
 */
function fetchInquiry({ recordId, guestToken }) {
  const body = { recordId }
  if (guestToken) body.guestToken = guestToken
  return post(paths.assessment.aiInquiry, body)
}

/**
 * 提交 AI 视觉分析答案
 * POST /assessment/app/ai/submit
 * answers: string[]  选中项的 optionCode 数组，空字符串也需要传
 */
function submitAiQuiz({ recordId, guestToken, answers }) {
  const body = { recordId, answers }
  if (guestToken) body.guestToken = guestToken
  return post(paths.assessment.aiSubmit, body)
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
    currentIndex: 0,
    questions: [],
    selectedIndexes: [],
    // 当前题目已选中的 option 下标列表，供模板直接使用
    currentSelectedIndexes: []
  },

  _recordId: null,
  _guestToken: '',

  onLoad(options) {
    this._recordId = options && options.recordId ? decodeURIComponent(options.recordId) : null
    this._guestToken = (options && options.guestToken) ? decodeURIComponent(options.guestToken) : ''
    console.log('[ai-image-quiz] onLoad, recordId:', this._recordId, 'guestToken:', this._guestToken)
    this.syncLayout()

    // 优先使用上一页传入的 inquiry 数据，避免重复请求
    if (options && options.inquiryData) {
      try {
        const inquiryData = JSON.parse(decodeURIComponent(options.inquiryData))
        this._applyInquiryData(inquiryData)
        return
      } catch (e) {
        console.warn('[ai-image-quiz] 解析 inquiryData 失败，降级请求接口', e)
      }
    }
    this.loadQuestions()
  },

  /**
   * 将 inquiry 接口返回的 data 对象解析并渲染到页面
   */
  _applyInquiryData(data) {
    const rawQuestions = (data.detail && data.detail.questions) || []
    const questions = rawQuestions.map((q) => ({
      title: q.title || '',
      questionType: q.questionType || 'single',
      requiredFlag: q.requiredFlag === 'Y',
      sortNo: q.sortNo || 0,
      options: (q.options || [])
        .slice()
        .sort((a, b) => (a.sortNo || 0) - (b.sortNo || 0))
        .map((opt) => ({
          optionCode: opt.optionCode,
          optionText: opt.optionText || '',
          checked: false
        }))
    }))
    const selectedIndexes = questions.map(() => [])
    this.setData({ questions, selectedIndexes, currentSelectedIndexes: [] })
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

  async loadQuestions() {
    if (!this._recordId) {
      wx.showToast({ title: '参数错误，请重试', icon: 'none' })
      return
    }
    wx.showLoading({ title: '加载中', mask: true })
    try {
      const res = await fetchInquiry({
        recordId: this._recordId,
        guestToken: this._guestToken
      })
      this._applyInquiryData((res && res.data) || {})
    } catch (err) {
      console.error('[ai-image-quiz] 加载题目失败', err)
      wx.showToast({ title: '加载失败，请重试', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  chooseOption(e) {
    const optIdx = Number(e.currentTarget.dataset.index)
    const { currentIndex, questions, selectedIndexes } = this.data
    const q = questions[currentIndex]
    if (!q) return

    // 单选：选中当前项，取消其他项
    const newOptions = q.options.map((opt, i) => ({
      ...opt,
      checked: i === optIdx
    }))
    const next = [optIdx]

    const newSelectedIndexes = selectedIndexes.map((v, i) => i === currentIndex ? next : v)
    this.setData({
      [`questions[${currentIndex}].options`]: newOptions,
      selectedIndexes: newSelectedIndexes,
      currentSelectedIndexes: next
    })
  },

  // 判断某题某选项是否选中
  isSelected(questionIndex, optionIndex) {
    const { selectedIndexes } = this.data
    const arr = selectedIndexes[questionIndex]
    return Array.isArray(arr) && arr.indexOf(optionIndex) >= 0
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
    const newIndex = this.data.currentIndex - 1
    this.setData({
      currentIndex: newIndex,
      currentSelectedIndexes: this.data.selectedIndexes[newIndex] || []
    })
  },

  nextQuestion() {
    const { currentIndex, questions, selectedIndexes } = this.data
    if (!questions.length) return
    const q = questions[currentIndex]
    const hasAnswer = selectedIndexes[currentIndex] && selectedIndexes[currentIndex].length > 0
    if (q.requiredFlag && !hasAnswer) {
      wx.showToast({ title: '请先选择一个答案', icon: 'none' })
      return
    }
    if (currentIndex < questions.length - 1) {
      const newIndex = currentIndex + 1
      this.setData({
        currentIndex: newIndex,
        currentSelectedIndexes: selectedIndexes[newIndex] || []
      })
      return
    }
    this._submitQuiz()
  },

  async _submitQuiz() {
    const { questions, selectedIndexes } = this.data
    // 收集所有选中项的 optionCode，空字符串也传
    const answers = []
    questions.forEach((q, i) => {
      const idxList = selectedIndexes[i] || []
      idxList.forEach((optIdx) => {
        const opt = q.options[optIdx]
        if (opt && opt.optionCode) answers.push(opt.optionCode)
      })
    })
    console.log('[ai-image-quiz] 提交 answers:', answers)

    wx.showLoading({ title: '提交中', mask: true })
    try {
      const res = await submitAiQuiz({
        recordId: this._recordId,
        guestToken: this._guestToken,
        answers
      })
      console.log('[ai-image-quiz] 提交成功', res)
      const reportUrl = (res && res.data && res.data.reportUrl) || ''
      const app = getApp()
      const isLogin = !!(app && app.globalData && app.globalData.isLogin)
      if (isLogin) {
        wx.redirectTo({
          url: `/pages/webview-page/index?title=${encodeURIComponent('分析报告')}&url=${encodeURIComponent(reportUrl)}`
        })
      } else {
        const recordId = encodeURIComponent(this._recordId || '')
        const guestToken = encodeURIComponent(this._guestToken || '')
        const urlParam = reportUrl ? `&reportUrl=${encodeURIComponent(reportUrl)}` : ''
        wx.redirectTo({
          url: `/pages/analysis-auth/index?recordId=${recordId}&guestToken=${guestToken}&from=ai-image${urlParam}`
        })
      }
    } catch (err) {
      console.error('[ai-image-quiz] 提交失败', err)
      wx.showToast({ title: '提交失败，请重试', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  }
})
