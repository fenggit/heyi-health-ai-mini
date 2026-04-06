const { getMiniNavData, backWithFallback } = require("../../utils/mini-nav")

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
  qrImage: "/assets/analysis/constitution_qr.png",
  scanHint: "长按保存二维码 开始测评"
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
    qrImage: "",
    scanHint: ""
  },
  onLoad() {
    this.setData({
      ...getMiniNavData(),
      ...PAGE_DATA
    })
  },
  handleBack() {
    backWithFallback("/pages/home/index")
  },
  previewQr() {
    wx.previewImage({
      current: this.data.qrImage,
      urls: [this.data.qrImage]
    })
  }
})
