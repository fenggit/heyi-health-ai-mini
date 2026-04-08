/**
 * 认证相关接口
 */
const request = require('../utils/request')
const paths = require('./paths')
const STORAGE_USER_INFO_KEY = 'userInfo'

/**
 * 登录响应数据结构 (RLoginVo)
 * {
 *   code: number,          // 消息状态码
 *   msg: string,           // 消息内容
 *   data: {
 *     scope: string,             // 令牌权限范围
 *     openid: string,            // 微信小程序用户 openid
 *     access_token: string,      // 访问令牌
 *     refresh_token: string,     // 刷新令牌
 *     expire_in: number,         // 访问令牌有效期（秒）
 *     refresh_expire_in: number  // 刷新令牌有效期（秒）
 *   }
 * }
 */

/**
 * 当前登录用户信息响应数据结构 (LoginUserInfoVo)
 * {
 *   code: number,
 *   msg: string,
 *   data: {
 *     userId: number,               // 用户 ID (int64)
 *     phone: string,                // 用户手机号
 *     fullReport: object,           // 完整体测报告
 *     questionnaireReportUrl: string, // 问卷体质测试报告页面地址
 *     aiReportUrl: string,          // AI 体质测试报告页面地址
 *     analysisQrCodeUrl: string,    // 分析页二维码图片地址
 *     client_id: string             // 客户端 ID
 *   }
 * }
 */

/**
 * 微信授权获取手机号并登录
 * @param {object} params
 * @param {string} params.phoneCode    - getPhoneNumber 回调中的 code
 * @param {string} [params.guestToken] - 可选，授权获取完整报告时传递
 * @returns {Promise<RLoginVo>}
 */
function wxPhoneLogin({ phoneCode, guestToken } = {}) {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (loginRes) => {
        console.log('[wx.login] 回调:', JSON.stringify(loginRes))
        if (!loginRes.code) {
          reject(new Error('wx.login 未返回 code'))
          return
        }

        const body = {
          clientId: 'miniapp',
          miniappCode: loginRes.code,
          phoneCode
        }

        if (guestToken) {
          body.guestToken = guestToken
        }

        request.post(paths.auth.miniPhoneLogin, body, { withAuth: false })
          .then(resolve)
          .catch(reject)
      },
      fail: (err) => {
        console.error('[wx.login] 失败:', JSON.stringify(err))
        reject(err)
      }
    })
  })
}

/**
 * 游客 session 响应数据结构
 * {
 *   code: number,       // 状态码，200 为成功
 *   msg: string,
 *   data: {
 *     guestToken:      string,  // 游客令牌
 *     expireTime:      string,  // 令牌过期时间 (date-time)
 *     maxExpireTime:   string,  // 最大过期时间 (date-time)
 *     newSession:      boolean  // 是否为新会话
 *   }
 * }
 */

/**
 * 游客 session — 直接调接口
 * @param {string} code     - wx.login 返回的 code
 * @param {string} deviceId
 * @param {string} scene
 * @param {string} source
 * @param {object} [callbacks]
 * @param {function} [callbacks.success]
 * @param {function} [callbacks.fail]
 * @param {function} [callbacks.complete]
 * @returns {Promise}
 */
function requestGuestToken(code, deviceId, scene, source, { success, fail, complete } = {}) {
  const p = request.post(paths.auth.guestSession, { code, deviceId, scene, source }, { withAuth: false })
  p.then((res) => {
    const app = getApp()
    if (app) app.globalData.guestSession = res.data || null
    success && success(res)
    complete && complete(res)
  }).catch((err) => {
    fail && fail(err)
    complete && complete(err)
  })
  return p
}

/**
 * 游客 session — 先 wx.login 获取 code，再调接口
 * @param {string} deviceId
 * @param {string} scene
 * @param {string} source
 * @param {object} [callbacks]
 * @param {function} [callbacks.success]
 * @param {function} [callbacks.fail]
 * @param {function} [callbacks.complete]
 * @returns {Promise}
 */
function loginAndGetGuestToken(deviceId, scene, source, { success, fail, complete } = {}) {
  const p = new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (!res.code) {
          reject(new Error('wx.login 未返回 code'))
          return
        }
        requestGuestToken(res.code, deviceId, scene, source).then(resolve).catch(reject)
      },
      fail: (err) => {
        console.error('[wx.login] 失败:', JSON.stringify(err))
        reject(err)
      }
    })
  })
  p.then((res) => {
    success && success(res)
    complete && complete(res)
  }).catch((err) => {
    fail && fail(err)
    complete && complete(err)
  })
  return p
}

/**
 * 游客 session — 使用默认参数，一键获取
 * @param {object} [callbacks]
 * @param {string} [callbacks.source]   - 可选，来源标识（如扫码 scene code）
 * @param {function} [callbacks.success]
 * @param {function} [callbacks.fail]
 * @param {function} [callbacks.complete]
 * @returns {Promise}
 */
function getGuestToken({ source, success, fail, complete } = {}) {
  return loginAndGetGuestToken('device_001', 'qr_scene_001', source || 'miniapp', { success, fail, complete })
}

function setCachedUserInfo(userInfo) {
  const nextUserInfo = userInfo && typeof userInfo === 'object' ? userInfo : null
  const app = getApp()
  if (app && app.globalData) {
    app.globalData.userInfo = nextUserInfo
  }
  if (nextUserInfo) {
    wx.setStorageSync(STORAGE_USER_INFO_KEY, nextUserInfo)
  } else {
    wx.removeStorageSync(STORAGE_USER_INFO_KEY)
  }
  return nextUserInfo
}

function getCachedUserInfo() {
  const cache = wx.getStorageSync(STORAGE_USER_INFO_KEY)
  return cache && typeof cache === 'object' ? cache : null
}

function loadUserInfoFromStorage() {
  const cached = getCachedUserInfo()
  const app = getApp()
  if (app && app.globalData) {
    app.globalData.userInfo = cached
  }
  return cached
}

function clearUserInfoCache() {
  return setCachedUserInfo(null)
}

/**
 * 获取当前登录用户信息，并写入全局 userInfo
 * @returns {Promise<LoginUserInfoVo>}
 */
function fetchUserInfo() {
  return request.get(paths.auth.currentUserProfile).then((res) => {
    setCachedUserInfo((res && res.data) || null)
    return res
  })
}

/**
 * 登录：调用 wxPhoneLogin 并在成功后设置 token、全局登录状态，再拉取用户信息
 * @param {object} params
 * @param {string} params.phoneCode    - getPhoneNumber 回调中的 code
 * @param {string} [params.guestToken] - 可选，授权获取完整报告时传递
 * @returns {Promise<RLoginVo>}
 */
function login({ phoneCode, guestToken } = {}) {
  return wxPhoneLogin({ phoneCode, guestToken }).then((res) => {
    const token = (res.data && res.data.access_token) || ''
    request.setAuthToken(token)
    const app = getApp()
    if (app) {
      app.globalData.isLogin = true
    }
    console.log('[auth] 登录成功, token:', token)
    return fetchUserInfo().then(() => res)
  }).catch((err) => {
    const app = getApp()
    if (app && app.globalData) app.globalData.isLogin = false
    return Promise.reject(err)
  })
}

module.exports = {
  login,
  fetchUserInfo,
  setCachedUserInfo,
  getCachedUserInfo,
  loadUserInfoFromStorage,
  clearUserInfoCache,
  requestGuestToken,
  loginAndGetGuestToken,
  getGuestToken
}
