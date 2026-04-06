/**
 * 跳转到测评报告 webview 页
 */
function navigateToReport() {
  wx.redirectTo({
    url: '/pages/webview-page/index?title=' + encodeURIComponent('测评报告') + '&url=' + encodeURIComponent('https://www.baidu.com/')
  })
}

module.exports = { navigateToReport }
