const STORAGE_TOKEN_KEY = 'token'
const STORAGE_USER_INFO_KEY = 'userInfo'
const DEFAULT_TIMEOUT = 10000
const HOST = 'https://api.tyhctech.com'

let authToken = ''
let unauthorizedRedirecting = false

function initAuthToken() {
  const token = wx.getStorageSync(STORAGE_TOKEN_KEY) || ''
  authToken = token
  return token
}

function setAuthToken(token, options = {}) {
  const { persist = true } = options
  const nextToken = token ? String(token) : ''
  authToken = nextToken

  if (persist) {
    if (nextToken) {
      wx.setStorageSync(STORAGE_TOKEN_KEY, nextToken)
    } else {
      wx.removeStorageSync(STORAGE_TOKEN_KEY)
    }
  }

  return nextToken
}

function getAuthToken() {
  if (authToken) return authToken
  return initAuthToken()
}

function clearAuthToken() {
  authToken = ''
  wx.removeStorageSync(STORAGE_TOKEN_KEY)
}

function handleUnauthorized(message = '登录已失效，请重新登录') {
  clearAuthToken()
  const app = typeof getApp === 'function' ? getApp() : null
  if (app && app.globalData) {
    app.globalData.isLogin = false
    app.globalData.userInfo = null
  }
  wx.removeStorageSync(STORAGE_USER_INFO_KEY)

  if (unauthorizedRedirecting) return
  unauthorizedRedirecting = true

  setTimeout(() => {
    wx.showToast({ title: message, icon: 'none', duration: 2000 })
  }, 300)

  let alreadyOnLogin = false
  try {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const current = pages && pages.length ? pages[pages.length - 1] : null
    alreadyOnLogin = !!(current && current.route === 'pages/login/index')
  } catch (e) {
    alreadyOnLogin = false
  }

  if (alreadyOnLogin) {
    unauthorizedRedirecting = false
    return
  }

  wx.reLaunch({
    url: '/pages/login/index',
    complete: () => {
      setTimeout(() => {
        unauthorizedRedirecting = false
      }, 500)
    }
  })
}

function normalizeUrl(url, baseUrl = '') {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  if (!baseUrl) return url

  const left = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const right = url.startsWith('/') ? url : `/${url}`
  return `${left}${right}`
}

function buildHeaders(header = {}, withAuth = true) {
  const nextHeader = Object.assign({ 'X-App-Source': 'miniapp' }, header)
  const token = withAuth ? getAuthToken() : ''

  if (withAuth && token && !nextHeader.Authorization && !nextHeader.authorization) {
    nextHeader.Authorization = `Bearer ${token}`
  }

  return nextHeader
}

function createHttpError(res, url, method) {
  const error = new Error(`[HTTP ${res.statusCode}] ${method} ${url}`)
  error.statusCode = res.statusCode
  error.data = res.data
  error.header = res.header
  return error
}

function getResponseMessage(body, fallback = '请求失败') {
  if (!body || typeof body !== 'object') return fallback
  return body.msg || body.message || fallback
}

function getResponseCode(body) {
  if (!body || typeof body !== 'object' || body.code === undefined || body.code === null) {
    return null
  }
  const code = Number(body.code)
  return Number.isNaN(code) ? null : code
}

function shouldForceSilentCouponAvailableToast(path = '') {
  return String(path || '').includes('/order/app/marketing/coupon/available')
}

function request(options = {}) {
  const {
    url = '',
    method = 'GET',
    data,
    header = {},
    timeout = DEFAULT_TIMEOUT,
    baseUrl = HOST,
    withAuth = true,
    silentBizErrorToast = false,
    silentHttpErrorToast = false,
    silentNetworkErrorToast = false
  } = options

  const finalUrl = normalizeUrl(url, baseUrl)
  if (!finalUrl) {
    return Promise.reject(new Error('request url is required'))
  }

  const upperMethod = String(method).toUpperCase()
  const finalHeader = buildHeaders(header, withAuth)
  const requestId = `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
  const forceSilentToast = shouldForceSilentCouponAvailableToast(url)
  const finalSilentBizErrorToast = silentBizErrorToast || forceSilentToast
  const finalSilentHttpErrorToast = silentHttpErrorToast || forceSilentToast
  const finalSilentNetworkErrorToast = silentNetworkErrorToast || forceSilentToast

  // 只打印非空 header 字段
  const printHeader = Object.keys(finalHeader).reduce((acc, k) => {
    if (finalHeader[k]) acc[k] = finalHeader[k]
    return acc
  }, {})

  console.log(`[request:${requestId}] 请求信息`, JSON.stringify({
    path: url,
    method: upperMethod,
    body: data || null,
    header: printHeader
  }))

  return new Promise((resolve, reject) => {
    wx.request({
      url: finalUrl,
      method: upperMethod,
      data,
      header: finalHeader,
      timeout,
      success: (res) => {
        const body = res.data
        const bizCode = getResponseCode(body)
        console.log(`[request:${requestId}] 响应信息`, JSON.stringify({
          path: url,
          response: body
        }))

        // 全局统一鉴权失效处理：只要响应体 code 为 401，立即清理登录态并跳登录页。
        if (bizCode === 401) {
          const msg = getResponseMessage(body, '登录已失效，请重新登录')
          console.warn(`[request:${requestId}] 鉴权失败 code=401 msg=${msg}`)
          handleUnauthorized(msg)
          reject(Object.assign(new Error(msg), {
            code: 401,
            statusCode: res.statusCode,
            data: body
          }))
          return
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (bizCode !== null && bizCode !== 200) {
            const msg = getResponseMessage(body)
            console.warn(`[request:${requestId}] 业务错误 code=${bizCode} msg=${msg}`)
            if (!finalSilentBizErrorToast) {
              setTimeout(() => {
                wx.showToast({ title: `${msg}(${bizCode})`, icon: 'none', duration: 3000 })
              }, 300)
            }
            reject(Object.assign(new Error(msg), { code: bizCode, data: body }))
            return
          }
          resolve(body)
          return
        }

        console.error(`[request:${requestId}] HTTP错误 statusCode=${res.statusCode}`)
        if (res.statusCode === 401) {
          const msg = getResponseMessage(body, '登录已失效，请重新登录')
          handleUnauthorized(msg)
        } else {
          if (!finalSilentHttpErrorToast) {
            setTimeout(() => {
              wx.showToast({ title: `请求失败(${res.statusCode})`, icon: 'none', duration: 3000 })
            }, 300)
          }
        }
        reject(createHttpError(res, finalUrl, upperMethod))
      },
      fail: (error) => {
        console.error(`[request:${requestId}] 网络错误`, JSON.stringify(error))
        if (!finalSilentNetworkErrorToast) {
          setTimeout(() => {
            wx.showToast({ title: '网络异常，请稍后重试', icon: 'none', duration: 3000 })
          }, 300)
        }
        reject(error)
      }
    })
  })
}

function get(url, data, options = {}) {
  return request(Object.assign({}, options, { url, data, method: 'GET' }))
}

function post(url, data, options = {}) {
  return request(Object.assign({}, options, { url, data, method: 'POST' }))
}

function put(url, data, options = {}) {
  return request(Object.assign({}, options, { url, data, method: 'PUT' }))
}

function del(url, data, options = {}) {
  return request(Object.assign({}, options, { url, data, method: 'DELETE' }))
}

module.exports = {
  request,
  get,
  post,
  put,
  del,
  HOST,
  initAuthToken,
  setAuthToken,
  getAuthToken,
  clearAuthToken
}
