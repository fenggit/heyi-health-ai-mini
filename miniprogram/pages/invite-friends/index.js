const { fetchUserInfo, getCachedUserInfo } = require('../../http/auth')
const { initMiniNav, backWithFallback } = require('../../utils/mini-nav')
const request = require('../../utils/request')
const paths = require('../../http/paths')

const DEFAULT_INVITE_CODE = 'HEYIZYO1'
const DEFAULT_POSTER_USER_ID = '20260327'
const SHARE_HOME_PATH = '/pages/home/index'

const CHANNELS = [
  {
    id: 'wechat',
    name: '微信',
    icon: '/assets/icons/share_wechat_icon.png',
    tileBg: 'rgba(0, 201, 80, 0.05)'
  },
  {
    id: 'moments',
    name: '朋友圈',
    icon: '/assets/icons/share_wechatMoments_icon.png',
    tileBg: 'rgba(43, 127, 255, 0.05)'
  },
  {
    id: 'poster',
    name: '海报',
    icon: '/assets/icons/share_poster_icon.png',
    tileBg: 'rgba(173, 70, 255, 0.05)'
  }
]

const SUMMARY_CARDS = [
  {
    id: 'inviteCount',
    label: '推荐好友',
    valueKey: 'inviteCount',
    badgeBg: 'rgba(225, 113, 0, 0.1)',
    badgeIcon: '/assets/icons/share_invitation_icon.png',
    valueClassName: ''
  },
  {
    id: 'totalPoints',
    label: '获得积分',
    valueKey: 'totalPoints',
    badgeBg: 'rgba(173, 70, 255, 0.1)',
    badgeIcon: '/assets/profile/points.png',
    valueClassName: 'invite-summary-item__value--purple'
  }
]

const REWARD_STEPS = [
  { title: '好友注册成功', reward: '您获得 100 积分' },
  { title: '体质类型', reward: '您获得 50 积分' },
  { title: '用餐时间', reward: '新人优惠券' }
]

function toDisplayText(value, fallback = '') {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  return text || fallback
}

function pickFirstText(candidates, fallback = '') {
  for (let i = 0; i < candidates.length; i += 1) {
    const text = toDisplayText(candidates[i], '')
    if (text) return text
  }
  return fallback
}

function resolveInviteViewData(userInfo) {
  const safeUserInfo = userInfo && typeof userInfo === 'object' ? userInfo : {}
  const profile = safeUserInfo.profile && typeof safeUserInfo.profile === 'object' ? safeUserInfo.profile : {}

  return {
    inviteCode: pickFirstText([
      safeUserInfo.referralCode,
      profile.referralCode
    ], DEFAULT_INVITE_CODE),
    posterQrImage: pickFirstText([
      profile.inviteQrCodeUrl,
      safeUserInfo.inviteQrCodeUrl
    ], ''),
    posterUserId: pickFirstText([
      safeUserInfo.userId,
      profile.userId
    ], DEFAULT_POSTER_USER_ID)
  }
}

function toSafeNumber(value, fallback = 0) {
  const nextValue = Number(value)
  return Number.isFinite(nextValue) ? nextValue : fallback
}

function pickArray(candidates) {
  for (let i = 0; i < candidates.length; i += 1) {
    const current = candidates[i]
    if (Array.isArray(current)) return current
  }
  return []
}

function normalizeInviteRecord(item, index) {
  const safeItem = item && typeof item === 'object' ? item : {}
  return {
    id: pickFirstText([
      safeItem.id,
      safeItem.recordId,
      safeItem.userId,
      safeItem.bindTime
    ], `record-${index}`),
    user: pickFirstText([
      safeItem.displayName,
      safeItem.nickName,
      safeItem.nickname,
      safeItem.userName,
      safeItem.phone
    ], ''),
    time: pickFirstText([
      safeItem.bindTime,
      safeItem.createTime,
      safeItem.createdTime
    ], ''),
    status: pickFirstText([
      safeItem.rewardStatusName,
      safeItem.rewardStatus,
      safeItem.statusName
    ], '')
  }
}

function resolveReferralIndexViewData(rawData) {
  const safeData = rawData && typeof rawData === 'object' ? rawData : {}
  const rawRecords = safeData.records && typeof safeData.records === 'object' ? safeData.records : {}
  const recordItems = pickArray([
    rawRecords.Items,
    rawRecords.items,
    safeData.Items,
    safeData.items,
    safeData.records
  ])

  return {
    inviteCount: toSafeNumber(safeData.referralCount, 0),
    records: recordItems.map((item, index) => normalizeInviteRecord(item, index))
  }
}

function resolveQrTempFilePath(rawImage) {
  const source = toDisplayText(rawImage, '')
  if (!source) {
    return Promise.reject(new Error('二维码不存在'))
  }

  if (/^wxfile:\/\//.test(source)) return Promise.resolve(source)
  if (/^https?:\/\//.test(source)) return downloadQrToTemp(source)
  if (/^\/\//.test(source)) return downloadQrToTemp(`https:${source}`)

  const dataUriMatch = source.match(/^data:image\/[a-zA-Z+]+;base64,(.+)$/)
  const base64Body = dataUriMatch ? dataUriMatch[1] : source
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(base64Body)) {
    return Promise.reject(new Error('无法识别二维码图片格式'))
  }
  return writeQrBase64ToTemp(base64Body)
}

function downloadQrToTemp(url) {
  return request.downloadFile({
    url,
    withAuth: false,
    silentHttpErrorToast: true,
    silentNetworkErrorToast: true
  }).then((res) => {
    if (!res.tempFilePath) {
      throw new Error(`下载二维码失败: ${res.statusCode}`)
    }
    return res.tempFilePath
  })
}

function writeQrBase64ToTemp(base64Data) {
  return new Promise((resolve, reject) => {
    const filePath = `${wx.env.USER_DATA_PATH}/invite-qr-${Date.now()}.png`
    wx.getFileSystemManager().writeFile({
      filePath,
      data: base64Data,
      encoding: 'base64',
      success: () => resolve(filePath),
      fail: reject
    })
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

    navTitle: '邀请好友',
    title: '邀请好友',
    subTitle: '分享给好友，双方都得积分奖励',
    inviteCount: 0,
    totalPoints: 200,
    inviteCode: DEFAULT_INVITE_CODE,
    posterUserId: DEFAULT_POSTER_USER_ID,
    posterBrand: '天元食养',
    posterSubTitle: '扫码进入小程序，获取好礼',
    posterQrImage: '',
    showPosterModal: false,
    copyIcon: '/assets/icons/share_copy.png',
    channels: CHANNELS,
    summaryCards: SUMMARY_CARDS,
    rewardSteps: REWARD_STEPS,
    records: []
  },

  onLoad() {
    initMiniNav(this)
    this.enableShareMenu()
    this.syncInviteDataFromLocal()
    this.refreshInviteData()
    this.loadReferralIndex()
  },

  onShow() {
    this.syncInviteDataFromLocal()
  },

  handleBack() {
    backWithFallback('/pages/profile/index')
  },

  noop() {},

  enableShareMenu() {
    if (typeof wx.showShareMenu !== 'function') return

    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  applyInviteViewData(userInfo) {
    this.setData(resolveInviteViewData(userInfo))
  },

  syncInviteDataFromLocal() {
    const app = getApp()
    const globalUserInfo = app && app.globalData ? app.globalData.userInfo : null
    const cachedUserInfo = globalUserInfo || getCachedUserInfo()
    if (!cachedUserInfo) return
    this.applyInviteViewData(cachedUserInfo)
  },

  refreshInviteData() {
    return fetchUserInfo()
      .then((res) => {
        this.applyInviteViewData((res && res.data) || null)
      })
      .catch((err) => {
        console.warn('[invite-friends] 刷新邀请资料失败:', err)
      })
  },

  loadReferralIndex() {
    return request.get(paths.marketing.referralCodeIndex, null, {
      showLoading: false,
      silentBizErrorToast: true,
      silentHttpErrorToast: true,
      silentNetworkErrorToast: true
    })
      .then((res) => {
        this.setData(resolveReferralIndexViewData((res && res.data) || null))
      })
      .catch((err) => {
        console.warn('[invite-friends] 获取邀请记录失败:', err)
        this.setData({
          inviteCount: 0,
          records: []
        })
      })
  },

  copyCode() {
    if (!this.data.inviteCode) {
      wx.showToast({ title: '暂无推荐码', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => wx.showToast({ title: '推荐码已复制', icon: 'none' })
    })
  },

  openPosterModal() {
    this.setData({ showPosterModal: true })
  },

  closePosterModal() {
    this.setData({ showPosterModal: false })
  },

  savePoster() {
    const qrImage = toDisplayText(this.data.posterQrImage, '')
    if (!qrImage) {
      wx.showToast({ title: '暂无二维码', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...', mask: true })
    resolveQrTempFilePath(qrImage)
      .then((filePath) => new Promise((resolve, reject) => {
        wx.saveImageToPhotosAlbum({
          filePath,
          success: resolve,
          fail: reject
        })
      }))
      .then(() => {
        wx.showToast({ title: '二维码已保存', icon: 'success' })
      })
      .catch((err) => {
        console.warn('[invite-friends] 保存二维码失败:', err)
        const errMsg = String((err && err.errMsg) || '')
        if (errMsg.includes('auth deny') || errMsg.includes('authorize no response') || errMsg.includes('auth denied')) {
          wx.showModal({
            title: '需要授权',
            content: '请在设置中允许保存到相册后重试',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting()
              }
            }
          })
          return
        }
        if (err && (Number(err.code) === 401 || Number(err.statusCode) === 401)) {
          return
        }
        wx.showToast({ title: '保存失败', icon: 'none' })
      })
      .finally(() => {
        wx.hideLoading()
      })
  },

  buildSharePayload() {
    const inviteCode = toDisplayText(this.data.inviteCode, '')
    const encodedInviteCode = inviteCode ? encodeURIComponent(inviteCode) : ''
    const path = encodedInviteCode
      ? `${SHARE_HOME_PATH}?referralCode=${encodedInviteCode}`
      : SHARE_HOME_PATH

    return {
      title: inviteCode
        ? `我在天元食养，输入推荐码 ${inviteCode} 一起领取专属福利`
        : '我在天元食养，邀请你一起开启健康食养计划',
      path,
      query: encodedInviteCode ? `referralCode=${encodedInviteCode}` : ''
    }
  },

  onShareAppMessage() {
    const payload = this.buildSharePayload()
    return {
      title: payload.title,
      path: payload.path
    }
  },

  onShareTimeline() {
    const payload = this.buildSharePayload()
    return {
      title: payload.title,
      query: payload.query
    }
  },

  prepareShare() {
    return undefined
  },

  shareByChannel(e) {
    const { name } = e.currentTarget.dataset
    if (name === '海报') {
      this.openPosterModal()
      return
    }
    wx.showToast({
      title: name + '分享待接入',
      icon: 'none'
    })
  }
})
