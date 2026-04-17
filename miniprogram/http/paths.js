/**
 * API 路径常量
 * 所有接口路径统一在此维护
 */
const paths = {
  auth: {
    // 微信小程序手机号登录
    miniPhoneLogin: '/auth/mini/phone/login',
    // 当前登录用户信息
    currentUserProfile: '/auth/user/profile/current',
    // 游客 session
    guestSession: '/auth/mini/guest/session'
  },
  qrcode: {
    // 生成带 scene 参数的小程序码（返回 base64 图片）
    generateMiniCode: '/wechat/mini/qrcode/generate'
  },
  member: {
    // 积分中心
    pointsCenter: '/uc/app/member/points/center',
    // 积分获取规则
    pointsRules: '/uc/app/member/points/rules',
    // 会员升级页
    upgradePage: '/uc/app/member/points/upgrade-page',
    // 积分兑换优惠券
    exchangeCoupon: '/uc/app/member/points/exchange/coupon'
  },
  marketing: {
    // 可兑换积分商品列表
    pointsGoodsAvailable: '/marketing/app/points-goods/available',
    // 我的优惠券列表
    myCoupons: '/marketing/app/coupon/my'
  },
  assessment: {
    // 获取问卷详情
    questionnaireDetail: '/assessment/app/questionnaire/detail',
    // 初始化问卷（创建测评记录 + 返回问卷详情）
    questionnaireInit: '/assessment/app/questionnaire/init',
    // 提交问卷答案
    questionnaireSubmit: '/assessment/app/questionnaire/submit',
    // 获取测评结果详情
    resultDetail: '/assessment/app/result/detail'
  }
}

module.exports = paths
