const { getLayoutMetrics } = require("../../utils/layout")
const { post, uploadFile } = require("../../utils/request")
const paths = require("../../http/paths")

/**
 * 调用 POST /assessment/app/ai/inquiry 获取题目
 */
function fetchInquiry({ recordId, guestToken }) {
  const body = { recordId }
  if (guestToken) body.guestToken = guestToken
  return post(paths.assessment.aiInquiry, body)
}

const MOCK_UPLOAD_DATA = {
  title: "视觉AI分析",
  subTitle: "通过舌苔和面色辅助判断体质",
  intro:
    "通过舌苔颜色、厚薄、湿润度和面部气色，AI可以辅助判断您的寒热虚实体质特征，结合问卷答题获得更精准的体质报告。",
  introNotice: "本结果由AI生成，仅供娱乐与生活参考，不能替代医疗建议。",
  tongueDesc: "辅助判断内热或虚寒",
  sublingualDesc: "辅助判断气血运行状态",
  faceDesc: "分析气色和面部特征",
  tongueTip: "张嘴伸舌，舌头平展，自然光线下拍摄，确保舌苔清晰可见。",
  sublingualTip: "抬起舌头，露出舌下静脉，自然光线下拍摄，确保舌下纹路清晰可见。",
  faceTip: "正面平视，表情自然，确保面部光线均匀，不要化浓妆。"
}

/**
 * 获取当前 guestToken（未登录时从 globalData 取）
 */
function getGuestToken() {
  const app = getApp()
  if (app && app.globalData && app.globalData.isLogin) return ''
  return (app && app.globalData && app.globalData.guestSession && app.globalData.guestSession.guestToken) || ''
}

/**
 * 调用 POST /assessment/app/ai/start 开始测评，返回 recordId 和 recordNo
 */
function startAiAssessment(guestToken) {
  const body = {
    providerCode: 'MACRO_CURA',
    scene: 1
  }
  if (guestToken) body.guestToken = guestToken
  return post(paths.assessment.aiStart, body).then((res) => {
    const data = (res && res.data) || {}
    return {
      recordId: data.id || data.recordId,
      recordNo: data.recordNo
    }
  })
}

/**
 * 上传单张图片 POST /assessment/app/ai/start-with-images（multipart/form-data）
 * imageType: TF=舌苔 TB=舌下 FF=面色
 */
function uploadAiImage({ recordId, guestToken, imageType, filePath }) {
  return uploadFile({
    url: paths.assessment.aiStartWithImages,
    filePath,
    name: 'imageFile',
    formData: Object.assign(
      { recordId: String(recordId), imageType },
      guestToken ? { guestToken } : {}
    ),
    showLoading: false
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
    title: "",
    subTitle: "",
    intro: "",
    introNotice: "",
    tongueDesc: "",
    sublingualDesc: "",
    faceDesc: "",
    tongueTip: "",
    sublingualTip: "",
    faceTip: "",
    tongueImage: "",
    sublingualImage: "",
    faceImage: ""
  },
  // 测评记录 ID（start 接口返回）
  _recordId: null,
  _guestToken: '',

  onLoad(options) {
    this._guestToken = (options && options.guestToken) || getGuestToken()
    this.syncLayout()
    this.loadPageData()
    this.initAssessment()
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

  loadPageData() {
    this.setData(JSON.parse(JSON.stringify(MOCK_UPLOAD_DATA)))
  },

  async initAssessment() {
    wx.showLoading({ title: '准备中...', mask: true })
    try {
      const { recordId, recordNo } = await startAiAssessment(this._guestToken)
      this._recordId = recordId
      console.log('[analysis-ai-image] start 成功, recordId:', recordId, 'recordNo:', recordNo)
    } catch (err) {
      console.error('[analysis-ai-image] start 失败', err)
      wx.showToast({ title: '初始化失败，请重试', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  chooseImage(target, sourceType) {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType,
      success: async (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (!file) return

        // 先更新预览
        const imageKey = target === 'tongue' ? 'tongueImage' : target === 'sublingual' ? 'sublingualImage' : 'faceImage'
        this.setData({ [imageKey]: file.tempFilePath })

        // 上传图片
        if (!this._recordId) {
          wx.showToast({ title: '测评未初始化，请重试', icon: 'none' })
          return
        }
        const imageTypeMap = { tongue: 'TF', sublingual: 'TB', face: 'FF' }
        const imageType = imageTypeMap[target]
        wx.showLoading({ title: '上传中...', mask: true })
        try {
          await uploadAiImage({
            recordId: this._recordId,
            guestToken: this._guestToken,
            imageType,
            filePath: file.tempFilePath
          })
          console.log('[analysis-ai-image] 图片上传成功, type:', imageType)
        } catch (err) {
          console.error('[analysis-ai-image] 图片上传失败', err)
          wx.showToast({ title: '图片上传失败，请重试', icon: 'none' })
        } finally {
          wx.hideLoading()
        }
      }
    })
  },

  chooseTongueCamera() { this.chooseImage("tongue", ["camera"]) },
  chooseTongueAlbum() { this.chooseImage("tongue", ["album"]) },
  chooseSublingualCamera() { this.chooseImage("sublingual", ["camera"]) },
  chooseSublingualAlbum() { this.chooseImage("sublingual", ["album"]) },
  chooseFaceCamera() { this.chooseImage("face", ["camera"]) },
  chooseFaceAlbum() { this.chooseImage("face", ["album"]) },

  handleBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: "/pages/home/index" })
  },

  async _goQuiz() {
    if (!this._recordId) {
      wx.showToast({ title: '测评未初始化，请重试', icon: 'none' })
      return
    }
    wx.showLoading({ title: '分析中...', mask: true })
    try {
      const res = await fetchInquiry({
        recordId: this._recordId,
        guestToken: this._guestToken
      })
      const inquiryData = (res && res.data) || {}
      const recordId = encodeURIComponent(this._recordId)
      const guestToken = encodeURIComponent(this._guestToken || '')
      // 将 inquiry 返回数据序列化后通过 URL 参数传递
      const inquiryParam = encodeURIComponent(JSON.stringify(inquiryData))
      wx.redirectTo({
        url: `/pages/analysis-ai-image-quiz/index?recordId=${recordId}&guestToken=${guestToken}&inquiryData=${inquiryParam}`
      })
    } catch (err) {
      console.error('[analysis-ai-image] inquiry 失败', err)
      wx.showToast({ title: '获取题目失败，请重试', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  finish() {
    const { tongueImage, sublingualImage, faceImage } = this.data
    const missing = []
    if (!tongueImage) missing.push('舌苔')
    if (!sublingualImage) missing.push('舌下')
    if (!faceImage) missing.push('面色')
    if (missing.length > 0) {
      wx.showToast({ title: `请上传${missing.join('、')}照片`, icon: 'none', duration: 2000 })
      return
    }
    this._goQuiz()
  },

  skipAndFinish() {
    this._goQuiz()
  }
})
