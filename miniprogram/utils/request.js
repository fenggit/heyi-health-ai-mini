const STORAGE_TOKEN_KEY = 'token'
const DEFAULT_TIMEOUT = 15000
const HOST = 'https://api.tyhctech.com'

let authToken = ''

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

function normalizeUrl(url, baseUrl = '') {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  if (!baseUrl) return url

  const left = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const right = url.startsWith('/') ? url : `/${url}`
  return `${left}${right}`
}

function buildHeaders(header = {}, withAuth = true) {
  const nextHeader = Object.assign({}, header)
  const token = withAuth ? getAuthToken() : ''

  if (withAuth && token && !nextHeader.Authorization && !nextHeader.authorization) {
    nextHeader.Authorization = token
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

function request(options = {}) {
  const {
    url = '',
    method = 'GET',
    data,
    header = {},
    timeout = DEFAULT_TIMEOUT,
    baseUrl = HOST,
    withAuth = true
  } = options

  const finalUrl = normalizeUrl(url, baseUrl)
  if (!finalUrl) {
    return Promise.reject(new Error('request url is required'))
  }

  const upperMethod = String(method).toUpperCase()
  const finalHeader = buildHeaders(header, withAuth)
  const requestId = `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`

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
        console.log(`[request:${requestId}] 响应信息`, JSON.stringify({
          path: url,
          response: body
        }))

        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (body && body.code !== undefined && body.code !== 200) {
            const msg = body.msg || body.message || '请求失败'
            console.warn(`[request:${requestId}] 业务错误 code=${body.code} msg=${msg}`)
            setTimeout(() => {
              wx.showToast({ title: `${msg}(${body.code})`, icon: 'none', duration: 3000 })
            }, 300)
            reject(Object.assign(new Error(msg), { code: body.code, data: body }))
            return
          }
          resolve(body)
          return
        }

        console.error(`[request:${requestId}] HTTP错误 statusCode=${res.statusCode}`)
        setTimeout(() => {
          wx.showToast({ title: `请求失败(${res.statusCode})`, icon: 'none', duration: 3000 })
        }, 300)
        reject(createHttpError(res, finalUrl, upperMethod))
      },
      fail: (error) => {
        console.error(`[request:${requestId}] 网络错误`, JSON.stringify(error))
        setTimeout(() => {
          wx.showToast({ title: '网络异常，请稍后重试', icon: 'none', duration: 3000 })
        }, 300)
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
