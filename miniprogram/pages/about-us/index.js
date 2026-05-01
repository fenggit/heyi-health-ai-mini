const { initMiniNav, backWithFallback } = require('../../utils/mini-nav')
const request = require('../../utils/request')
const paths = require('../../http/paths')
const {
  USER_AGREEMENT_KIND,
  PRIVACY_POLICY_KIND,
  getAgreementPopupData
} = require('../../utils/agreement')

const CORE_VALUES = [
  '专业：融合传统中医智慧与现代科技',
  '个性化：针对不同体质定制专属方案',
  '安全：严选有机食材，保障健康安全',
  '易用：简单操作，轻松获得养生指导'
]

const TEAM_STATS = [
  { label: '中医专家', value: '10+' },
  { label: '营养师', value: '15+' }
]

const RESULT_STATS = [
  { label: '用户', value: '10w+' },
  { label: '测评次数', value: '50w+' },
  { label: '食养配方', value: '1000+' }
]

function normalizeText(value) {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

function buildContacts(rawConfig) {
  const config = rawConfig && typeof rawConfig === 'object' ? rawConfig : {}
  const contacts = [
    { label: '客服电话', value: normalizeText(config.servicePhone) },
    { label: '客服邮箱', value: normalizeText(config.serviceEmail) },
    { label: '工作时间', value: normalizeText(config.workTime) }
  ]

  return contacts.filter((item) => item.value)
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

    navTitle: '关于我们',
    appName: '天元食养',
    version: '当前版本：V1.0.0',
    copyright: '© 2026 天元食养团队',
    popupShow: false,
    popupTitle: '',
    popupSummary: '',
    popupContent: '',
    mission:
      '基于中医体质理论和现代营养学，运用AI技术为每一位用户提供个性化的食养方案，帮助大家通过科学饮食改善体质，实现健康生活。',
    values: CORE_VALUES,
    teamStats: TEAM_STATS,
    resultStats: RESULT_STATS,
    contacts: []
  },

  onLoad() {
    initMiniNav(this)
    this.loadContactUsConfig()
  },

  loadContactUsConfig() {
    request.get(paths.auth.contactUs, null, {
      showLoading: false,
      silentBizErrorToast: true,
      silentHttpErrorToast: true,
      silentNetworkErrorToast: true
    })
      .then((res) => {
        this.setData({
          contacts: buildContacts((res && res.data) || null)
        })
      })
      .catch((error) => {
        console.warn('[about-us] 获取联系我们配置失败:', error)
        this.setData({ contacts: [] })
      })
  },

  handleBack() {
    backWithFallback('/pages/profile/index')
  },

  openAgreementByKind(kind) {
    wx.showLoading({ title: '加载中', mask: true })
    getAgreementPopupData(kind)
      .then((agreement) => {
        this.setData({
          popupShow: true,
          popupTitle: agreement.title,
          popupSummary: agreement.summary,
          popupContent: agreement.content
        })
      })
      .catch((error) => {
        console.warn('[about-us] 获取协议内容失败:', error)
        wx.showToast({ title: '协议内容加载失败', icon: 'none' })
      })
      .finally(() => {
        wx.hideLoading()
      })
  },

  openAgreement() {
    this.openAgreementByKind(USER_AGREEMENT_KIND)
  },

  openPrivacy() {
    this.openAgreementByKind(PRIVACY_POLICY_KIND)
  },

  onPopupConfirm() {
    this.setData({
      popupShow: false
    })
  }
})
