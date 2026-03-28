const DEFAULT_LAYOUT = {
  statusBarHeight: 20,
  navBarHeight: 44,
  headerHeight: 64,
  safeBottom: 0
}

function getLayoutMetrics() {
  const app = getApp()
  const layout = app && app.globalData ? app.globalData.layout : null
  return Object.assign({}, DEFAULT_LAYOUT, layout || {})
}

module.exports = {
  getLayoutMetrics
}
