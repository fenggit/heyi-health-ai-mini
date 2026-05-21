const { initMiniNav, backWithFallback } = require("../../utils/mini-nav")
const { get, post, put, del } = require("../../utils/request")
const { reportWechatPayResult } = require("../../utils/pay")
const paths = require("../../http/paths")

const DEFAULT_DELIVERY_ADDRESS = "请选择收货地址"
const DEFAULT_DELIVERY_TYPE = "HOME_DELIVERY"
const PERMANENT_VALID_TEXT = "永久有效"
const DEFAULT_TAG_COLOR = "#008435"
const DEFAULT_TAG_BG_COLOR = "rgba(0, 201, 80, 0.1)"

function formatPrice(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return "0"
  const fixedValue = numericValue.toFixed(2)
  return fixedValue
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1")
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
    const couponId = raw.id != null
      ? raw.id
      : (raw.userCouponId != null ? raw.userCouponId : raw.couponId)

    return {
      id: couponId != null ? String(couponId) : `coupon-${index}`,
      amount,
      threshold: Number.isFinite(threshold) ? threshold : 0,
      expireDate: toExpireDateText(raw.expireTime),
      canUse,
      status
    }
  })
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

function normalizeAddressList(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== "object") return []

  const listKeys = ["records", "list", "items", "rows", "result"]
  for (const key of listKeys) {
    if (Array.isArray(payload[key])) return payload[key]
  }

  const resultPayload = payload.result
  if (resultPayload && typeof resultPayload === "object") {
    for (const key of listKeys) {
      if (Array.isArray(resultPayload[key])) return resultPayload[key]
    }
  }

  const pagePayload = payload.page
  if (pagePayload && typeof pagePayload === "object") {
    for (const key of listKeys) {
      if (Array.isArray(pagePayload[key])) return pagePayload[key]
    }
  }

  return []
}

function normalizeIsDefault(value) {
  if (value === true || value === false) return value
  if (typeof value === "number") return value === 1
  if (typeof value === "string") {
    const text = value.trim().toLowerCase()
    return text === "1" || text === "true" || text === "yes" || text === "y"
  }
  return false
}

function buildAddressText(raw) {
  const fullAddress = String(raw.fullAddress || raw.address || "").trim()
  if (fullAddress) return fullAddress

  const detailAddress = String(raw.detailAddress || "").trim()
  const provinceName = String(raw.provinceName || "").trim()
  const cityName = String(raw.cityName || "").trim()
  const districtName = String(raw.districtName || "").trim()
  return `${provinceName}${cityName}${districtName}${detailAddress}`
}

function mapAddressItem(item, index) {
  const raw = item && typeof item === "object" ? item : {}
  const id = raw.id != null && raw.id !== "" ? String(raw.id) : `addr-${index}`
  const receiverName = String(raw.receiverName || raw.name || "").trim() || "收货人"
  const receiverPhonePlain = String(raw.receiverMobile || raw.phone || "").trim()
  const receiverPhoneMasked = String(raw.receiverMobileMasked || "").trim()
  const receiverPhone = receiverPhoneMasked || receiverPhonePlain
  const addressText = buildAddressText(raw)

  return {
    id,
    name: receiverName,
    phone: receiverPhone,
    phoneRaw: receiverPhonePlain || receiverPhone,
    address: addressText,
    isDefault: normalizeIsDefault(raw.isDefault)
  }
}

function pickAddress(addressList = [], preferredId = "") {
  const safeList = Array.isArray(addressList) ? addressList : []
  if (!safeList.length) return null

  const targetId = preferredId != null && preferredId !== "" ? String(preferredId) : ""
  if (targetId) {
    const matched = safeList.find((item) => String(item.id) === targetId)
    if (matched) return matched
  }

  return safeList.find((item) => item.isDefault) || safeList[0]
}

function toBoolYes(value) {
  const text = String(value || "").trim().toUpperCase()
  return text === "Y" || text === "YES" || text === "TRUE" || text === "1"
}

function toRequestItemId(value) {
  if (value == null || value === "") return ""
  return String(value).trim()
}

function toOptionalLong(value) {
  if (value == null || value === "") return null
  const text = String(value).trim()
  if (!text) return null
  if (!/^\d+$/.test(text)) return null
  return toRequestItemId(text)
}

function buildCouponAvailablePayload(items = []) {
  const safeItems = Array.isArray(items) ? items : []
  const cartItemIds = []
  const itemList = []

  safeItems.forEach((item) => {
    const raw = item && typeof item === "object" ? item : {}
    const itemId = raw.itemId != null && raw.itemId !== "" ? raw.itemId : raw.id
    if (itemId != null && itemId !== "") {
      cartItemIds.push(toRequestItemId(itemId))
    }

    const skuId = raw.skuId
    if (skuId == null || skuId === "") return

    const spuId = raw.spuId != null && raw.spuId !== "" ? raw.spuId : skuId
    const qty = Math.max(1, Number(raw.count || 1))
    itemList.push({
      spuId: toRequestItemId(spuId),
      skuId: toRequestItemId(skuId),
      buyQty: Number.isFinite(qty) ? qty : 1
    })
  })

  return {
    cartItemIds,
    itemList
  }
}

function buildOrderCreatePayload({ selectedItems = [], selectedAddress = null, selectedCouponId = "" } = {}) {
  const addressId = toOptionalLong(selectedAddress && selectedAddress.id)
  if (addressId == null) {
    return { error: "请选择收货地址" }
  }

  const cartItemIds = []
  const itemList = []

  selectedItems.forEach((item) => {
    const raw = item && typeof item === "object" ? item : {}
    const cartItemId = toOptionalLong(raw.itemId != null && raw.itemId !== "" ? raw.itemId : raw.id)
    if (cartItemId != null) cartItemIds.push(cartItemId)

    const skuId = toOptionalLong(raw.skuId)
    if (skuId == null) return
    const spuId = toOptionalLong(raw.spuId)
    const qty = Math.max(1, Number(raw.count || 1))
    itemList.push({
      spuId: spuId != null ? spuId : skuId,
      skuId,
      buyQty: Number.isFinite(qty) ? qty : 1
    })
  })

  if (!itemList.length) {
    return { error: "商品信息不完整，无法结算" }
  }

  const receiverName = String((selectedAddress && selectedAddress.name) || "").trim()
  const receiverMobile = String((selectedAddress && (selectedAddress.phoneRaw || selectedAddress.phone)) || "").trim()
  const addressText = String((selectedAddress && selectedAddress.address) || "").trim()
  const addressSnapshot = JSON.stringify({
    receiverName,
    receiverMobile,
    address: addressText
  })

  const payload = {
    addressId,
    receiverName,
    receiverMobile,
    addressSnapshot,
    deliveryType: DEFAULT_DELIVERY_TYPE,
    remark: "",
    itemList
  }

  if (cartItemIds.length) payload.cartItemIds = cartItemIds

  const userCouponId = toOptionalLong(selectedCouponId)
  if (userCouponId != null) payload.userCouponId = userCouponId

  return { payload }
}

function pickBizObject(data) {
  if (!data || typeof data !== "object") return {}
  if (data.result && typeof data.result === "object") return data.result
  if (data.data && typeof data.data === "object") return data.data
  return data
}

function extractOrderId(data) {
  const payload = pickBizObject(data)
  const candidates = [
    payload.orderId,
    payload.id,
    payload.indentId
  ]
  for (const candidate of candidates) {
    if (candidate != null && candidate !== "") return String(candidate)
  }
  return ""
}

function toWechatPayArgs(data) {
  const payload = pickBizObject(data)
  const timeStamp = payload.timeStamp != null ? String(payload.timeStamp) : ""
  const nonceStr = payload.nonceStr != null ? String(payload.nonceStr) : ""
  const packageValue = payload.packageValue != null
    ? String(payload.packageValue)
    : (payload.package != null ? String(payload.package) : "")
  const signType = payload.signType != null ? String(payload.signType) : "RSA"
  const paySign = payload.paySign != null ? String(payload.paySign) : ""

  if (!timeStamp || !nonceStr || !packageValue || !paySign) return null

  return {
    timeStamp,
    nonceStr,
    package: packageValue,
    signType,
    paySign
  }
}

function requestWechatPayment(payArgs) {
  return new Promise((resolve, reject) => {
    wx.requestPayment({
      ...payArgs,
      success: () => resolve(),
      fail: (err) => {
        const error = err || new Error("微信支付失败")
        const message = String((err && err.errMsg) || "")
        if (message.toLowerCase().includes("cancel")) {
          error.__userCanceled = true
        }
        reject(error)
      }
    })
  })
}

function toTagColor(value) {
  const text = String(value || "").trim()
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(text)) return text
  return DEFAULT_TAG_COLOR
}

function toTagBgColor(hexColor) {
  const color = toTagColor(hexColor)
  let hex = color.slice(1)
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((ch) => ch + ch)
      .join("")
  }
  if (hex.length !== 6) return DEFAULT_TAG_BG_COLOR
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  if (![r, g, b].every((n) => Number.isFinite(n))) return DEFAULT_TAG_BG_COLOR
  return `rgba(${r}, ${g}, ${b}, 0.12)`
}

function toTagViewModel(rawTag, index, prefix = "tag") {
  if (rawTag && typeof rawTag === "object") {
    const tagName = String(rawTag.tagName || rawTag.name || "").trim()
    if (!tagName) return null
    const tagId = rawTag.tagId != null ? String(rawTag.tagId) : ""
    const tagColor = toTagColor(rawTag.tagColor || rawTag.color)
    return {
      tagId,
      tagName,
      tagColor,
      bgColor: toTagBgColor(tagColor),
      tagKey: tagId || `${prefix}-${index}`
    }
  }

  const tagName = String(rawTag || "").trim()
  if (!tagName) return null
  return {
    tagId: "",
    tagName,
    tagColor: DEFAULT_TAG_COLOR,
    bgColor: DEFAULT_TAG_BG_COLOR,
    tagKey: `${prefix}-${index}`
  }
}

function normalizeCustomTags(value) {
  if (Array.isArray(value)) {
    return value
      .map((tag, index) => toTagViewModel(tag, index, "custom"))
      .filter((tag) => !!tag)
      .slice(0, 8)
  }

  if (typeof value === "string") {
    const text = value.trim()
    if (!text) return []

    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        return parsed
          .map((tag, index) => toTagViewModel(tag, index, "custom"))
          .filter((tag) => !!tag)
          .slice(0, 8)
      }
    } catch (e) {}

    return text
      .split(/[，,|]/)
      .map((tag, index) => toTagViewModel(tag, index, "custom"))
      .filter((tag) => !!tag)
      .slice(0, 8)
  }

  return []
}

function mapCartItems(list = []) {
  return list.map((item, index) => {
    const raw = item && typeof item === "object" ? item : {}
    const itemId = raw.itemId != null ? raw.itemId : index
    const salePrice = Number(raw.salePrice || 0)
    const buyQty = Math.max(1, Number(raw.buyQty || 1))
    const unitName = String(raw.unitName || "").trim()
    const customTags = normalizeCustomTags(raw.customTags)

    return {
      id: String(itemId),
      itemId: String(itemId),
      spuId: raw.spuId != null ? String(raw.spuId) : "",
      skuId: raw.skuId != null ? String(raw.skuId) : "",
      name: raw.spuName || raw.skuName || "未命名商品",
      customTags,
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
    selectedCouponId: "",
    draftCouponId: "",
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
    newAddress: { name: "", phone: "", address: "", gender: "male" },
  },

  onLoad() {
    initMiniNav(this)
    this._skipNextOnShowRefresh = true
    this._loadCartData()
    this._loadAddressList()
    this._pageReady = true
  },

  onShow() {
    if (!this._pageReady) return
    if (this._skipNextOnShowRefresh) {
      this._skipNextOnShowRefresh = false
      return
    }
    this._loadCartData()
    this._loadAddressList()
  },

  _loadCartData() {
    if (this._loadingCartPromise) return this._loadingCartPromise

    this._loadingCartPromise = get(paths.mall.cart)
      .then((res) => {
        const payload = normalizeCartPayload(unwrapResponseData(res))
        const itemList = normalizeCartItemList(payload)
        const mappedItems = mapCartItems(itemList)

        this.setData(
          {
            items: mappedItems,
            availableCoupons: [],
            selectedCouponId: ""
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

    const couponPayload = buildCouponAvailablePayload(this.data.items)

    this._couponRequestPromise = post(paths.marketing.orderAvailableCoupons, couponPayload, {
      silentBizErrorToast: true,
      silentHttpErrorToast: true,
      silentNetworkErrorToast: true
    })
      .then((res) => {
        const list = normalizeCouponList((res && res.data) || [])
        const mapped = mapCouponsForCart(list)
        const availableCoupons = mapped.filter((coupon) => coupon.status === "unused" && coupon.canUse)
        const selectedCouponExists = availableCoupons.some((coupon) => coupon.id === this.data.selectedCouponId)

        this.setData(
          {
            availableCoupons,
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

  _loadAddressList({ showLoading = false, preferredId = "" } = {}) {
    if (this._addressRequestPromise) return this._addressRequestPromise

    if (showLoading) {
      wx.showLoading({ title: "加载中", mask: true })
    }

    this._addressRequestPromise = get(paths.address.list)
      .then((res) => {
        const payload = unwrapResponseData(res)
        const sourceList = normalizeAddressList(payload)
        const addressList = sourceList.map((item, index) => mapAddressItem(item, index))
        const preferredAddressId = preferredId != null && preferredId !== ""
          ? String(preferredId)
          : (this.data.showAddressPicker
            ? (this.data.draftAddressId || this.data.selectedAddressId)
            : this.data.selectedAddressId)
        const selectedAddress = pickAddress(addressList, preferredAddressId)
        const hasAddress = !!(selectedAddress && selectedAddress.address)

        this.setData({
          addressList,
          selectedAddressId: selectedAddress ? selectedAddress.id : "",
          draftAddressId: this.data.showAddressPicker ? (selectedAddress ? selectedAddress.id : "") : this.data.draftAddressId,
          deliveryAddress: hasAddress ? `送至：${selectedAddress.address}` : DEFAULT_DELIVERY_ADDRESS
        })
      })
      .catch((err) => {
        console.warn("[cart] 加载收货地址失败:", err)
      })
      .finally(() => {
        if (showLoading) wx.hideLoading()
        this._addressRequestPromise = null
      })

    return this._addressRequestPromise
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
    }, () => {
      this._loadAddressList({ showLoading: true })
    })
  },

  closeAddressPicker() {
    this.setData({ showAddressPicker: false, showAddressForm: false })
  },

  stopAddressPickerTap() {},

  selectAddress(e) {
    const { id, setDefault } = e.currentTarget.dataset
    if (id == null || id === "") return
    const targetId = String(id)
    this.setData({ draftAddressId: targetId })

    const shouldSetDefault = String(setDefault || "") === "1"
    if (!shouldSetDefault) return
    if (this._settingDefaultAddressId) return

    this._settingDefaultAddressId = targetId
    wx.showLoading({ title: "设置中", mask: true })
    put(paths.address.setDefault(targetId))
      .then(() => {
        wx.showToast({ title: "已设为默认地址", icon: "success" })
        return this._loadAddressList({ preferredId: targetId })
      })
      .then(() => {
        this.setData({
          selectedAddressId: targetId,
          draftAddressId: targetId
        })
      })
      .catch((err) => {
        console.warn("[cart] 设置默认收货地址失败:", err)
      })
      .finally(() => {
        wx.hideLoading()
        this._settingDefaultAddressId = ""
      })
  },

  confirmAddressPicker() {
    const { draftAddressId, addressList } = this.data
    const selectedId = draftAddressId != null && draftAddressId !== "" ? String(draftAddressId) : ""
    const addr = addressList.find((a) => String(a.id) === selectedId)
    this.setData({
      selectedAddressId: selectedId,
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
    const targetId = id != null && id !== "" ? String(id) : ""
    const nextList = this.data.addressList.filter((a) => String(a.id) !== targetId)
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
    const editId = id != null && id !== "" ? String(id) : ""
    const addr = this.data.addressList.find((a) => String(a.id) === editId)
    if (!addr) return
    this.setData({
      showAddressPicker: false,
      showAddressForm: true,
      editAddressId: editId,
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
    const name = String((this.data.newAddress && this.data.newAddress.name) || "").trim()
    const phone = String((this.data.newAddress && this.data.newAddress.phone) || "").trim()
    const address = String((this.data.newAddress && this.data.newAddress.address) || "").trim()
    if (!name || !phone || !address) {
      wx.showToast({ title: "请填写完整信息", icon: "none" })
      return
    }

    const { editAddressId, addressList } = this.data
    if (editAddressId) {
      // 编辑模式：更新已有地址
      const nextList = addressList.map((a) =>
        String(a.id) === String(editAddressId)
          ? { ...a, name, phone, address, gender: this.data.newAddress.gender }
          : a
      )
      this.setData({ addressList: nextList, showAddressForm: false, editAddressId: "" })
    } else {
      if (this._savingAddress) return
      this._savingAddress = true
      wx.showLoading({ title: "保存中", mask: true })

      post(paths.address.create, {
        receiverName: name,
        receiverMobile: phone,
        detailAddress: address,
        isDefault: "0"
      })
        .then(() => {
          return this._loadAddressList()
        })
        .then(() => {
          this.setData({
            showAddressForm: false,
            editAddressId: "",
            newAddress: { name: "", phone: "", address: "", gender: "male" }
          })
          wx.showToast({ title: "新增成功", icon: "success" })
        })
        .catch((err) => {
          console.warn("[cart] 新增收货地址失败:", err)
        })
        .finally(() => {
          wx.hideLoading()
          this._savingAddress = false
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

    const currentQty = Math.max(1, Number(current.count || 1))
    if (currentQty === 1) {
      this._deleteCartItem(id)
      return
    }

    const nextQty = Math.max(1, currentQty - 1)
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

  _deleteCartItem(id) {
    const target = this.data.items.find((item) => item.id === id)
    if (!target) return

    const itemId = target.itemId != null && target.itemId !== "" ? target.itemId : id
    const lockKey = String(itemId)
    if (!this._itemQtyLoadingMap) this._itemQtyLoadingMap = {}
    if (this._itemQtyLoadingMap[lockKey]) return
    this._itemQtyLoadingMap[lockKey] = true

    del(paths.mall.cartItemDelete(itemId))
      .then(() => {
        const nextItems = this.data.items.filter((item) => item.id !== id)
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
    if (this._checkoutLoading) return

    const selectedItems = this.data.items.filter((item) => item.selected)
    if (!selectedItems.length) {
      wx.showToast({
        title: "请先勾选商品",
        icon: "none"
      })
      return
    }

    const selectedAddress = pickAddress(this.data.addressList, this.data.selectedAddressId)
    if (!selectedAddress || !selectedAddress.id) {
      wx.showToast({
        title: "请选择收货地址",
        icon: "none"
      })
      return
    }

    const buildResult = buildOrderCreatePayload({
      selectedItems,
      selectedAddress,
      selectedCouponId: this.data.selectedCouponId
    })
    if (buildResult.error) {
      wx.showToast({ title: buildResult.error, icon: "none" })
      return
    }

    this._checkoutLoading = true
    wx.showLoading({ title: "提交中", mask: true })

    let createdOrderId = ""
    const orderedItemKeySet = new Set(
      selectedItems
        .map((item) => {
          const key = item && (item.id != null ? item.id : item.itemId)
          if (key == null || key === "") return ""
          return String(key)
        })
        .filter(Boolean)
    )
    post(paths.order.indentCreate, buildResult.payload)
      .then((res) => {
        const orderId = extractOrderId(unwrapResponseData(res))
        if (!orderId) {
          throw new Error("创建订单成功但未返回订单号")
        }
        createdOrderId = orderId

        if (orderedItemKeySet.size > 0) {
          const nextItems = this.data.items.filter((item) => {
            const key = item && (item.id != null ? item.id : item.itemId)
            if (key == null || key === "") return true
            return !orderedItemKeySet.has(String(key))
          })
          this.setData(
            {
              items: nextItems,
              selectedCouponId: "",
              draftCouponId: ""
            },
            () => this.syncSummary()
          )
        }

        this._loadCartData()
          .then(() => this._loadCouponData())
          .catch(() => {})

        const payOrderId = toOptionalLong(orderId)
        if (payOrderId == null) {
          throw new Error("订单号格式异常")
        }
        return post(paths.order.indentPayWechatCreate, {
          orderId: payOrderId
        })
      })
      .then((res) => {
        const payArgs = toWechatPayArgs(unwrapResponseData(res))
        if (!payArgs) {
          throw new Error("微信支付参数不完整")
        }
        wx.hideLoading()
        return requestWechatPayment(payArgs)
      })
      .then(() => reportWechatPayResult(createdOrderId))
      .then(() => {
        wx.showToast({
          title: "支付成功",
          icon: "success"
        })
        this.setData({
          selectedCouponId: "",
          draftCouponId: ""
        })
        return this._loadCartData()
          .then(() => this._loadCouponData())
          .catch(() => {})
      })
      .catch((err) => {
        if (err && err.__userCanceled) {
          wx.showToast({ title: "已取消支付", icon: "none" })
          if (!createdOrderId) return
          return this._loadCartData()
            .then(() => this._loadCouponData())
            .catch(() => {})
        }

        console.warn(
          "[cart] 结算失败:",
          err,
          createdOrderId ? `orderId=${createdOrderId}` : ""
        )

        const isHttpOrBizError = !!(err && (err.statusCode || err.code != null))
        if (!isHttpOrBizError) {
          wx.showToast({
            title: "结算失败，请稍后重试",
            icon: "none"
          })
        }

        if (!createdOrderId) return
        return this._loadCartData()
          .then(() => this._loadCouponData())
          .catch(() => {})
      })
      .finally(() => {
        wx.hideLoading()
        this._checkoutLoading = false
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
