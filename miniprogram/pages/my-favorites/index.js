const { initMiniNav, backWithFallback } = require('../../utils/mini-nav')
const { get } = require('../../utils/request')
const paths = require('../../http/paths')
const { removeFavorite: requestRemoveFavorite } = require('../../utils/favorite')

const DEFAULT_PAGE_SIZE = 10
const INITIAL_PAGE_NUM = 1

function unwrapResponseData(res) {
  if (res && Object.prototype.hasOwnProperty.call(res, 'data') && res.data !== undefined && res.data !== null) {
    return res.data
  }
  return res
}

function toNumberOr(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  return text || fallback
}

function normalizeArrayLike(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []

  const listKeys = ['records', 'list', 'items', 'rows', 'result', 'Items']
  for (let i = 0; i < listKeys.length; i += 1) {
    const key = listKeys[i]
    if (Array.isArray(data[key])) return data[key]
  }

  if (data.page && typeof data.page === 'object') {
    for (let i = 0; i < listKeys.length; i += 1) {
      const key = listKeys[i]
      if (Array.isArray(data.page[key])) return data.page[key]
    }
  }

  return []
}

function normalizeTags(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .slice(0, 3)
  }

  if (typeof raw === 'string') {
    return raw
      .split(/[、,，|]/)
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .slice(0, 3)
  }

  return []
}

function formatDateTime(value) {
  const text = normalizeText(value, '--')
  if (text === '--') return text
  return text.replace('T', ' ').replace(/\.\d+$/, '')
}

function mapFavoriteItem(item, index) {
  const raw = item && typeof item === 'object' ? item : {}
  const rawId =
    raw.id != null && raw.id !== ''
      ? raw.id
      : (raw.favoriteId != null && raw.favoriteId !== '' ? raw.favoriteId : (raw.bizId != null ? raw.bizId : index))
  const name = normalizeText(raw.bizTitle || raw.name || raw.title || raw.spuName || raw.bizName, '收藏内容')
  const tags = ['test']
  const desc = normalizeText(raw.bizSummary || raw.desc || raw.description || raw.summary || raw.subTitle || raw.spuDesc)
  const image = normalizeText(raw.bizCoverImage || raw.image || raw.coverImage || raw.spuImage || raw.thumbnail || raw.picUrl, '/assets/mall/product-carrot.png')
  const time = formatDateTime(raw.favoriteTime || raw.createTime || raw.gmtCreate || raw.updateTime)

  return {
    id: String(rawId),
    bizType: normalizeText(raw.bizType || raw.favoriteBizType || raw.biz_type),
    bizId: normalizeText(raw.bizId || raw.targetBizId || raw.targetId || raw.biz_id),
    name,
    tags,
    desc,
    image,
    time
  }
}

function mergeFavoriteList(prevList = [], nextList = []) {
  const merged = []
  const picked = new Set()
  const source = prevList.concat(nextList)

  source.forEach((item, index) => {
    const row = item && typeof item === 'object' ? item : {}
    const id = normalizeText(row.id, `row-${index}`)
    if (picked.has(id)) return
    picked.add(id)
    merged.push(row)
  })

  return merged
}

function resolvePagePayload(payload) {
  const pageData = payload && typeof payload === 'object' && payload.page ? payload.page : payload
  const list = normalizeArrayLike(pageData)
  const pages = toNumberOr(pageData && (pageData.pages || pageData.totalPage || pageData.pageCount), NaN)
  const total = toNumberOr(pageData && (pageData.total || pageData.totalCount || pageData.count), NaN)
  const current = toNumberOr(
    pageData && (pageData.current || pageData.pageNo || pageData.pageIndex || pageData.pageNum),
    NaN
  )

  return {
    list,
    pages: Number.isFinite(pages) ? pages : NaN,
    total: Number.isFinite(total) ? total : NaN,
    current: Number.isFinite(current) ? current : NaN
  }
}

function computeHasMore({ pages, total, current, loadedCount, fetchedCount, requestPageSize }) {
  if (Number.isFinite(total) && total >= 0) {
    return loadedCount < total
  }

  if (Number.isFinite(pages) && pages > 0 && Number.isFinite(current)) {
    const zeroBasedCurrent = current <= 0 ? 0 : current - 1
    return zeroBasedCurrent + 1 < pages
  }

  if (requestPageSize > 0) {
    return fetchedCount >= requestPageSize
  }

  return fetchedCount > 0
}

function buildLoadMoreText({ loading, hasMore, hasList }) {
  if (loading) return '加载中...'
  if (!hasList) return '暂无收藏'
  if (hasMore) return '上拉加载更多'
  return '没有更多了'
}

Page({
  data: {
    topInset: 32,
    statusBarHeight: 20,
    navBarHeight: 44,
    headerHeight: 64,
    menuWidth: 88,
    menuHeight: 32,
    menuTop: 26,
    menuRight: 12,

    navTitle: '我的收藏',
    list: [],
    pageSize: DEFAULT_PAGE_SIZE,
    pageNum: 0,
    hasMore: true,
    loading: false,
    loadMoreText: '加载中...'
  },

  onLoad() {
    initMiniNav(this)
    this.fetchFavoritePage({ reset: true })
  },

  onReachBottom() {
    this.loadMore()
  },

  refreshLoadMoreText() {
    this.setData({
      loadMoreText: buildLoadMoreText({
        loading: !!this.data.loading,
        hasMore: !!this.data.hasMore,
        hasList: this.data.list.length > 0
      })
    })
  },

  fetchFavoritePage({ reset = false } = {}) {
    if (this._favoritePagePromise) return this._favoritePagePromise
    if (!reset && !this.data.hasMore) return Promise.resolve()

    const requestPageSize = this.data.pageSize || DEFAULT_PAGE_SIZE
    const nextPageNum = reset ? INITIAL_PAGE_NUM : this.data.pageNum + 1
    const requestKey = `favorite-${nextPageNum}-${Date.now()}`
    this._latestFavoriteRequestKey = requestKey

    this.setData({ loading: true })
    this.refreshLoadMoreText()

    this._favoritePagePromise = get(paths.favorite.page, {
      pageSize: requestPageSize,
      pageNum: nextPageNum
    })
      .then((res) => {
        if (this._latestFavoriteRequestKey !== requestKey) return

        const payload = unwrapResponseData(res)
        const pagePayload = resolvePagePayload(payload)
        const mappedList = pagePayload.list.map(mapFavoriteItem)
        const mergedList = reset ? mappedList : mergeFavoriteList(this.data.list, mappedList)
        const hasMore = computeHasMore({
          pages: pagePayload.pages,
          total: pagePayload.total,
          current: pagePayload.current,
          fetchedCount: mappedList.length,
          loadedCount: mergedList.length,
          requestPageSize
        })

        this.setData({
          list: mergedList,
          pageNum: nextPageNum,
          hasMore
        })
      })
      .catch((err) => {
        if (this._latestFavoriteRequestKey !== requestKey) return
        console.warn('[my-favorites] 拉取收藏列表失败:', err)
        if (reset) {
          this.setData({
            list: [],
            pageNum: 0,
            hasMore: false
          })
        }
      })
      .finally(() => {
        if (this._latestFavoriteRequestKey === requestKey) {
          this.setData({ loading: false })
          this.refreshLoadMoreText()
        }
        this._favoritePagePromise = null
      })

    return this._favoritePagePromise
  },

  loadMore() {
    if (this.data.loading || !this.data.hasMore) return
    this.fetchFavoritePage({ reset: false })
  },

  handleBack() {
    backWithFallback('/pages/profile/index')
  },

  cancelFavorite(e) {
    const { id, bizType, bizId } = e.currentTarget.dataset
    const finalBizType = normalizeText(bizType)
    const finalBizId = normalizeText(bizId)
    if (!finalBizType || !finalBizId) {
      wx.showToast({ title: '收藏参数缺失', icon: 'none' })
      return
    }

    const cancelKey = `${finalBizType}_${finalBizId}`
    this._cancelingFavoriteMap = this._cancelingFavoriteMap || {}
    if (this._cancelingFavoriteMap[cancelKey]) return
    this._cancelingFavoriteMap[cancelKey] = true

    requestRemoveFavorite({
      bizType: finalBizType,
      bizId: finalBizId
    })
      .then(() => {
        const nextList = this.data.list.filter((item) => item.id !== id)
        this.setData({ list: nextList }, () => {
          this.refreshLoadMoreText()
        })
        wx.showToast({ title: '已取消收藏', icon: 'none' })
      })
      .catch((err) => {
        console.warn('[my-favorites] 取消收藏失败:', err)
        const isHttpOrBizError = !!(err && (err.statusCode || err.code != null))
        if (!isHttpOrBizError) {
          wx.showToast({ title: '取消失败，请稍后重试', icon: 'none' })
        }
      })
      .finally(() => {
        delete this._cancelingFavoriteMap[cancelKey]
      })
  }
})
