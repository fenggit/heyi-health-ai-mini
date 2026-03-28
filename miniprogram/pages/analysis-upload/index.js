const { getLayoutMetrics } = require("../../utils/layout")

const MOCK_UPLOAD_DATA = {
  title: "视觉AI分析",
  subTitle: "通过舌苔和面色辅助判断体质",
  intro:
    "通过舌苔颜色、厚薄、湿润度和面部气色，AI可辅助判断寒热虚实体质特征，结合问卷答题获得更精准的体质报告。",
  tongueTip: "张嘴伸舌，舌头平展，自然光线下拍摄，确保舌苔清晰可见。",
  faceTip: "正面平视，表情自然，确保面部光线均匀，不要化浓妆。"
}

function fetchUploadData() {
  // TODO: 后续替换为上传页接口文案
  return Promise.resolve(JSON.parse(JSON.stringify(MOCK_UPLOAD_DATA)))
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
    tongueTip: "",
    faceTip: "",
    tongueImage: "",
    faceImage: ""
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
    const payload = await fetchUploadData()
    this.setData(payload)
  },
  chooseImage(target, sourceType) {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType,
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (!file) return
        if (target === "tongue") {
          this.setData({ tongueImage: file.tempFilePath })
        } else {
          this.setData({ faceImage: file.tempFilePath })
        }
      }
    })
  },
  chooseTongueCamera() {
    this.chooseImage("tongue", ["camera"])
  },
  chooseTongueAlbum() {
    this.chooseImage("tongue", ["album"])
  },
  chooseFaceCamera() {
    this.chooseImage("face", ["camera"])
  },
  chooseFaceAlbum() {
    this.chooseImage("face", ["album"])
  },
  handleBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: "/pages/home/index" })
  },
  skipAndFinish() {
    wx.showToast({
      title: "已跳过拍照，后续可补充上传",
      icon: "none"
    })
  },
  finish() {
    wx.showToast({
      title: "演示版：报告生成功能待接入",
      icon: "none"
    })
  }
})
