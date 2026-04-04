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

  console.log(`[request:${requestId}] 请求信息`, JSON.stringify({
    url: finalUrl,
    method: upperMethod,
    data: data || null
  }))
  console.log(`[request:${requestId}] 请求头`, JSON.stringify(finalHeader || {}))

  return new Promise((resolve, reject) => {
    wx.request({
      url: finalUrl,
      method: upperMethod,
      data,
      header: finalHeader,
      timeout,
      success: (res) => {
        console.log(`[request:${requestId}] 响应信息`, JSON.stringify({
          statusCode: res.statusCode,
          data: res.data,
          header: res.header
        }))

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
          return
        }

        reject(createHttpError(res, finalUrl, upperMethod))
      },
      fail: (error) => {
        console.log(`[request:${requestId}] 请求失败`, JSON.stringify(error))
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
