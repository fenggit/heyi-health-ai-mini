const { getMiniNavData, backWithFallback } = require("../../utils/mini-nav")
const { generateMiniCode } = require("../../http/qrcode")

// 小程序码 scene 最大 32 字节
const QR_SCENE = "source=qr"
const ANALYSIS_PAGE_PATH = "pages/analysis/index"

const PAGE_DATA = {
  navTitle: "体质测评",
  welcomeTitle: "欢迎来到合一食养",
  welcomeSubtitle: "AI智能体质测评·个性化食养方案",
  tag: "体质测评",
  metrics: [
    { id: "duration", value: "3", label: "分钟测评" },
    { id: "types", value: "9", label: "大体质" },
    { id: "expert", value: "1V1", label: "专家指导" }
  ],
  benefitsTitle: "您将获得：",
  benefits: [
    "AI精准分析的9大体质评分",
    "个性化定制的食养调理方案",
    "每日健康数据追踪与建议",
    "中医专家在线一对一咨询"
  ],
  scanTitle: "扫码测评",
  scanHint: "长按二维码保存 开始测评"
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
    navTitle: "",
    welcomeTitle: "",
    welcomeSubtitle: "",
    tag: "",
    metrics: [],
    benefitsTitle: "",
    benefits: [],
    scanTitle: "",
    scanHint: "",
    qrImage: "",
    qrLoading: true,
    qrTempPath: ""
  },

  onLoad() {
    this.setData({
      ...getMiniNavData(),
      ...PAGE_DATA
    })
    this._loadMiniCode()
  },

  _loadMiniCode() {
    this.setData({ qrLoading: true })
    generateMiniCode({
      scene: QR_SCENE,
      page: ANALYSIS_PAGE_PATH
    }).then((res) => {
      const rawImage = this._extractQrImage(res && res.data)
      if (!rawImage) {
        throw new Error("二维码返回为空")
      }
      return this._toTempImagePath(rawImage).then((tempPath) => {
        this.setData({
          qrImage: tempPath,
          qrTempPath: tempPath,
          qrLoading: false
        })
        console.log("[qr-page] 小程序码生成成功, scene:", QR_SCENE)
      })
    }).catch((err) => {
      console.error("[qr-page] 小程序码生成失败:", err)
      this.setData({ qrLoading: false })
      wx.showToast({
        title: "二维码生成失败，请稍后重试",
        icon: "none"
      })
    })
  },

  _extractQrImage(rawData) {
    if (!rawData) return ""
    if (typeof rawData === "string") return rawData.trim()
    if (typeof rawData !== "object") return ""

    const candidates = [
      rawData.data,
      rawData.result,
      rawData.base64,
      rawData.imageBase64,
      rawData.qrBase64,
      rawData.qrcodeBase64,
      rawData.image,
      rawData.url,
      rawData.imageUrl,
      rawData.qrcodeUrl,
      rawData.qrCodeUrl
    ]
    const hit = candidates.find((item) => typeof item === "string" && item.trim())
    return hit ? hit.trim() : ""
  },

  _toTempImagePath(rawImage) {
    if (/^wxfile:\/\//.test(rawImage)) return Promise.resolve(rawImage)
    if (/^https?:\/\//.test(rawImage)) return this._downloadToTemp(rawImage)
    if (/^\/\//.test(rawImage)) return this._downloadToTemp(`https:${rawImage}`)

    const dataUriMatch = rawImage.match(/^data:image\/[a-zA-Z+]+;base64,(.+)$/)
    const base64Body = dataUriMatch ? dataUriMatch[1] : rawImage
    if (!/^[A-Za-z0-9+/=\r\n]+$/.test(base64Body)) {
      return Promise.reject(new Error("无法识别二维码图片格式"))
    }
    return this._writeBase64ToTemp(base64Body)
  },

  _downloadToTemp(url) {
    return new Promise((resolve, reject) => {
      wx.downloadFile({
        url,
        success: (res) => {
          if (res.statusCode !== 200 || !res.tempFilePath) {
            reject(new Error(`下载二维码失败: ${res.statusCode}`))
            return
          }
          resolve(res.tempFilePath)
        },
        fail: reject
      })
    })
  },

  _writeBase64ToTemp(base64Data) {
    return new Promise((resolve, reject) => {
      const filePath = `${wx.env.USER_DATA_PATH}/mini-code-${Date.now()}.png`
      wx.getFileSystemManager().writeFile({
        filePath,
        data: base64Data,
        encoding: "base64",
        success: () => resolve(filePath),
        fail: reject
      })
    })
  },

  _saveImage(filePath) {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => wx.showToast({ title: "已保存到相册", icon: "success" }),
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes("auth deny")) {
          wx.showModal({
            title: "需要相册权限",
            content: "请在设置中允许访问相册",
            confirmText: "去设置",
            success: (res) => { if (res.confirm) wx.openSetting() }
          })
        } else {
          wx.showToast({ title: "保存失败", icon: "none" })
        }
      }
    })
  },

  saveQrCode() {
    const { qrLoading, qrTempPath } = this.data
    if (qrLoading || !qrTempPath) {
      wx.showToast({ title: "二维码生成中，请稍候", icon: "none" })
      return
    }
    this._saveImage(qrTempPath)
  },

  handleBack() {
    backWithFallback("/pages/home/index")
  }
})
