const { initMiniNav, backWithFallback } = require('../../utils/mini-nav')
const { get } = require('../../utils/request')
const paths = require('../../http/paths')

const INITIAL_PAGE_SIZE = 0
const REQUEST_PAGE_NUM = 10

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
  const name = normalizeText(raw.name || raw.title || raw.spuName || raw.bizName, '收藏内容')
  const tags = normalizeTags(raw.tags || raw.tagList || raw.labels)
  const desc = normalizeText(raw.desc || raw.description || raw.summary || raw.subTitle || raw.spuDesc)
  const image = normalizeText(raw.image || raw.coverImage || raw.spuImage || raw.thumbnail || raw.picUrl, '/assets/mall/product-carrot.png')
  const time = formatDateTime(raw.createTime || raw.favoriteTime || raw.gmtCreate || raw.updateTime)

  return {
    id: String(rawId),
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
    pageData && (pageData.current || pageData.pageNo || pageData.pageIndex || pageData.pageSize || pageData.pageNum),
    NaN
  )

  return {
    list,
    pages: Number.isFinite(pages) ? pages : NaN,
    total: Number.isFinite(total) ? total : NaN,
    current: Number.isFinite(current) ? current : NaN
  }
}

function computeHasMore({ pages, total, current, loadedCount, fetchedCount, requestSize }) {
  if (Number.isFinite(total) && total >= 0) {
    return loadedCount < total
  }

  if (Number.isFinite(pages) && pages > 0 && Number.isFinite(current)) {
    const zeroBasedCurrent = current <= 0 ? 0 : current - 1
    return zeroBasedCurrent + 1 < pages
  }

  if (requestSize > 0) {
    return fetchedCount >= requestSize
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
    pageSize: INITIAL_PAGE_SIZE,
    pageNum: REQUEST_PAGE_NUM,
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

    const nextPageSize = reset ? INITIAL_PAGE_SIZE : this.data.pageSize + 1
    const requestPageNum = this.data.pageNum || REQUEST_PAGE_NUM
    const requestKey = `favorite-${nextPageSize}-${Date.now()}`
    this._latestFavoriteRequestKey = requestKey

    this.setData({ loading: true })
    this.refreshLoadMoreText()

    this._favoritePagePromise = get(paths.favorite.page, {
      pageSize: nextPageSize,
      pageNum: requestPageNum
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
          requestSize: requestPageNum
        })

        this.setData({
          list: mergedList,
          pageSize: nextPageSize,
          hasMore
        })
      })
      .catch((err) => {
        if (this._latestFavoriteRequestKey !== requestKey) return
        console.warn('[my-favorites] 拉取收藏列表失败:', err)
        if (reset) {
          this.setData({
            list: [],
            pageSize: INITIAL_PAGE_SIZE,
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
    const { id } = e.currentTarget.dataset
    const nextList = this.data.list.filter((item) => item.id !== id)
    this.setData({ list: nextList })
    wx.showToast({ title: '已取消收藏', icon: 'none' })
  }
})
