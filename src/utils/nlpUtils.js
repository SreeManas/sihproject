// Simple mock NLP utilities for highlighting hazard keywords, sentiment, and engagement

const KEYWORDS = [
  'tsunami',
  'flood',
  'storm surge',
  'high waves',
]

// Escape HTML to prevent injection, then wrap keywords in a red bold span
export function highlightKeywords(text) {
  const escaped = escapeHTML(String(text || ''))
  // Build a regex that preserves multi-word terms and word boundaries
  // Order by length to avoid partial matching inside larger phrases
  const sorted = [...KEYWORDS].sort((a, b) => b.length - a.length)
  const pattern = new RegExp(`(${sorted.map(escapeRegex).join('|')})`, 'gi')
  return escaped.replace(pattern, (m) => `
    <span class="font-bold text-red-600">${m}</span>
  `)
}

export function getMockSentiment(text) {
  return Math.random() < 0.5 ? 'NEGATIVE' : 'POSITIVE'
}

export function getMockEngagement() {
  const likes = Math.floor(Math.random() * (500 - 10 + 1)) + 10 // 10-500
  const retweets = Math.floor(Math.random() * (100 - 1 + 1)) + 1 // 1-100
  return { likes, retweets }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function escapeHTML(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
