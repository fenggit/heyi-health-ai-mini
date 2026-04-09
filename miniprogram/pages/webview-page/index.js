const { getLayoutMetrics } = require("../../utils/layout")
const { HOST } = require("../../utils/request")

function normalizeWebviewUrl(rawUrl) {
  if (!rawUrl) return ''
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl
  const base = HOST.endsWith('/') ? HOST.slice(0, -1) : HOST
  const path = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`
  return `${base}${path}`
}

function decodeSafe(value) {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch (e) {
    return value
  }
}

Page({
  data: {
    title: '',
    url: '',
    headerHeight: 64
  },
  onLoad(options) {
    const title = decodeSafe((options && (options.title || options.Title)) || '')
    const sourceUrl = decodeSafe((options && options.url) || '')
    const url = normalizeWebviewUrl(sourceUrl)
    console.log('[webview-page] 接收到参数', JSON.stringify({ title, url: sourceUrl }))
    console.log('[webview-page] 最终加载 URL', url)
    const { headerHeight } = getLayoutMetrics()
    this.setData({ title, url, headerHeight })
  },

  // 接收网页通过 wx.miniProgram.postMessage 发来的消息
  // 网页端调用示例：
  //   wx.miniProgram.postMessage({ data: { type: 'download', url: 'https://...', fileName: 'file.pdf' } })
  onWebviewMessage(e) {
    const messages = e.detail.data
    if (!Array.isArray(messages) || messages.length === 0) return
    const msg = messages[messages.length - 1]
    if (msg && msg.type === 'download' && msg.url) {
      this._downloadFile(msg.url, msg.fileName || '')
    }
  },

  handleBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: '/pages/home/index' })
  },

  _downloadFile(fileUrl, fileName) {
    wx.showLoading({ title: '下载中...', mask: true })
    wx.downloadFile({
      url: fileUrl,
      success: (res) => {
        wx.hideLoading()
        if (res.statusCode !== 200) {
          wx.showToast({ title: '下载失败', icon: 'none' })
          return
        }
        const tempPath = res.tempFilePath
        const ext = (fileName.split('.').pop() || tempPath.split('.').pop() || '').toLowerCase()
        const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp']

        if (imageExts.includes(ext)) {
          // 图片保存到相册
          wx.saveImageToPhotosAlbum({
            filePath: tempPath,
            success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
            fail: (err) => {
              if (err.errMsg && err.errMsg.includes('auth deny')) {
                wx.showModal({
                  title: '需要授权',
                  content: '请在设置中允许访问相册',
                  confirmText: '去设置',
                  success: (r) => { if (r.confirm) wx.openSetting() }
                })
              } else {
                wx.showToast({ title: '保存失败', icon: 'none' })
              }
            }
          })
        } else {
          // 其他文件（PDF、Word 等）用 openDocument 打开
          wx.openDocument({
            filePath: tempPath,
            showMenu: true,
            fail: () => wx.showToast({ title: '无法打开文件', icon: 'none' })
          })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '下载失败', icon: 'none' })
      }
    })
  }
})
