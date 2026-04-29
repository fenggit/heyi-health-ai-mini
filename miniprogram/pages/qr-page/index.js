const { getMiniNavData, backWithFallback } = require("../../utils/mini-nav")
const request = require("../../utils/request")

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
    this._loadQrImage()
  },

  onShow() {
    this._loadQrImage(true)
  },

  _loadQrImage(silent = false) {
    this.setData({ qrLoading: true })
    const app = getApp()
    const userInfo = (app && app.globalData && app.globalData.userInfo) || {}
    const rawImage = this._extractQrImage(userInfo.analysisQrCodeUrl)
    console.log("[qr-page] userInfo.analysisQrCodeUrl:", rawImage)
    this._applyQrImage(rawImage, silent)
  },

  _applyQrImage(rawImage, silent = false) {
    if (rawImage && rawImage === this._lastQrSource && this.data.qrImage) {
      this.setData({ qrLoading: false })
      return
    }
    if (!rawImage) {
      this._lastQrSource = ""
      this.setData({ qrImage: "", qrTempPath: "", qrLoading: false })
      if (!silent) {
        wx.showToast({
          title: "暂无二维码",
          icon: "none"
        })
      }
      return
    }

    this._toTempImagePath(rawImage).then((tempPath) => {
      this._lastQrSource = rawImage
      this.setData({
        qrImage: tempPath,
        qrTempPath: tempPath,
        qrLoading: false
      })
    }).catch((err) => {
      console.error("[qr-page] 二维码加载失败:", err)
      this.setData({ qrLoading: false })
      if (err && (Number(err.code) === 401 || Number(err.statusCode) === 401)) {
        return
      }
      if (!silent) {
        wx.showToast({
          title: "暂无二维码",
          icon: "none"
        })
      }
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
    return request.downloadFile({
      url,
      withAuth: false,
      silentHttpErrorToast: true,
      silentNetworkErrorToast: true
    }).then((res) => {
      if (!res.tempFilePath) {
        throw new Error(`下载二维码失败: ${res.statusCode}`)
      }
      return res.tempFilePath
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

  handleBack() {
    backWithFallback("/pages/home/index")
  }
})
