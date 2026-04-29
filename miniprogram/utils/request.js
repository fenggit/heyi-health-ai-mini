const STORAGE_TOKEN_KEY = 'token'
const STORAGE_USER_INFO_KEY = 'userInfo'
const STORAGE_ASSISTANT_SESSION_KEY = 'assistantSessionId'
const DEFAULT_TIMEOUT = 10000
const HOST = 'https://api.tyhctech.com'

let authToken = ''
let unauthorizedRedirecting = false
let requestLoadingCount = 0

function showRequestLoading(title = '加载中', mask = true) {
  if (requestLoadingCount === 0) {
    wx.showLoading({
      title: String(title || '加载中'),
      mask: !!mask
    })
  }
  requestLoadingCount += 1
}

function hideRequestLoading() {
  if (requestLoadingCount <= 0) return
  requestLoadingCount -= 1
  if (requestLoadingCount === 0) {
    wx.hideLoading()
  }
}

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
    app.globalData.guestSession = null
  }
  wx.removeStorageSync(STORAGE_USER_INFO_KEY)
  wx.removeStorageSync(STORAGE_ASSISTANT_SESSION_KEY)

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

function parseResponseBody(rawData) {
  if (!rawData) return null
  if (typeof rawData === 'object') return rawData
  if (typeof rawData !== 'string') return null

  const text = rawData.trim()
  if (!text) return null

  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch (e) {
    return null
  }
}

function buildBusinessError(message, extras = {}) {
  const error = new Error(message || '请求失败')
  return Object.assign(error, extras)
}

function handleUnauthorizedResponse({ statusCode, body, fallbackMessage = '登录已失效，请重新登录' } = {}) {
  const bizCode = getResponseCode(body)
  const numericStatusCode = Number(statusCode)
  const isUnauthorized = bizCode === 401 || numericStatusCode === 401
  if (!isUnauthorized) return false

  const message = getResponseMessage(body, fallbackMessage)
  handleUnauthorized(message)
  return true
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
    showLoading = false,
    loadingTitle = '加载中',
    loadingMask = true,
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
  const finalShowLoading = !!showLoading

  if (finalShowLoading) {
    showRequestLoading(loadingTitle, loadingMask)
  }

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
        if (handleUnauthorizedResponse({ statusCode: res.statusCode, body })) {
          const msg = getResponseMessage(body, '登录已失效，请重新登录')
          console.warn(`[request:${requestId}] 鉴权失败 code=401 msg=${msg}`)
          reject(buildBusinessError(msg, {
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
        if (handleUnauthorizedResponse({ statusCode: res.statusCode, body })) {
          const msg = getResponseMessage(body, '登录已失效，请重新登录')
          reject(buildBusinessError(msg, {
            code: 401,
            statusCode: res.statusCode,
            data: body,
            header: res.header
          }))
        } else {
          if (!finalSilentHttpErrorToast) {
            setTimeout(() => {
              wx.showToast({ title: `请求失败(${res.statusCode})`, icon: 'none', duration: 3000 })
            }, 300)
          }
          reject(createHttpError(res, finalUrl, upperMethod))
        }
      },
      fail: (error) => {
        console.error(`[request:${requestId}] 网络错误`, JSON.stringify(error))
        if (!finalSilentNetworkErrorToast) {
          setTimeout(() => {
            wx.showToast({ title: '网络异常，请稍后重试', icon: 'none', duration: 3000 })
          }, 300)
        }
        reject(error)
      },
      complete: () => {
        if (finalShowLoading) {
          hideRequestLoading()
        }
      }
    })
  })
}

function uploadFile(options = {}) {
  const {
    url = '',
    filePath = '',
    name = 'file',
    formData,
    header = {},
    timeout = DEFAULT_TIMEOUT,
    baseUrl = HOST,
    withAuth = true,
    showLoading = false,
    loadingTitle = '上传中',
    loadingMask = true,
    silentBizErrorToast = false,
    silentHttpErrorToast = false,
    silentNetworkErrorToast = false
  } = options

  const finalUrl = normalizeUrl(url, baseUrl)
  if (!finalUrl) {
    return Promise.reject(new Error('uploadFile url is required'))
  }
  if (!filePath) {
    return Promise.reject(new Error('uploadFile filePath is required'))
  }

  const finalHeader = buildHeaders(header, withAuth)
  const requestId = `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
  const finalShowLoading = !!showLoading

  if (finalShowLoading) {
    showRequestLoading(loadingTitle, loadingMask)
  }

  const printHeader = Object.keys(finalHeader).reduce((acc, k) => {
    if (finalHeader[k]) acc[k] = finalHeader[k]
    return acc
  }, {})

  console.log(`[upload:${requestId}] 请求信息`, JSON.stringify({
    path: url,
    filePath,
    name,
    formData: formData || null,
    header: printHeader
  }))

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: finalUrl,
      filePath,
      name,
      formData,
      header: finalHeader,
      timeout,
      success: (res) => {
        const body = parseResponseBody(res.data)
        const bizCode = getResponseCode(body)

        console.log(`[upload:${requestId}] 响应信息`, JSON.stringify({
          path: url,
          statusCode: res.statusCode,
          response: body || res.data || null
        }))

        if (handleUnauthorizedResponse({ statusCode: res.statusCode, body })) {
          const msg = getResponseMessage(body, '登录已失效，请重新登录')
          console.warn(`[upload:${requestId}] 鉴权失败 code=401 msg=${msg}`)
          reject(buildBusinessError(msg, {
            code: 401,
            statusCode: res.statusCode,
            data: body || res.data
          }))
          return
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (bizCode !== null && bizCode !== 200) {
            const msg = getResponseMessage(body)
            console.warn(`[upload:${requestId}] 业务错误 code=${bizCode} msg=${msg}`)
            if (!silentBizErrorToast) {
              setTimeout(() => {
                wx.showToast({ title: `${msg}(${bizCode})`, icon: 'none', duration: 3000 })
              }, 300)
            }
            reject(buildBusinessError(msg, {
              code: bizCode,
              statusCode: res.statusCode,
              data: body || res.data
            }))
            return
          }

          if (body) {
            res.parsedData = body
          }
          resolve(res)
          return
        }

        console.error(`[upload:${requestId}] HTTP错误 statusCode=${res.statusCode}`)
        if (!silentHttpErrorToast) {
          setTimeout(() => {
            wx.showToast({ title: `请求失败(${res.statusCode})`, icon: 'none', duration: 3000 })
          }, 300)
        }
        reject(buildBusinessError(`[HTTP ${res.statusCode}] UPLOAD ${finalUrl}`, {
          statusCode: res.statusCode,
          data: body || res.data
        }))
      },
      fail: (error) => {
        console.error(`[upload:${requestId}] 网络错误`, JSON.stringify(error))
        if (!silentNetworkErrorToast) {
          setTimeout(() => {
            wx.showToast({ title: '网络异常，请稍后重试', icon: 'none', duration: 3000 })
          }, 300)
        }
        reject(error)
      },
      complete: () => {
        if (finalShowLoading) {
          hideRequestLoading()
        }
      }
    })
  })
}

function downloadFile(options = {}) {
  const {
    url = '',
    header = {},
    timeout = DEFAULT_TIMEOUT,
    baseUrl = HOST,
    withAuth = true,
    showLoading = false,
    loadingTitle = '下载中',
    loadingMask = true,
    silentHttpErrorToast = false,
    silentNetworkErrorToast = false
  } = options

  const finalUrl = normalizeUrl(url, baseUrl)
  if (!finalUrl) {
    return Promise.reject(new Error('downloadFile url is required'))
  }

  const finalHeader = buildHeaders(header, withAuth)
  const requestId = `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
  const finalShowLoading = !!showLoading

  if (finalShowLoading) {
    showRequestLoading(loadingTitle, loadingMask)
  }

  const printHeader = Object.keys(finalHeader).reduce((acc, k) => {
    if (finalHeader[k]) acc[k] = finalHeader[k]
    return acc
  }, {})

  console.log(`[download:${requestId}] 请求信息`, JSON.stringify({
    path: url,
    header: printHeader
  }))

  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: finalUrl,
      header: finalHeader,
      timeout,
      success: (res) => {
        console.log(`[download:${requestId}] 响应信息`, JSON.stringify({
          path: url,
          statusCode: res.statusCode,
          tempFilePath: res.tempFilePath || ''
        }))

        if (handleUnauthorizedResponse({ statusCode: res.statusCode })) {
          const msg = '登录已失效，请重新登录'
          console.warn(`[download:${requestId}] 鉴权失败 statusCode=401`)
          reject(buildBusinessError(msg, {
            code: 401,
            statusCode: res.statusCode
          }))
          return
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res)
          return
        }

        console.error(`[download:${requestId}] HTTP错误 statusCode=${res.statusCode}`)
        if (!silentHttpErrorToast) {
          setTimeout(() => {
            wx.showToast({ title: `请求失败(${res.statusCode})`, icon: 'none', duration: 3000 })
          }, 300)
        }
        reject(buildBusinessError(`[HTTP ${res.statusCode}] DOWNLOAD ${finalUrl}`, {
          statusCode: res.statusCode,
          tempFilePath: res.tempFilePath || ''
        }))
      },
      fail: (error) => {
        console.error(`[download:${requestId}] 网络错误`, JSON.stringify(error))
        if (!silentNetworkErrorToast) {
          setTimeout(() => {
            wx.showToast({ title: '网络异常，请稍后重试', icon: 'none', duration: 3000 })
          }, 300)
        }
        reject(error)
      },
      complete: () => {
        if (finalShowLoading) {
          hideRequestLoading()
        }
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
  clearAuthToken,
  handleUnauthorized,
  handleUnauthorizedResponse,
  uploadFile,
  downloadFile
}
