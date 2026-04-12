const { initMiniNav, backWithFallback } = require('../../utils/mini-nav')

function getMockAddressList() {
  return [
    {
      id: 'addr-1',
      name: '李先生',
      phone: '136 8888 9999',
      address: '四川省成都市双流区XXX街道XXX小区136号多多驿站',
      gender: 'male',
      isDefault: false
    },
    {
      id: 'addr-2',
      name: '李女士',
      phone: '136 6666 8888',
      address: '四川省成都市高新区XXX街道XXX小区8栋2单元501',
      gender: 'female',
      isDefault: true
    }
  ]
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
    addressList: [],
    selectedAddressId: '',
    showAddressForm: false,
    editAddressId: '',
    newAddress: {
      name: '',
      phone: '',
      address: '',
      gender: 'male'
    }
  },

  onLoad() {
    initMiniNav(this)
    const addressList = getMockAddressList()
    const current = addressList.find((item) => item.isDefault) || addressList[0]
    this.setData({
      addressList,
      selectedAddressId: current ? current.id : ''
    })
  },

  handleBack() {
    backWithFallback('/pages/settings/index')
  },

  selectAddress(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    this.setData({ selectedAddressId: id })
    wx.showToast({ title: '已选择该地址', icon: 'none' })
  },

  toggleDefaultAddress(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    const addressList = this.data.addressList.map((item) => ({
      ...item,
      isDefault: item.id === id
    }))
    this.setData({
      addressList,
      selectedAddressId: id
    })
  },

  deleteAddress(e) {
    const { id } = e.currentTarget.dataset
    const addressList = this.data.addressList.filter((item) => item.id !== id)
    const current = addressList.find((item) => item.isDefault) || addressList[0]
    this.setData({
      addressList,
      selectedAddressId: current ? current.id : ''
    })
  },

  openAddressForm() {
    this.setData({
      showAddressForm: true,
      editAddressId: '',
      newAddress: { name: '', phone: '', address: '', gender: 'male' }
    })
  },

  openEditAddressForm(e) {
    const { id } = e.currentTarget.dataset
    const current = this.data.addressList.find((item) => item.id === id)
    if (!current) return
    this.setData({
      showAddressForm: true,
      editAddressId: id,
      newAddress: {
        name: current.name,
        phone: current.phone,
        address: current.address,
        gender: current.gender || 'male'
      }
    })
  },

  closeAddressForm() {
    this.setData({ showAddressForm: false, editAddressId: '' })
  },

  stopAddressTap() {},

  onNewAddressInput(e) {
    const { field } = e.currentTarget.dataset
    this.setData({
      newAddress: {
        ...this.data.newAddress,
        [field]: e.detail.value
      }
    })
  },

  onGenderTap(e) {
    const { gender } = e.currentTarget.dataset
    this.setData({
      newAddress: {
        ...this.data.newAddress,
        gender
      }
    })
  },

  saveNewAddress() {
    const { name, phone, address, gender } = this.data.newAddress
    if (!name || !phone || !address) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }

    if (this.data.editAddressId) {
      const addressList = this.data.addressList.map((item) =>
        item.id === this.data.editAddressId
          ? { ...item, name, phone, address, gender }
          : item
      )
      this.setData({
        addressList,
        showAddressForm: false,
        editAddressId: ''
      })
      return
    }

    const newItem = {
      id: `addr-${Date.now()}`,
      name,
      phone,
      address,
      gender,
      isDefault: false
    }

    this.setData({
      addressList: [...this.data.addressList, newItem],
      showAddressForm: false
    })
  }
})
