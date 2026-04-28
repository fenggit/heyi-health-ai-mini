const { post, del } = require("./request")
const paths = require("../http/paths")

function normalizeBizId(value) {
  if (value === null || value === undefined || value === "") return ""
  const text = String(value).trim()
  if (!text) return ""
  return text
}

function addFavorite({ bizType, bizId }) {
  const finalBizId = normalizeBizId(bizId)
  return post(paths.favorite.create, {
    bizType,
    bizId: finalBizId
  })
}

function removeFavorite({ bizType, bizId }) {
  const finalBizId = normalizeBizId(bizId)
  return del(paths.favorite.remove(bizType, finalBizId))
}

function toggleFavorite({ bizType, bizId, isFavorited }) {
  if (isFavorited) {
    return removeFavorite({ bizType, bizId })
  }
  return addFavorite({ bizType, bizId })
}

module.exports = {
  addFavorite,
  removeFavorite,
  toggleFavorite,
  normalizeBizId
}
