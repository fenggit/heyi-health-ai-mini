const { get } = require("./request")
const paths = require("../http/paths")

function reportWechatPayResult(orderId) {
  if (orderId == null || orderId === "") {
    return Promise.resolve(null)
  }

  const resolvedOrderId = String(orderId)
  return get(paths.order.indentPayResult(resolvedOrderId), null, {
    silentBizErrorToast: true,
    silentHttpErrorToast: true,
    silentNetworkErrorToast: true
  }).catch((err) => {
    console.warn("[pay] 支付结果上报失败:", err, `orderId=${resolvedOrderId}`)
    return null
  })
}

module.exports = {
  reportWechatPayResult
}