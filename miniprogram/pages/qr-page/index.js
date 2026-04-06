const { getMiniNavData, backWithFallback } = require("../../utils/mini-nav")
const QRCode = require("../../utils/weapp-qrcode")

// 二维码内容：扫码后跳转到 analysis 页，scene 参数会透传
// 微信小程序码的 scene 最大 32 字节，这里用 source=qr 作为标识
const QR_SCENE = "source=qr"
// canvas 绘制尺寸（px），与 wxml 中 canvas 的 width/height 保持一致
const QR_SIZE = 200

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
    qrSize: QR_SIZE,
    // canvas 渲染完成后导出的临时图片路径，用于长按保存
    qrTempPath: ""
  },

  onLoad() {
    this.setData({
      ...getMiniNavData(),
      ...PAGE_DATA
    })
    // 等 canvas 节点渲染完成后再绘制
    wx.nextTick(() => this._drawQrCode())
  },

  _drawQrCode() {
    const self = this
    new QRCode("qr-canvas", {
      usingIn: self,
      text: QR_SCENE,
      width: QR_SIZE,
      height: QR_SIZE,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    })
    // canvas 绘制是同步的，nextTick 后导出临时路径
    wx.nextTick(() => {
      wx.canvasToTempFilePath({
        canvasId: "qr-canvas",
        width: QR_SIZE,
        height: QR_SIZE,
        destWidth: QR_SIZE * 3,
        destHeight: QR_SIZE * 3,
        success: (res) => {
          self.setData({ qrTempPath: res.tempFilePath })
          console.log("[qr-page] 二维码生成成功, scene:", QR_SCENE)
        },
        fail: (err) => {
          console.warn("[qr-page] 导出二维码图片失败:", err)
        }
      }, self)
    })
  },

  // 长按保存二维码到相册
  saveQrCode() {
    const { qrTempPath } = this.data
    if (!qrTempPath) {
      wx.showToast({ title: "二维码生成中，请稍候", icon: "none" })
      return
    }
    wx.saveImageToPhotosAlbum({
      filePath: qrTempPath,
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

  handleBack() {
    backWithFallback("/pages/home/index")
  }
})
