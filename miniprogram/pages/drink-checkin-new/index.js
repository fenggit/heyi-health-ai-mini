const { getLayoutMetrics } = require("../../utils/layout")
const request = require("../../utils/request")
const paths = require("../../http/paths")
const { fetchUserInfo } = require("../../http/auth")

function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function formatDate(date) {
  const y = date.getFullYear()
  const mo = date.getMonth() + 1
  const d = date.getDate()
  return `${y}年${mo}月${d}日`
}

Page({
  data: {
    headerHeight: 64,
    currentTime: '',
    currentDate: '',
    // 果蔬汁选项，从接口加载
    juiceOptions: [],
    // 选中项：{ selectionType: 'RECIPE'|'OTHER', recipeId, label }
    selectedOption: null,
    photoPath: '',
    // 上传后服务端返回的图片 URL
    uploadedImageUrl: '',
    note: '',
    shareToContent: true,
    submitting: false
  },

  onLoad() {
    const { headerHeight } = getLayoutMetrics()
    const now = new Date()
    this.setData({
      headerHeight: headerHeight || 64,
      currentTime: formatTime(now),
      currentDate: formatDate(now)
    })
    this.loadOptions()
  },

  onBack() {
    wx.navigateBack()
  },

  /** 加载果蔬汁选项 */
  loadOptions() {
    wx.showLoading({ title: '加载中...', mask: true })
    request.get(paths.checkin.juiceOptions)
      .then((res) => {
        const data = (res && res.data) || {}
        const recipeOptions = Array.isArray(data.recipeOptions) ? data.recipeOptions : []
        const otherOption = data.otherOption || null

        const options = recipeOptions.map((item) => ({
          key: `RECIPE_${item.recipeId}`,
          label: item.recipeName || item.recipeCode || '配方',
          selectionType: 'RECIPE',
          recipeId: item.recipeId
        }))

        // 追加"其他"选项
        if (otherOption) {
          options.push({
            key: 'OTHER',
            label: otherOption.optionName || '其他',
            selectionType: 'OTHER',
            recipeId: null
          })
        }

        this.setData({ juiceOptions: options })
      })
      .catch((err) => {
        console.error('[drink-checkin-new] 加载选项失败:', err)
      })
      .finally(() => {
        wx.hideLoading()
      })
  },

  onTypeSelect(e) {
    const { key } = e.currentTarget.dataset
    const option = this.data.juiceOptions.find((o) => o.key === key) || null
    this.setData({ selectedOption: option })
  },

  /** 选择相册图片，选完后立即上传 */
  onChoosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath
        this.setData({ photoPath: path, uploadedImageUrl: '' })
        this.uploadPhoto(path)
      }
    })
  },

  /** 上传图片到服务端，获取 imageUrl */
  uploadPhoto(filePath) {
    wx.showLoading({ title: '上传中...', mask: true })
    request.uploadFile({
      url: paths.resource.uploadFile,
      filePath,
      name: 'file'
    })
      .then((res) => {
        // 上传接口返回 { code, msg, data }，data 为图片 URL 字符串
        const parsedData = res.parsedData || {}
        const rawData = parsedData.data
        const imageUrl = typeof rawData === 'string' ? rawData : (rawData && rawData.url) || ''
        if (!imageUrl) {
          wx.showToast({ title: '图片上传失败', icon: 'none' })
          this.setData({ photoPath: '', uploadedImageUrl: '' })
          return
        }
        this.setData({ uploadedImageUrl: imageUrl })
      })
      .catch((err) => {
        console.error('[drink-checkin-new] 图片上传失败:', err)
        this.setData({ photoPath: '', uploadedImageUrl: '' })
      })
      .finally(() => {
        wx.hideLoading()
      })
  },

  onRemovePhoto() {
    this.setData({ photoPath: '', uploadedImageUrl: '' })
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  onShareToggle() {
    this.setData({ shareToContent: !this.data.shareToContent })
  },

  onSubmit() {
    const { selectedOption, photoPath, uploadedImageUrl, note, shareToContent, submitting } = this.data

    if (!selectedOption) {
      wx.showToast({ title: '请选择果蔬汁', icon: 'none' })
      return
    }

    // 已选图片但还未上传完成
    if (photoPath && !uploadedImageUrl) {
      wx.showToast({ title: '图片上传中，请稍候', icon: 'none' })
      return
    }

    if (submitting) return
    this.setData({ submitting: true })

    const body = {
      selectionType: selectedOption.selectionType,
      note: note || undefined,
      isPublic: shareToContent
    }

    if (selectedOption.selectionType === 'RECIPE') {
      body.recipeId = selectedOption.recipeId
    }

    if (uploadedImageUrl) {
      body.imageUrl = uploadedImageUrl
    }

    wx.showLoading({ title: '打卡中...', mask: true })
    request.post(paths.checkin.juiceCheckIn, body)
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '打卡成功', icon: 'success' })
        // 刷新用户信息（更新 globalData 中的打卡统计）
        fetchUserInfo().catch((err) => {
          console.warn('[drink-checkin-new] 刷新用户信息失败:', err)
        })
        setTimeout(() => wx.navigateBack(), 1500)
      })
      .catch((err) => {
        console.error('[drink-checkin-new] 打卡失败:', err)
        wx.hideLoading()
      })
      .finally(() => {
        this.setData({ submitting: false })
      })
  }
})
