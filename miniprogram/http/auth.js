/**
 * 认证相关接口
 */
const request = require('../utils/request')
const paths = require('./paths')

/**
 * 登录响应数据结构 (RLoginVo)
 * {
 *   code: number,          // 消息状态码
 *   msg: string,           // 消息内容
 *   data: {
 *     scope: string,       // 令牌权限范围
 *     openid: string,      // 微信小程序用户 openid
 *     userInfo: {
 *       userId: number,    // 用户 ID (int64)
 *       phone: string,     // 手机号
 *       fullReport: object,// 完整体测报告
 *       client_id: string
 *     },
 *     access_token: string,      // 访问令牌
 *     refresh_token: string,     // 刷新令牌
 *     expire_in: number,         // 访问令牌有效期（秒）
 *     refresh_expire_in: number  // 刷新令牌有效期（秒）
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

module.exports = {
  wxPhoneLogin
}
