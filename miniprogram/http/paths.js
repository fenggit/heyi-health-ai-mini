/**
 * API 路径常量
 * 所有接口路径统一在此维护
 */
const paths = {
  auth: {
    // 微信小程序手机号登录
    miniPhoneLogin: '/auth/mini/phone/login'
  },
  assessment: {
    // 获取问卷详情
    questionnaireDetail: '/assessment/app/questionnaire/detail'
  }
}

module.exports = paths
