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
    myCoupons: '/marketing/app/coupon/my',
    // 订单可用优惠券列表
    orderAvailableCoupons: '/order/app/marketing/coupon/available',
    // 活动列表
    activityList: '/marketing/app/activity/list',
    // 活动详情
    activityDetail: (id) => `/marketing/app/activity/${encodeURIComponent(id)}`
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
  order: {
    // 创建订单
    indentCreate: '/order/app/indent/create',
    // 创建微信支付单
    indentPayWechatCreate: '/order/app/indent/pay/wechat/create',
    // 订单列表
    indentList: '/order/app/indent/list'
  },
  recipe: {
    // 首页聚合数据
    homeIndex: '/recipe/app/home/index',
    // 配方详情
    formulaDetail: (recipeId) => `/recipe/app/formula/${encodeURIComponent(recipeId)}/detail`
  },
  favorite: {
    // 收藏分页
    page: '/uc/app/favorite/page',
    // 收藏
    create: '/uc/app/favorite',
    // 取消收藏
    remove: (bizType, bizId) => `/uc/app/favorite?bizType=${encodeURIComponent(bizType)}&bizId=${encodeURIComponent(bizId)}`
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
