/**
 * AI 助手相关接口
 */
const request = require('../utils/request')
const paths = require('./paths')

function normalizeSessionId(rawValue) {
  if (rawValue === undefined || rawValue === null) return ''
  const text = String(rawValue).trim()
  if (!text) return ''
  return text
}

function extractSessionId(payload) {
  const body = payload && typeof payload === 'object' ? payload : {}
  const data = body.data

  const candidates = [
    body.sessionId,
    body.id,
    body.Id,
    data && data.sessionId,
    data && data.id,
    data && data.Id,
    typeof data === 'number' || typeof data === 'string' ? data : ''
  ]

  for (let i = 0; i < candidates.length; i += 1) {
    const normalized = normalizeSessionId(candidates[i])
    if (normalized !== '') return normalized
  }

  return ''
}

function createAssistantSession() {
  return request.post(paths.recipe.assistantSession, {}, {
    showLoading: false
  })
}

function getAssistantMessages(sessionId) {
  return request.get(paths.recipe.assistantSessionMessages(sessionId), null, {
    showLoading: false
  })
}

function chatWithAssistant({ sessionId, questionText } = {}) {
  return request.post(paths.recipe.assistantChat, {
    sessionId,
    questionText
  }, {
    showLoading: false
  })
}

module.exports = {
  createAssistantSession,
  getAssistantMessages,
  chatWithAssistant,
  extractSessionId,
  normalizeSessionId
}
