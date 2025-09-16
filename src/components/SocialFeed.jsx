import React, { useEffect, useState } from 'react'
import { highlightKeywords, getMockSentiment, getMockEngagement } from '../utils/nlpUtils.js'

export default function SocialFeed() {
  const [tweets, setTweets] = useState([])

  const fetchTweets = async () => {
    try {
      // If you have a backend proxy to Twitter, call it here.
      // For hackathon, use local mock JSON.
      const res = await fetch('/data/mockTweets.json')
      const json = await res.json()
      const processed = (json.tweets || []).map((t) => ({
        ...t,
        sentiment: getMockSentiment(t.text),
        engagement: getMockEngagement(),
        highlighted: highlightKeywords(t.text),
      }))
      setTweets(processed)
    } catch (e) {
      console.error('Failed to load tweets', e)
    }
  }

  useEffect(() => {
    fetchTweets()
    const id = setInterval(fetchTweets, 30000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="card p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Social Media Feed</h3>
        <button className="text-sm text-primary-600 hover:underline" onClick={fetchTweets}>Refresh</button>
      </div>
      <div className="space-y-3 overflow-auto">
        {tweets.map((t) => (
          <div key={t.id} className="border border-gray-200 rounded-md p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">@{t.username} • {new Date(t.timestamp).toLocaleString()}</div>
              <span className={
                t.sentiment === 'POSITIVE'
                  ? 'bg-green-100 text-green-700 px-2 py-1 rounded text-xs'
                  : 'bg-red-100 text-red-700 px-2 py-1 rounded text-xs'
              }>
                {t.sentiment}
              </span>
            </div>
            <div className="mt-2 text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: t.highlighted }} />
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1">
                <span role="img" aria-label="likes">👍</span>
                <span className="font-medium">{t.engagement.likes}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span role="img" aria-label="retweets">🔁</span>
                <span className="font-medium">{t.engagement.retweets}</span>
              </span>
            </div>
          </div>
        ))}
        {tweets.length === 0 && (
          <div className="text-sm text-gray-500">No items. Mock data will appear here.</div>
        )}
      </div>
    </div>
  )
}
