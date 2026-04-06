/**
 * 小程序码相关接口
 */
const request = require("../utils/request")
const paths = require("./paths")

/**
 * 生成小程序码（支持 scene 参数）
 * 约定返回 data 为图片 URL 或 base64 字符串
 * @param {object} params
 * @param {string} params.scene
 * @param {string} params.page
 * @returns {Promise}
 */
function generateMiniCode({ scene, page } = {}) {
  return request.post(paths.qrcode.generateMiniCode, { scene, page }, { withAuth: false })
    .catch((err) => {
      // 兼容部分后端字段名使用 path 的实现
      if (!page) return Promise.reject(err)
      return request.post(paths.qrcode.generateMiniCode, { scene, path: page }, { withAuth: false })
    })
}

module.exports = {
  generateMiniCode
}
