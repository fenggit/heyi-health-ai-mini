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
    // 修改昵称
    updateNickname: '/uc/app/profile/nickname',
    // 修改头像
    updateAvatar: '/uc/app/profile/avatar',
    // 联系我们配置
    contactUs: '/uc/app/profile/contact-us',
    // 游客 session
    guestSession: '/auth/mini/guest/session'
  },
  agreement: {
    // 当前生效协议
    current: '/uc/app/agreement/current'
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
    // 开通会员订阅
    subscriptionOpen: '/uc/app/member/subscription/open',
    // 积分兑换优惠券
    exchangeCoupon: '/uc/app/member/points/exchange/coupon'
  },
  marketing: {
    // 可兑换积分商品列表
    pointsGoodsAvailable: '/marketing/app/points-goods/available',
    // 我的优惠券列表
    myCoupons: '/marketing/app/coupon/my',
    // 邀请好友首页
    referralCodeIndex: '/marketing/app/referral-code/index',
    // 订单可用优惠券列表
    orderAvailableCoupons: '/order/app/marketing/coupon/available',
    // 活动列表
    activityList: '/marketing/app/activity/list',
    // 活动详情
    activityDetail: (id) => `/marketing/app/activity/${encodeURIComponent(id)}`,
    // 活动报名
    activitySignup: (id) => `/marketing/app/activity/${encodeURIComponent(id)}/signup`
  },
  mall: {
    // 商城分类列表
    categoryList: '/mall/app/category/list',
    // 商城商品分页
    spuPage: '/mall/app/spu/page',
    // 商城商品详情
    spuDetail: (spuId) => `/mall/app/spu/${encodeURIComponent(spuId)}`,
    // 购物车信息
    cart: '/mall/app/cart',
    // 勾选/取消勾选购物车商品
    cartItemCheck: '/mall/app/cart/item/check',
    // 修改购物车商品数量
    cartItemQty: '/mall/app/cart/item/qty',
    // 删除购物车商品
    cartItemDelete: (itemId) => `/mall/app/cart/item/${encodeURIComponent(itemId)}`,
    // 加入购物车
    cartAdd: '/mall/app/cart/add'
  },
  address: {
    // 新增收货地址
    create: '/uc/app/address',
    // 收货地址列表
    list: '/uc/app/address/list',
    // 设置默认收货地址
    setDefault: (id) => `/uc/app/address/${encodeURIComponent(id)}/default`
  },
  location: {
    // 根据经纬度解析城市
    city: '/uc/app/location/city'
  },
  order: {
    // 创建订单
    indentCreate: '/order/app/indent/create',
    // 取消订单
    indentCancel: '/order/app/indent/cancel',
    // 创建微信支付单
    indentPayWechatCreate: '/order/app/indent/pay/wechat/create',
    // 订单列表
    indentList: '/order/app/indent/list',
    // 订单详情
    indentDetail: (orderId) => `/order/app/indent/${encodeURIComponent(orderId)}`,
    // 支付结果查询
    indentPayResult: (orderId) => `/order/app/indent/pay/result/${encodeURIComponent(orderId)}`
  },
  recipe: {
    // 首页聚合数据
    homeIndex: '/recipe/app/home/index',
    // 当前食养计划
    currentDietPlan: '/recipe/app/diet-plan/current',
    // 配方详情
    formulaDetail: (recipeId) => `/recipe/app/formula/${encodeURIComponent(recipeId)}/detail`,
    // AI 助手：创建会话
    assistantSession: '/recipe/app/assistant/session',
    // AI 助手：会话历史消息
    assistantSessionMessages: (sessionId) =>
      `/recipe/app/assistant/session/${encodeURIComponent(sessionId)}/messages`,
    // AI 助手：发送问题
    assistantChat: '/recipe/app/assistant/chat'
  },
  favorite: {
    // 收藏分页
    page: '/uc/app/favorite/page',
    // 收藏
    create: '/uc/app/favorite',
    // 取消收藏
    remove: (bizType, bizId) => `/uc/app/favorite?bizType=${encodeURIComponent(bizType)}&bizId=${encodeURIComponent(bizId)}`
  },
  checkin: {
    // 喝汁打卡聚合视图
    juiceSummary: '/uc/app/juice-check-in/summary',
    // 喝汁打卡选项（配方列表）
    juiceOptions: '/uc/app/juice-check-in/options',
    // 喝汁打卡提交
    juiceCheckIn: '/uc/app/juice-check-in/check-in',
    // 轻断食打卡聚合视图
    fastingSummary: '/uc/app/fasting-check-in/summary',
    // 轻断食打卡选项
    fastingOptions: '/uc/app/fasting-check-in/options',
    // 轻断食打卡提交
    fastingCheckIn: '/uc/app/fasting-check-in/check-in',
    // 内容分享列表（分页）
    shareList: '/uc/app/health/share/my/list',
    // 内容分享详情
    shareDetail: (id) => `/uc/app/health/share/${encodeURIComponent(id)}`,
    // 点赞
    shareLike: (id) => `/uc/app/health/share/${encodeURIComponent(id)}/like`,
    // 取消点赞
    shareUnlike: (id) => `/uc/app/health/share/${encodeURIComponent(id)}/unlike`
  },
  resource: {
    // 通用文件上传
    uploadFile: '/resource/app/general/upload'
  },
  assessment: {
    // 获取问卷详情
    questionnaireDetail: '/assessment/app/questionnaire/detail',
    // 初始化问卷（创建测评记录 + 返回问卷详情）
    questionnaireInit: '/assessment/app/questionnaire/init',
    // 提交问卷答案
    questionnaireSubmit: '/assessment/app/questionnaire/submit',
    // 获取测评结果详情
    resultDetail: '/assessment/app/result/detail',
    // AI 视觉分析：开始测评
    aiStart: '/assessment/app/ai/start',
    // AI 视觉分析：上传图片
    aiStartWithImages: '/assessment/app/ai/start-with-images',
    // AI 视觉分析：获取题目
    aiInquiry: '/assessment/app/ai/inquiry',
    // AI 视觉分析：提交答案
    aiSubmit: '/assessment/app/ai/submit'
  }
}

module.exports = paths
