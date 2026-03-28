const { getLayoutMetrics } = require("../../utils/layout")

const MOCK_ANALYSIS_INTRO = {
  introTitle: "开始前，请仔细阅读以下重要说明",
  introSubTitle: "使用须知与免责声明",
  declaration:
    "本服务为AI趣味分析工具，非医疗诊断。所有内容仅供娱乐与生活参考，不能替代执业医师的诊断、治疗或建议。如有健康问题，请立即咨询正规医疗机构。",
  aiContentTitle: "AI生成内容说明",
  aiContent:
    "本结果由AI生成，可能存在误差，仅供参考，分析结果基于您提供的信息和照片，不具备医学诊断价值。",
  bullets: [
    "本服务不提供任何医疗诊断或治疗建议",
    "分析结果仅供娱乐和生活参考",
    "不能用于疾病诊断、治疗或预防",
    "不能替代专业医疗机构的检查和建议",
    "如感到身体不适，请及时就医"
  ],
  extras: ["中医专家讲座：春季养肝护脾", "免费AI体质测评", "养生茶饮品鉴体验", "定制食养方案咨询"],
  agreementText:
    "我已仔细阅读并充分理解上述内容，同意本服务仅作为趣味参考工具使用，不作为医疗诊断依据。我明白如有健康问题应当咨询正规医疗机构。"
}

function fetchAnalysisIntro() {
  // TODO: 后续替换为服务端返回的免责声明文案
  return Promise.resolve(JSON.parse(JSON.stringify(MOCK_ANALYSIS_INTRO)))
}

Page({
  data: {
    topInset: 32,
    agreed: false,
    introTitle: "",
    introSubTitle: "",
    declaration: "",
    aiContentTitle: "",
    aiContent: "",
    bullets: [],
    extras: [],
    agreementText: ""
  },
  onLoad() {
    this.syncLayout()
    this.loadPageData()
  },
  syncLayout() {
    const { statusBarHeight } = getLayoutMetrics()
    this.setData({
      topInset: Math.max(statusBarHeight + 12, 32)
    })
  },
  async loadPageData() {
    const payload = await fetchAnalysisIntro()
    this.setData(payload)
  },
  toggleAgree() {
    this.setData({
      agreed: !this.data.agreed
    })
  },
  backHome() {
    wx.switchTab({ url: "/pages/home/index" })
  },
  startQuiz() {
    if (!this.data.agreed) {
      wx.showToast({
        title: "请先阅读并勾选同意",
        icon: "none"
      })
      return
    }
    wx.navigateTo({ url: "/pages/analysis-quiz/index" })
  }
})
