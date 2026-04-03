const { getLayoutMetrics } = require("../../utils/layout")

const MOCK_PACK_DATA = {
  id: "yang-wei-qi-xue",
  name: "养胃气血汁",
  description: "富含铁质和维生素C的配方，有助于补血养气，改善春季疲乏。",
  tags: ["补气血", "养脾胃", "春季养生"],
  price: "68",
  kcal: "180",
  tipText: "所有食材已按比例配好，一包可制作2人份。",
  image: "/assets/test/home-banner2.png",
  ingredients: [
    { name: "红枣", amount: "5 颗" },
    { name: "枸杞", amount: "10 g" },
    { name: "胡萝卜", amount: "1 根" },
    { name: "苹果", amount: "1 个" },
    { name: "柠檬", amount: "半个" },
    { name: "蜂蜜", amount: "适量" }
  ],
  steps: [
    "将红枣去核，枸杞清洗干净备用",
    "将所有食材放入破壁机中",
    "加入适量温水，搅打2-3分钟",
    "过滤后加入柠檬汁和蜂蜜调味",
    "倒入杯中即可饮用"
  ],
  effects: [
    "补气养血：红枣和枸杞富含铁质",
    "促进消化：胡萝卜有助于脾胃健康",
    "增强免疫：维生素C提升抵抗力",
    "美容养颜：抗氧化成分保护肌肤"
  ]
}

Page({
  data: {
    // layout
    topInset: 72,
    statusBarHeight: 20,
    navBarHeight: 44,
    menuWidth: 88,
    menuHeight: 32,
    menuTop: 26,
    menuRight: 12,
    safeAreaBottom: 0,
    // page
    packInfo: {},
    qty: 1,
    qtySelected: false, // false=未选择(只显示+按钮), true=已选择(显示减数字加)
    isLiked: false,
    cartCount: 32
  },

  onLoad() {
    this.syncLayout()
    this.setData({ packInfo: MOCK_PACK_DATA })
  },

  syncLayout() {
    const { statusBarHeight, navBarHeight, headerHeight } = getLayoutMetrics()
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const windowWidth = (windowInfo && (windowInfo.windowWidth || windowInfo.screenWidth)) || 375

    let menuWidth = 88, menuHeight = 32
    let menuTop = statusBarHeight + (navBarHeight - menuHeight) / 2
    let menuRight = 12
    if (wx.getMenuButtonBoundingClientRect) {
      const menu = wx.getMenuButtonBoundingClientRect()
      if (menu && menu.width && menu.height) {
        menuWidth = menu.width
        menuHeight = menu.height
        menuTop = menu.top || menuTop
        menuRight = Math.max(10, windowWidth - menu.right)
      }
    }
    this.setData({
      topInset: Math.max(headerHeight + 8, 72),
      statusBarHeight,
      navBarHeight,
      menuWidth,
      menuHeight,
      menuTop,
      menuRight,
      safeAreaBottom: getLayoutMetrics().safeBottom-10 || 0
    })
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: "/pages/home/index" })
  },

  // 第一次点击加购：切换到数量控制模式
  onFirstAdd() {
    this.setData({ qtySelected: true, qty: 1 })
  },

  increaseQty() {
    this.setData({ qty: this.data.qty + 1 })
  },

  decreaseQty() {
    if (this.data.qty <= 1) {
      // 减到0时退回未选择状态
      this.setData({ qty: 1, qtySelected: false })
      return
    }
    this.setData({ qty: this.data.qty - 1 })
  },

  toggleLike() {
    this.setData({ isLiked: !this.data.isLiked })
  },

  openCart() {
    wx.navigateTo({ url: "/pages/cart/index" })
  },

  onShare() {
    wx.showToast({ title: "分享功能开发中", icon: "none" })
  },

  playVideo() {
    wx.showToast({ title: "视频播放开发中", icon: "none" })
  }
})
