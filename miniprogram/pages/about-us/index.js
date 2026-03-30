const { initMiniNav, backWithFallback } = require('../../utils/mini-nav')

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

const CONTACTS = [
  { label: '客服电话', value: '400-123-4567' },
  { label: '客服邮箱', value: 'support@heyishiyang.com' },
  { label: '工作时间', value: '周一至周日 09:00-21:00' }
]

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
    appName: '合一食养',
    version: '当前版本：V1.0.0',
    copyright: '© 2026 合一食养团队',
    mission:
      '基于中医体质理论和现代营养学，运用AI技术为每一位用户提供个性化的食养方案，帮助大家通过科学饮食改善体质，实现健康生活。',
    values: CORE_VALUES,
    teamStats: TEAM_STATS,
    resultStats: RESULT_STATS,
    contacts: CONTACTS
  },

  onLoad() {
    initMiniNav(this)
  },

  handleBack() {
    backWithFallback('/pages/profile/index')
  },

  openAgreement() {
    wx.showToast({ title: '用户协议待接入', icon: 'none' })
  },

  openPrivacy() {
    wx.showToast({ title: '隐私政策待接入', icon: 'none' })
  }
})
