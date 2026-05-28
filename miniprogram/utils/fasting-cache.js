/**
 * 断食打卡本地缓存工具
 * 缓存字段：selectedTypeCode（断食类型）、weight（体重）、bodyFat（体脂率）
 */

const FASTING_CACHE_KEY = 'fastingCheckinCache'

/**
 * 读取缓存，返回 { selectedTypeCode, weight, bodyFat }
 */
function loadFastingCache() {
  try {
    const cache = wx.getStorageSync(FASTING_CACHE_KEY)
    return cache && typeof cache === 'object' ? cache : {}
  } catch (e) {
    return {}
  }
}

/**
 * 保存缓存，只持久化3个字段
 * @param {{ selectedTypeCode?: string, weight?: string, bodyFat?: string }} data
 */
function saveFastingCache(data) {
  try {
    const prev = loadFastingCache()
    const next = Object.assign({}, prev, {
      selectedTypeCode: data.selectedTypeCode !== undefined ? data.selectedTypeCode : prev.selectedTypeCode,
      weight: data.weight !== undefined ? data.weight : prev.weight,
      bodyFat: data.bodyFat !== undefined ? data.bodyFat : prev.bodyFat
    })
    wx.setStorageSync(FASTING_CACHE_KEY, next)
  } catch (e) {}
}

/**
 * 退出登录时清空缓存
 */
function clearFastingCache() {
  try {
    wx.removeStorageSync(FASTING_CACHE_KEY)
  } catch (e) {}
}

module.exports = { loadFastingCache, saveFastingCache, clearFastingCache }
