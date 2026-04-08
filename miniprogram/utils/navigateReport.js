/**
 * 跳转到测评报告 webview 页
 */
const DEFAULT_REPORT_TITLE = '测试报告'
const DEFAULT_REPORT_URL = 'https://www.baidu.com'

function normalizeReportNavParams(arg1, arg2) {
  let title = DEFAULT_REPORT_TITLE
  let url = DEFAULT_REPORT_URL

  if (arg1 && typeof arg1 === 'object') {
    if (arg1.title) title = arg1.title
    if (arg1.url) url = arg1.url
    return { title, url }
  }

  if (typeof arg2 === 'string' && arg2) {
    if (typeof arg1 === 'string' && arg1) {
      title = arg1
    }
    url = arg2
    return { title, url }
  }

  if (typeof arg1 === 'string' && arg1) {
    if (/^https?:\/\//i.test(arg1) || arg1.startsWith('/') || arg1.includes('/')) {
      url = arg1
    } else {
      title = arg1
    }
  }

  return { title, url }
}

function navigateToReport(arg1, arg2) {
  const { title, url } = normalizeReportNavParams(arg1, arg2)
  const targetUrl = '/pages/webview-page/index?title=' + encodeURIComponent(title) + '&url=' + encodeURIComponent(url)
  wx.navigateTo({ url: targetUrl })
}

module.exports = { navigateToReport }
