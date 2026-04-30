const { get } = require('./request')
const paths = require('../http/paths')

const USER_AGREEMENT_KIND = 'userAgreement'
const PRIVACY_POLICY_KIND = 'privacyPolicy'

const AGREEMENT_META = {
  [USER_AGREEMENT_KIND]: {
    fallbackTitle: '用户协议'
  },
  [PRIVACY_POLICY_KIND]: {
    fallbackTitle: '隐私政策'
  }
}

let currentAgreementCache = null
let currentAgreementPromise = null

function toDisplayText(value, fallback = '') {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  return text || fallback
}

function unwrapCurrentAgreementPayload(response) {
  const body = response && typeof response === 'object' ? response : {}
  const data = body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data : body
  return data && typeof data === 'object' ? data : {}
}

function normalizeAgreementItem(item, fallbackTitle) {
  const source = item && typeof item === 'object' ? item : {}
  return {
    title: toDisplayText(source.agreementTitle || source.title || source.name, fallbackTitle),
    summary: toDisplayText(source.summaryText || source.summary || source.description, ''),
    content: toDisplayText(source.content || source.body || source.text, '暂无内容')
  }
}

function normalizeAgreementPayload(payload) {
  return {
    [USER_AGREEMENT_KIND]: normalizeAgreementItem(payload[USER_AGREEMENT_KIND], AGREEMENT_META[USER_AGREEMENT_KIND].fallbackTitle),
    [PRIVACY_POLICY_KIND]: normalizeAgreementItem(payload[PRIVACY_POLICY_KIND], AGREEMENT_META[PRIVACY_POLICY_KIND].fallbackTitle)
  }
}

function fetchCurrentAgreements(options = {}) {
  const { force = false } = options
  if (!force && currentAgreementCache) {
    return Promise.resolve(currentAgreementCache)
  }
  if (!force && currentAgreementPromise) {
    return currentAgreementPromise
  }

  currentAgreementPromise = get(paths.agreement.current, null, {
    withAuth: false,
    silentBizErrorToast: true,
    silentHttpErrorToast: true,
    silentNetworkErrorToast: true
  })
    .then((res) => {
      const normalized = normalizeAgreementPayload(unwrapCurrentAgreementPayload(res))
      currentAgreementCache = normalized
      return normalized
    })
    .finally(() => {
      currentAgreementPromise = null
    })

  return currentAgreementPromise
}

function getAgreementPopupData(kind, options = {}) {
  return fetchCurrentAgreements(options).then((payload) => {
    const normalizedKind = AGREEMENT_META[kind] ? kind : USER_AGREEMENT_KIND
    return payload[normalizedKind]
  })
}

module.exports = {
  USER_AGREEMENT_KIND,
  PRIVACY_POLICY_KIND,
  fetchCurrentAgreements,
  getAgreementPopupData
}