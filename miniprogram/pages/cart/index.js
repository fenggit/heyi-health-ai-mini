const { initMiniNav, backWithFallback } = require("../../utils/mini-nav")

function formatPrice(value) {
  const numericValue = Number(value) || 0
  const fixedValue = numericValue.toFixed(1)
  return fixedValue.endsWith(".0") ? fixedValue.slice(0, -2) : fixedValue
}

function formatMoney2(value) {
  return (Number(value) || 0).toFixed(2)
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

    navTitle: "购物车",
    deliveryAddress: "",
    availableCoupons: [],
    unavailableCoupons: [],
    selectedCouponId: "",
    draftCouponId: "",
    couponTab: "available",
    couponDiscountText: "0",
    couponPickedCount: 0,
    couponPickedAmountFixed: "0.00",
    items: [],
    detailItems: [],
    shippingFeeText: "0",

    allSelected: false,
    selectedItemCount: 0,
    subtotalAmount: "0",
    effectiveDiscountText: "0",
    payableAmountText: "0",
    showAmountDetail: false,
    showCouponPicker: false,

    // 地址选择
    showAddressPicker: false,
    showAddressForm: false,
    addressList: [],
    selectedAddressId: "",
    draftAddressId: "",
    editAddressId: "",
  },

  onLoad() {
    initMiniNav(this)
    this._loadCartData()
  },

  // TODO: 替换为真实接口请求
  _loadCartData() {
    // 模拟接口返回数据
    const res = {
      deliveryAddress: "送至：四川省成都市某某区某街道...",
      items: [
        {
          id: "nourish",
          name: "养胃气血汁水",
          tags: ["补气血", "养脾胃"],
          price: 68,
          count: 2,
          selected: true,
          image: "/assets/test/home-banner2.png"
        },
        {
          id: "liver-eye",
          name: "清肝明目汁",
          tags: ["清肝火", "明目"],
          price: 58,
          count: 1,
          selected: true,
          image: "/assets/mall/product-jujube.png"
        },
        {
          id: "moisturize",
          name: "润燥生津汁",
          tags: ["滋阴", "润燥"],
          price: 72,
          count: 1,
          selected: false,
          image: "/assets/mall/product-apple.png"
        }
      ],
      availableCoupons: [
        { id: "coupon-10", amount: 10, threshold: 100, expireDate: "2026-04-30", available: true },
        { id: "coupon-5", amount: 5, threshold: 50, expireDate: "2026-04-30", available: true }
      ],
      unavailableCoupons: [
        { id: "coupon-u1", amount: 20, threshold: 200, expireDate: "2026-04-30", available: false },
        { id: "coupon-u2", amount: 15, threshold: 150, expireDate: "2026-04-30", available: false },
        { id: "coupon-u3", amount: 12, threshold: 120, expireDate: "2026-04-30", available: false },
        { id: "coupon-u4", amount: 8, threshold: 80, expireDate: "2026-04-30", available: false },
        { id: "coupon-u5", amount: 6, threshold: 60, expireDate: "2026-04-30", available: false },
        { id: "coupon-u6", amount: 3, threshold: 30, expireDate: "2026-04-30", available: false }
      ],
      selectedCouponId: "coupon-10",
      addressList: [
        {
          id: "addr-1",
          name: "李先生",
          phone: "136 8888 9999",
          address: "四川省成都市双流区XXX街道XXX小区136号多多驿站",
          isDefault: false
        },
        {
          id: "addr-2",
          name: "李先生",
          phone: "136 8888 9999",
          address: "四川省成都市双流区XXX街道XXX小区136号多多驿站",
          isDefault: true
        }
      ],
      selectedAddressId: "addr-2"
    }

    this.setData(
      {
        deliveryAddress: res.deliveryAddress,
        items: res.items,
        availableCoupons: res.availableCoupons,
        unavailableCoupons: res.unavailableCoupons,
        selectedCouponId: res.selectedCouponId,
        addressList: res.addressList,
        selectedAddressId: res.selectedAddressId
      },
      () => this.syncSummary()
    )
  },

  handleBack() {
    backWithFallback("/pages/mall/index")
  },

  changeAddress() {
    this.setData({
      showAddressPicker: true,
      showCouponPicker: false,
      showAmountDetail: false,
      draftAddressId: this.data.selectedAddressId
    })
  },

  closeAddressPicker() {
    this.setData({ showAddressPicker: false, showAddressForm: false })
  },

  stopAddressPickerTap() {},

  selectAddress(e) {
    const { id } = e.currentTarget.dataset
    this.setData({ draftAddressId: id })
  },

  confirmAddressPicker() {
    const { draftAddressId, addressList } = this.data
    const addr = addressList.find(a => a.id === draftAddressId)
    this.setData({
      selectedAddressId: draftAddressId,
      deliveryAddress: addr ? `送至：${addr.address}` : this.data.deliveryAddress,
      showAddressPicker: false,
      showAddressForm: false
    })
  },

  cancelAddressPicker() {
    this.setData({ showAddressPicker: false, showAddressForm: false })
  },

  deleteAddress(e) {
    const { id } = e.currentTarget.dataset
    const nextList = this.data.addressList.filter(a => a.id !== id)
    this.setData({ addressList: nextList })
  },

  openAddressForm() {
    this.setData({
      showAddressForm: true,
      editAddressId: "",
      newAddress: { name: "", phone: "", address: "", gender: "male" }
    })
  },

  openEditAddressForm(e) {
    const { id } = e.currentTarget.dataset
    const addr = this.data.addressList.find(a => a.id === id)
    if (!addr) return
    this.setData({
      showAddressPicker: false,
      showAddressForm: true,
      editAddressId: id,
      newAddress: {
        name: addr.name,
        phone: addr.phone,
        address: addr.address,
        gender: addr.gender || "male"
      }
    })
  },

  closeAddressForm() {
    this.setData({ showAddressForm: false })
  },

  onNewAddressInput(e) {
    const { field } = e.currentTarget.dataset
    const newAddress = { ...this.data.newAddress, [field]: e.detail.value }
    this.setData({ newAddress })
  },

  onGenderTap(e) {
    const { gender } = e.currentTarget.dataset
    this.setData({ newAddress: { ...this.data.newAddress, gender } })
  },

  saveNewAddress() {
    const { name, phone, address } = this.data.newAddress
    if (!name || !phone || !address) {
      wx.showToast({ title: "请填写完整信息", icon: "none" })
      return
    }
    const { editAddressId, addressList } = this.data
    if (editAddressId) {
      // 编辑模式：更新已有地址
      const nextList = addressList.map(a =>
        a.id === editAddressId
          ? { ...a, name, phone, address, gender: this.data.newAddress.gender }
          : a
      )
      this.setData({ addressList: nextList, showAddressForm: false, editAddressId: "" })
    } else {
      // 新增模式
      const newItem = {
        id: `addr-${Date.now()}`,
        name,
        phone,
        address,
        gender: this.data.newAddress.gender,
        isDefault: false
      }
      this.setData({
        addressList: [...addressList, newItem],
        showAddressForm: false
      })
    }
  },

  toggleItem(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    const nextItems = this.data.items.map((item) => {
      if (item.id !== id) return item
      return {
        ...item,
        selected: !item.selected
      }
    })
    this.setData(
      {
        items: nextItems
      },
      () => this.syncSummary()
    )
  },

  toggleAll() {
    const nextSelected = !this.data.allSelected
    const nextItems = this.data.items.map((item) => ({
      ...item,
      selected: nextSelected
    }))
    this.setData(
      {
        items: nextItems
      },
      () => this.syncSummary()
    )
  },

  increaseCount(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    const nextItems = this.data.items.map((item) => {
      if (item.id !== id) return item
      return {
        ...item,
        count: Number(item.count || 0) + 1
      }
    })
    this.setData(
      {
        items: nextItems
      },
      () => this.syncSummary()
    )
  },

  decreaseCount(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    const nextItems = this.data.items.map((item) => {
      if (item.id !== id) return item
      return {
        ...item,
        count: Math.max(1, Number(item.count || 1) - 1)
      }
    })
    this.setData(
      {
        items: nextItems
      },
      () => this.syncSummary()
    )
  },

  openCouponPicker() {
    this.setData(
      {
        showCouponPicker: true,
        showAmountDetail: false,
        couponTab: "available",
        draftCouponId: this.data.selectedCouponId
      },
      () => this.syncCouponPreview()
    )
  },

  closeCouponPicker() {
    this.setData({
      showCouponPicker: false,
      draftCouponId: this.data.selectedCouponId
    })
  },

  stopCouponPickerTap() {},

  switchCouponTab(e) {
    const { tab } = e.currentTarget.dataset
    if (tab !== "available" && tab !== "unavailable") return
    this.setData({
      couponTab: tab
    })
  },

  chooseCoupon(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    const exists = this.data.availableCoupons.some((coupon) => coupon.id === id)
    if (!exists) return
    this.setData(
      {
        draftCouponId: id
      },
      () => this.syncCouponPreview()
    )
  },

  chooseNoCoupon() {
    this.setData(
      {
        draftCouponId: ""
      },
      () => this.syncCouponPreview()
    )
  },

  cancelCouponPicker() {
    this.setData({
      showCouponPicker: false,
      draftCouponId: this.data.selectedCouponId
    })
  },

  confirmCouponPicker() {
    this.setData(
      {
        selectedCouponId: this.data.draftCouponId,
        showCouponPicker: false
      },
      () => this.syncSummary()
    )
  },

  syncCouponPreview() {
    const activeId = this.data.draftCouponId
    const coupon = this.data.availableCoupons.find((item) => item.id === activeId)
    const pickedAmount = coupon ? Number(coupon.amount || 0) : 0
    this.setData({
      couponPickedCount: coupon ? 1 : 0,
      couponPickedAmountFixed: formatMoney2(pickedAmount)
    })
  },

  openAmountDetail() {
    this.setData({
      showAmountDetail: !this.data.showAmountDetail,
      showCouponPicker: false
    })
  },

  closeAmountDetail() {
    this.setData({
      showAmountDetail: false
    })
  },

  stopDetailSheetTap() {},

  checkout() {
    if (!this.data.selectedItemCount) {
      wx.showToast({
        title: "请先勾选商品",
        icon: "none"
      })
      return
    }
    wx.showToast({
      title: "结算能力待接入",
      icon: "none"
    })
  },

  syncSummary() {
    const { items, availableCoupons, selectedCouponId } = this.data
    const selectedItems = items.filter((item) => item.selected)
    const selectedItemCount = selectedItems.length
    const subtotal = selectedItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.count || 0), 0)
    const selectedCoupon = availableCoupons.find((coupon) => coupon.id === selectedCouponId)
    const selectedCouponAmount = selectedCoupon ? Number(selectedCoupon.amount || 0) : 0
    const effectiveDiscount = selectedItemCount > 0 ? Math.min(selectedCouponAmount, subtotal) : 0
    const payableAmount = Math.max(subtotal - effectiveDiscount, 0)
    const allSelected = items.length > 0 && items.every((item) => item.selected)
    const detailItems = selectedItems.map((item) => ({
      id: item.id,
      image: item.image,
      count: item.count
    }))

    this.setData({
      allSelected,
      selectedItemCount,
      detailItems,
      couponDiscountText: formatPrice(selectedCouponAmount),
      couponPickedCount: selectedCoupon ? 1 : 0,
      couponPickedAmountFixed: formatMoney2(selectedCouponAmount),
      subtotalAmount: formatPrice(subtotal),
      effectiveDiscountText: formatPrice(effectiveDiscount),
      payableAmountText: formatPrice(payableAmount)
    })
  }
})
