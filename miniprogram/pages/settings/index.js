const { initMiniNav, backWithFallback } = require('../../utils/mini-nav')
const request = require('../../utils/request')
const paths = require('../../http/paths')
const { clearUserInfoCache, loadUserInfoFromStorage, setCachedUserInfo } = require('../../http/auth')

const NICKNAME_OVERRIDE_KEY = 'profileNicknameOverride'
const AVATAR_OVERRIDE_KEY = 'profileAvatarOverride'

function loadNicknameOverride() {
  const cache = wx.getStorageSync(NICKNAME_OVERRIDE_KEY)
  return cache && typeof cache === 'object' ? cache : null
}

function saveNicknameOverride(userId, nickName) {
  wx.setStorageSync(NICKNAME_OVERRIDE_KEY, {
    userId: userId ? String(userId) : '',
    nickName: nickName ? String(nickName) : ''
  })
}

function clearNicknameOverride() {
  wx.removeStorageSync(NICKNAME_OVERRIDE_KEY)
}

function loadAvatarOverride() {
  const cache = wx.getStorageSync(AVATAR_OVERRIDE_KEY)
  return cache && typeof cache === 'object' ? cache : null
}

function saveAvatarOverride(userId, avatarUrl) {
  wx.setStorageSync(AVATAR_OVERRIDE_KEY, {
    userId: userId ? String(userId) : '',
    avatarUrl: avatarUrl ? String(avatarUrl) : ''
  })
}

function clearAvatarOverride() {
  wx.removeStorageSync(AVATAR_OVERRIDE_KEY)
}

function pickNickname(userInfo, fallbackNickname) {
  const safeUserInfo = userInfo && typeof userInfo === 'object' ? userInfo : {}
  const profile = safeUserInfo.profile && typeof safeUserInfo.profile === 'object' ? safeUserInfo.profile : {}
  const rawNickname =
    profile.nickName ||
    profile.nickname ||
    safeUserInfo.nickName ||
    safeUserInfo.nickname ||
    fallbackNickname ||
    ''
  const currentUserId = safeUserInfo.userId ? String(safeUserInfo.userId) : ''
  const override = loadNicknameOverride()
  if (override && override.nickName) {
    const overrideUserId = override.userId ? String(override.userId) : ''
    if (!overrideUserId || !currentUserId || overrideUserId === currentUserId) {
      return override.nickName
    }
  }
  return rawNickname
}

function getAvatarUrlFromUserInfo(userInfo) {
  const safeUserInfo = userInfo && typeof userInfo === 'object' ? userInfo : {}
  const profile = safeUserInfo.profile && typeof safeUserInfo.profile === 'object' ? safeUserInfo.profile : {}
  return (
    profile.avatarUrl ||
    profile.avatar ||
    safeUserInfo.avatarUrl ||
    safeUserInfo.avatar ||
    safeUserInfo.headImgUrl ||
    safeUserInfo.headimgurl ||
    ''
  )
}

function pickAvatarUrl(userInfo, fallbackAvatarUrl) {
  const safeUserInfo = userInfo && typeof userInfo === 'object' ? userInfo : {}
  const rawAvatarUrl = getAvatarUrlFromUserInfo(safeUserInfo) || fallbackAvatarUrl || ''
  const currentUserId = safeUserInfo.userId ? String(safeUserInfo.userId) : ''
  const override = loadAvatarOverride()
  if (override && override.avatarUrl) {
    const overrideUserId = override.userId ? String(override.userId) : ''
    if (!overrideUserId || !currentUserId || overrideUserId === currentUserId) {
      return override.avatarUrl
    }
  }
  return rawAvatarUrl
}

function getResponseMessage(body, fallback = '请求失败') {
  if (!body || typeof body !== 'object') return fallback
  return body.msg || body.message || fallback
}

function getUploadUrl(path) {
  const host = String(request.HOST || '').replace(/\/$/, '')
  const pathname = String(path || '')
  if (!host) return pathname
  if (!pathname) return host
  return `${host}${pathname.startsWith('/') ? pathname : `/${pathname}`}`
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

    navTitle: '设置',
    avatarText: '合',
    avatarUrl: '',
    nickname: '西兰花护体专员',
    notifyEnabled: true,
    darkModeEnabled: false
  },

  onLoad() {
    initMiniNav(this)
    this.syncUserInfo({ fallbackToStorage: true })
  },
  onShow() {
    this.syncUserInfo({ fallbackToStorage: true })
  },

  handleBack() {
    backWithFallback('/pages/profile/index')
  },

  onNotifyChange(e) {
    const notifyEnabled = e.detail.value
    this.setData({ notifyEnabled })
  },

  onDarkModeChange(e) {
    const darkModeEnabled = e.detail.value
    this.setData({ darkModeEnabled })
  },

  openAddressPage() {
    wx.navigateTo({ url: '/pages/my-address/index' })
  },
  syncUserInfo({ fallbackToStorage = false } = {}) {
    const app = getApp()
    let userInfo = (app && app.globalData && app.globalData.userInfo) || {}
    if (
      fallbackToStorage &&
      (!userInfo || typeof userInfo !== 'object' || !Object.keys(userInfo).length)
    ) {
      userInfo = loadUserInfoFromStorage() || {}
    }

    const nickname = pickNickname(userInfo, this.data.nickname)
    const avatarUrl = pickAvatarUrl(userInfo, this.data.avatarUrl)
    const avatarText = nickname ? String(nickname).slice(0, 1) : this.data.avatarText
    this.setData({ nickname, avatarText, avatarUrl })
  },
  editAvatar() {
    wx.chooseImage({
      count: 1,
      sourceType: ['album'],
      success: (res) => {
        const filePath = Array.isArray(res.tempFilePaths) && res.tempFilePaths[0] ? res.tempFilePaths[0] : ''
        if (!filePath) {
          wx.showToast({ title: '未选择图片', icon: 'none' })
          return
        }
        this.uploadAvatar(filePath)
      },
      fail: (err) => {
        const errMsg = (err && err.errMsg) || ''
        if (errMsg.toLowerCase().includes('cancel')) return
        wx.showToast({ title: '选择图片失败', icon: 'none' })
      }
    })
  },
  uploadAvatar(filePath) {
    wx.showLoading({ title: '上传中', mask: true })
    request.uploadFile({
      url: getUploadUrl(paths.auth.updateAvatar),
      filePath,
      name: 'avatarfile'
    })
      .then((res) => {
        this.handleAvatarUploadSuccess(res, filePath)
      })
      .catch((err) => {
        console.warn('[settings] 头像上传失败:', err)
      })
      .finally(() => {
        wx.hideLoading()
      })
  },
  handleAvatarUploadSuccess(res, fallbackAvatarUrl) {
    const statusCode = Number(res && res.statusCode)
    let body = {}
    if (res && res.data && typeof res.data === 'object') {
      body = res.data
    } else {
      try {
        body = res && res.data ? JSON.parse(res.data) : {}
      } catch (e) {
        body = {}
      }
    }

    if (!(statusCode >= 200 && statusCode < 300)) {
      wx.showToast({ title: `上传失败(${statusCode || '-'})`, icon: 'none' })
      return
    }

    const bizCode = body && body.code != null ? Number(body.code) : null
    if (bizCode != null && bizCode !== 200) {
      wx.showToast({
        title: `${getResponseMessage(body, '上传失败')}(${bizCode})`,
        icon: 'none',
        duration: 3000
      })
      return
    }

    const payload = body && body.data && typeof body.data === 'object' ? body.data : {}
    const avatarUrl = payload.avatarUrl || payload.url || payload.fileUrl || payload.avatar || fallbackAvatarUrl
    const app = getApp()
    const currentUser = (app && app.globalData && app.globalData.userInfo) || {}
    const userId = currentUser.userId != null ? String(currentUser.userId) : ''
    const currentProfile = currentUser.profile && typeof currentUser.profile === 'object' ? currentUser.profile : {}
    const nextUser = Object.assign({}, currentUser, {
      avatarUrl,
      avatar: avatarUrl,
      headImgUrl: avatarUrl,
      profile: Object.assign({}, currentProfile, {
        avatarUrl,
        avatar: avatarUrl
      })
    })

    setCachedUserInfo(nextUser)
    saveAvatarOverride(userId, avatarUrl)
    this.setData({ avatarUrl })
    wx.showToast({ title: '头像已更新', icon: 'none' })
  },
  editNickname() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入昵称',
      content: this.data.nickname || '',
      success: (res) => {
        if (!res.confirm) return
        const nickName = (res.content || '').trim()
        if (!nickName) {
          wx.showToast({ title: '昵称不能为空', icon: 'none' })
          return
        }
        this.updateNickname(nickName)
      }
    })
  },
  updateNickname(nickName) {
    wx.showLoading({ title: '保存中', mask: true })
    request.put(paths.auth.updateNickname, { nickName })
      .then(() => {
        const app = getApp()
        const currentUser = (app && app.globalData && app.globalData.userInfo) || {}
        const userId = currentUser.userId != null ? String(currentUser.userId) : ''
        const currentProfile = currentUser.profile && typeof currentUser.profile === 'object' ? currentUser.profile : {}
        const nextUser = Object.assign({}, currentUser, {
          nickName,
          nickname: nickName,
          profile: Object.assign({}, currentProfile, {
            nickName,
            nickname: nickName
          })
        })
        setCachedUserInfo(nextUser)
        saveNicknameOverride(userId, nickName)
        this.setData({
          nickname: nickName,
          avatarText: String(nickName).slice(0, 1)
        })
        wx.showToast({ title: '昵称已更新', icon: 'none' })
      })
      .catch(() => {})
      .finally(() => {
        wx.hideLoading()
      })
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确认退出当前账号吗？',
      success: (res) => {
        if (res.confirm) {
          request.clearAuthToken()
          clearUserInfoCache()
          clearNicknameOverride()
          clearAvatarOverride()
          const app = getApp()
          if (app && app.globalData) app.globalData.isLogin = false
          wx.reLaunch({ url: '/pages/login/index' })
        }
      }
    })
  }
})
