const { initMiniNav, backWithFallback } = require("../../utils/mini-nav")
const { get, put } = require("../../utils/request")
const paths = require("../../http/paths")

const DEFAULT_DELIVERY_ADDRESS = "请选择收货地址"
const PERMANENT_VALID_TEXT = "永久有效"
const DEFAULT_ADDRESS_LIST = [
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
    address: "四川省成都市高新区XXX街道XXX小区8栋2单元501",
    isDefault: true
  }
]

function formatPrice(value) {
  const numericValue = Number(value) || 0
  const fixedValue = numericValue.toFixed(1)
  return fixedValue.endsWith(".0") ? fixedValue.slice(0, -2) : fixedValue
}

function formatMoney2(value) {
  return (Number(value) || 0).toFixed(2)
}

function normalizeCouponList(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== "object") return []

  const directListKeys = ["records", "list", "items", "rows", "couponList", "result"]
  for (const key of directListKeys) {
    if (Array.isArray(data[key])) return data[key]
  }

  const groupedKeyMap = {
    unusedList: "unused",
    usedList: "used",
    expiredList: "expired"
  }
  const merged = []
  Object.keys(groupedKeyMap).forEach((key) => {
    if (Array.isArray(data[key])) {
      const groupStatus = groupedKeyMap[key]
      merged.push(
        ...data[key].map((item) => ({
          ...(item || {}),
          __groupStatus: groupStatus
        }))
      )
    }
  })
  return merged
}

function getCouponStatus(raw) {
  const status = String(raw.couponStatus || "").toUpperCase()
  const pageTabType = String(raw.pageTabType || "").toUpperCase()
  if (status === "EXPIRED") return "expired"
  if (status === "USED") return "used"
  if (status === "UNUSED") return "unused"
  if (raw.__groupStatus === "expired") return "expired"
  if (raw.__groupStatus === "used") return "used"
  if (raw.__groupStatus === "unused") return "unused"
  if (pageTabType === "UNUSED") return "unused"
  if (pageTabType === "USED") return "used"
  return "unused"
}

function toCanUse(value) {
  if (value === true || value === false) return value
  if (typeof value === "number") return value === 1
  if (typeof value === "string") {
    const text = value.trim().toLowerCase()
    return text === "1" || text === "true" || text === "yes"
  }
  return false
}

function toExpireDateText(value) {
  if (value == null || value === "") return PERMANENT_VALID_TEXT
  const text = String(value).trim().replace(/\//g, "-")
  const datePart = text.includes("T") ? text.split("T")[0] : text.split(" ")[0]
  const m = datePart.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) {
    const month = String(Number(m[2])).padStart(2, "0")
    const day = String(Number(m[3])).padStart(2, "0")
    return `${m[1]}.${month}.${day}`
  }
  const d = new Date(text)
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}.${month}.${day}`
  }
  return PERMANENT_VALID_TEXT
}

function mapCouponsForCart(list = []) {
  return list.map((item, index) => {
    const raw = item && typeof item === "object" ? item : {}
    const status = getCouponStatus(raw)
    const threshold = Number(raw.thresholdAmount || 0)
    const amount = Number(raw.amount || 0)
    const hasCanUseFlag = raw.canUse !== undefined && raw.canUse !== null && raw.canUse !== ""
    const canUse = hasCanUseFlag ? toCanUse(raw.canUse) : status === "unused"

    return {
      id:
        raw.id != null
          ? String(raw.id)
          : (raw.couponId != null ? `coupon-${String(raw.couponId)}` : `coupon-${index}`),
      amount,
      threshold: Number.isFinite(threshold) ? threshold : 0,
      expireDate: toExpireDateText(raw.expireTime),
      canUse,
      status
    }
  })
}

function splitCouponsByAvailability(list = []) {
  const availableCoupons = []
  const unavailableCoupons = []

  list.forEach((coupon) => {
    const isAvailable = coupon.status === "unused" && coupon.canUse
    if (isAvailable) {
      availableCoupons.push(coupon)
      return
    }
    unavailableCoupons.push(coupon)
  })

  return { availableCoupons, unavailableCoupons }
}

function unwrapResponseData(res) {
  if (res && Object.prototype.hasOwnProperty.call(res, "data")) {
    return res.data
  }
  return res
}

function normalizeCartPayload(payload) {
  if (payload && typeof payload === "object") {
    if (payload.result && typeof payload.result === "object") return payload.result
    if (payload.cart && typeof payload.cart === "object") return payload.cart
    return payload
  }
  return {}
}

function normalizeCartItemList(payload) {
  if (!payload || typeof payload !== "object") return []
  if (Array.isArray(payload.itemList)) return payload.itemList
  if (payload.itemList && typeof payload.itemList === "object") {
    if (Array.isArray(payload.itemList.items)) return payload.itemList.items
    if (Array.isArray(payload.itemList.list)) return payload.itemList.list
    if (Array.isArray(payload.itemList.records)) return payload.itemList.records
  }
  if (Array.isArray(payload.items)) return payload.items
  if (Array.isArray(payload.list)) return payload.list
  if (Array.isArray(payload.records)) return payload.records
  return []
}

function toBoolYes(value) {
  const text = String(value || "").trim().toUpperCase()
  return text === "Y" || text === "YES" || text === "TRUE" || text === "1"
}

function toRequestItemId(value) {
  const numeric = Number(value)
  if (Number.isSafeInteger(numeric) && String(numeric) === String(value)) {
    return numeric
  }
  return String(value)
}

function tryParseSpecJson(specJson) {
  if (!specJson) return []
  if (Array.isArray(specJson)) return specJson
  if (typeof specJson === "object") return [specJson]
  if (typeof specJson !== "string") return []
  try {
    const parsed = JSON.parse(specJson)
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === "object") return [parsed]
    return []
  } catch (e) {
    return []
  }
}

function extractTags(raw = {}) {
  const tags = []
  const spuName = String(raw.spuName || "").trim()
  const skuName = String(raw.skuName || "").trim()
  if (skuName && skuName !== spuName) tags.push(skuName)

  const specEntries = tryParseSpecJson(raw.specJson)
  specEntries.forEach((entry) => {
    if (!entry || typeof entry !== "object") return
    Object.keys(entry).forEach((key) => {
      const value = entry[key]
      if (value == null || value === "") return
      const text = `${key}:${value}`
      if (!tags.includes(text)) tags.push(text)
    })
  })

  return tags.slice(0, 2)
}

function mapCartItems(list = []) {
  return list.map((item, index) => {
    const raw = item && typeof item === "object" ? item : {}
    const itemId = raw.itemId != null ? raw.itemId : index
    const salePrice = Number(raw.salePrice || 0)
    const buyQty = Math.max(1, Number(raw.buyQty || 1))
    const unitName = String(raw.unitName || "").trim()

    return {
      id: String(itemId),
      itemId: String(itemId),
      spuId: raw.spuId != null ? String(raw.spuId) : "",
      skuId: raw.skuId != null ? String(raw.skuId) : "",
      name: raw.spuName || raw.skuName || "未命名商品",
      tags: extractTags(raw),
      price: salePrice,
      count: buyQty,
      selected: toBoolYes(raw.checkedFlag),
      image: raw.coverImage || "/assets/mall/product-apple.png",
      unitText: unitName ? `/${unitName}` : "/份"
    }
  })
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
    deliveryAddress: DEFAULT_DELIVERY_ADDRESS,
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
    this._skipNextOnShowRefresh = true
    this._loadCartData()
    this._pageReady = true
  },

  onShow() {
    if (!this._pageReady) return
    if (this._skipNextOnShowRefresh) {
      this._skipNextOnShowRefresh = false
      return
    }
    this._loadCartData()
  },

  _loadCartData() {
    if (this._loadingCartPromise) return this._loadingCartPromise

    this._loadingCartPromise = get(paths.mall.cart)
      .then((res) => {
        const payload = normalizeCartPayload(unwrapResponseData(res))
        const itemList = normalizeCartItemList(payload)
        const mappedItems = mapCartItems(itemList)
        const defaultAddr = DEFAULT_ADDRESS_LIST.find((a) => a.isDefault) || DEFAULT_ADDRESS_LIST[0]
        const hasAddress = !!(defaultAddr && defaultAddr.address)

        this.setData(
          {
            deliveryAddress: hasAddress ? `送至：${defaultAddr.address}` : DEFAULT_DELIVERY_ADDRESS,
            items: mappedItems,
            availableCoupons: [],
            unavailableCoupons: [],
            selectedCouponId: "",
            addressList: DEFAULT_ADDRESS_LIST,
            selectedAddressId: defaultAddr ? defaultAddr.id : ""
          },
          () => this.syncSummary()
        )
      })
      .catch((err) => {
        console.warn("[cart] 加载购物车失败:", err)
        this.setData(
          {
            items: [],
            availableCoupons: [],
            unavailableCoupons: [],
            selectedCouponId: ""
          },
          () => this.syncSummary()
        )
      })
      .finally(() => {
        this._loadingCartPromise = null
      })

    return this._loadingCartPromise
  },

  _loadCouponData({ showLoading = false } = {}) {
    if (this._couponRequestPromise) return this._couponRequestPromise

    if (showLoading) {
      wx.showLoading({ title: "加载中", mask: true })
    }

    this._couponRequestPromise = get(paths.marketing.myCoupons)
      .then((res) => {
        const list = normalizeCouponList((res && res.data) || [])
        const mapped = mapCouponsForCart(list)
        const { availableCoupons, unavailableCoupons } = splitCouponsByAvailability(mapped)
        const selectedCouponExists = availableCoupons.some((coupon) => coupon.id === this.data.selectedCouponId)

        this.setData(
          {
            availableCoupons,
            unavailableCoupons,
            selectedCouponId: selectedCouponExists ? this.data.selectedCouponId : "",
            draftCouponId: selectedCouponExists ? this.data.selectedCouponId : ""
          },
          () => this.syncSummary()
        )
      })
      .catch((err) => {
        console.warn("[cart] 加载优惠券失败:", err)
      })
      .finally(() => {
        if (showLoading) wx.hideLoading()
        this._couponRequestPromise = null
      })

    return this._couponRequestPromise
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
    const current = this.data.items.find((item) => item.id === id)
    if (!current) return
    this._updateCartItemChecked(id, current.selected ? "N" : "Y")
  },

  toggleAll() {
    if (this._toggleAllCheckLoading) return
    const { items } = this.data
    if (!items.length) return

    const nextSelected = !this.data.allSelected
    const checkedFlag = nextSelected ? "Y" : "N"
    const itemIds = items.map((item) => toRequestItemId(item.itemId != null ? item.itemId : item.id))
    this._toggleAllCheckLoading = true

    put(paths.mall.cartItemCheck, { itemIds, checkedFlag })
      .then(() => {
        const nextItems = this.data.items.map((item) => ({
          ...item,
          selected: checkedFlag === "Y"
        }))
        this.setData(
          {
            items: nextItems
          },
          () => this.syncSummary()
        )
      })
      .catch(() => {})
      .finally(() => {
        this._toggleAllCheckLoading = false
      })
  },

  _updateCartItemChecked(id, checkedFlag) {
    const target = this.data.items.find((item) => item.id === id)
    if (!target) return

    const itemId = target.itemId != null && target.itemId !== "" ? target.itemId : id
    const lockKey = String(itemId)
    if (!this._itemCheckLoadingMap) this._itemCheckLoadingMap = {}
    if (this._itemCheckLoadingMap[lockKey]) return
    this._itemCheckLoadingMap[lockKey] = true

    put(paths.mall.cartItemCheck, {
      itemIds: [toRequestItemId(itemId)],
      checkedFlag
    })
      .then(() => {
        const nextItems = this.data.items.map((item) => {
          if (item.id !== id) return item
          return {
            ...item,
            selected: checkedFlag === "Y"
          }
        })
        this.setData(
          {
            items: nextItems
          },
          () => this.syncSummary()
        )
      })
      .catch(() => {})
      .finally(() => {
        this._itemCheckLoadingMap[lockKey] = false
      })
  },

  increaseCount(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    const current = this.data.items.find((item) => item.id === id)
    if (!current) return
    const nextQty = Math.max(1, Number(current.count || 0) + 1)
    this._updateCartItemQty(id, nextQty)
  },

  decreaseCount(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    const current = this.data.items.find((item) => item.id === id)
    if (!current) return
    const nextQty = Math.max(0, Number(current.count || 1) - 1)
    this._updateCartItemQty(id, nextQty)
  },

  _updateCartItemQty(id, buyQty) {
    const target = this.data.items.find((item) => item.id === id)
    if (!target) return

    const itemId = target.itemId != null && target.itemId !== "" ? target.itemId : id
    const lockKey = String(itemId)
    if (!this._itemQtyLoadingMap) this._itemQtyLoadingMap = {}
    if (this._itemQtyLoadingMap[lockKey]) return
    this._itemQtyLoadingMap[lockKey] = true
    put(paths.mall.cartItemQty, {
      itemId: toRequestItemId(itemId),
      buyQty: Number(buyQty)
    })
      .then(() => {
        if (buyQty <= 0) {
          const nextItems = this.data.items.filter((item) => item.id !== id)
          this.setData(
            {
              items: nextItems
            },
            () => this.syncSummary()
          )
          return
        }

        const nextItems = this.data.items.map((item) => {
          if (item.id !== id) return item
          return {
            ...item,
            count: Number(buyQty)
          }
        })

        this.setData(
          {
            items: nextItems
          },
          () => this.syncSummary()
        )
      })
      .catch(() => {})
      .finally(() => {
        this._itemQtyLoadingMap[lockKey] = false
      })
  },

  openCouponPicker() {
    this._loadCouponData({ showLoading: true }).finally(() => {
      this.setData(
        {
          showCouponPicker: true,
          showAmountDetail: false,
          couponTab: "available",
          draftCouponId: this.data.selectedCouponId
        },
        () => this.syncCouponPreview()
      )
    })
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
