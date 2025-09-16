// src/services/socialMediaAPI.js
import rateLimitManager from '../utils/rateLimitManager.js';

// Twitter API v2 Integration
class TwitterAPI {
  constructor() {
    this.bearerToken =
      import.meta.env.VITE_TWITTER_BEARER_TOKEN ||
      import.meta.env.REACT_APP_TWITTER_BEARER_TOKEN ||
      '';
    this.baseURL = 'https://api.twitter.com/2';
  }

  async searchTweets(query, options = {}) {
    const params = new URLSearchParams({
      query: `${query} -is:retweet lang:en OR lang:hi OR lang:te`,
      'tweet.fields': 'created_at,author_id,public_metrics,context_annotations,lang,geo',
      'user.fields': 'username,name,location,verified',
      'expansions': 'author_id,geo.place_id',
      'place.fields': 'country,country_code,full_name,geo',
      'max_results': options.maxResults || 100,
      ...options.params
    });

    try {
      const response = await rateLimitManager.enqueue('twitter', {
        endpoint: `tweets/search/recent?${params}`,
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`
        }
      });

      return this.transformTwitterData(response);
    } catch (error) {
      console.error('Twitter API error:', error);
      throw error;
    }
  }

  async getHazardTweets(location = 'India', maxResults = 50) {
    const hazardQueries = [
      'tsunami OR "tidal wave" OR "sea surge"',
      'cyclone OR hurricane OR typhoon',
      'flood OR flooding OR "heavy rain"',
      'earthquake OR tremor OR seismic',
      'landslide OR "slope failure"',
      'storm OR "storm surge" OR "high waves"'
    ];

    const allTweets = [];
    
    for (const query of hazardQueries) {
      try {
        const locationQuery = location ? ` (${location} OR near:${location})` : '';
        const fullQuery = query + locationQuery;
        
        const tweets = await this.searchTweets(fullQuery, { maxResults: Math.ceil(maxResults / hazardQueries.length) });
        allTweets.push(...tweets);
      } catch (error) {
        console.warn(`Failed to fetch tweets for query: ${query}`, error);
      }
    }

    return allTweets.slice(0, maxResults);
  }

  transformTwitterData(response) {
    if (!response.data) return [];

    const users = response.includes?.users || [];
    const places = response.includes?.places || [];

    return response.data.map(tweet => {
      const author = users.find(user => user.id === tweet.author_id);
      const place = places.find(p => p.id === tweet.geo?.place_id);

      return {
        id: tweet.id,
        platform: 'twitter',
        text: tweet.text,
        author: author?.username || 'unknown',
        authorName: author?.name,
        authorVerified: author?.verified || false,
        timestamp: tweet.created_at,
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0,
        quotes: tweet.public_metrics?.quote_count || 0,
        language: tweet.lang,
        location: place?.full_name || author?.location,
        coordinates: place?.geo?.bbox,
        contextAnnotations: tweet.context_annotations || [],
        url: `https://twitter.com/${author?.username}/status/${tweet.id}`
      };
    });
  }
}

// YouTube API Integration
class YouTubeAPI {
  constructor() {
    this.apiKey =
      import.meta.env.VITE_YOUTUBE_API_KEY ||
      import.meta.env.REACT_APP_YOUTUBE_API_KEY ||
      '';
    this.baseURL = 'https://www.googleapis.com/youtube/v3';
  }

  async searchVideos(query, options = {}) {
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      order: options.order || 'relevance',
      publishedAfter: options.publishedAfter || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      maxResults: options.maxResults || 50,
      key: this.apiKey
    });

    try {
      const response = await rateLimitManager.enqueue('youtube', {
        endpoint: `search?${params}`
      });

      const videoIds = response.items.map(item => item.id.videoId).join(',');
      return await this.getVideoDetails(videoIds);
    } catch (error) {
      console.error('YouTube search error:', error);
      throw error;
    }
  }

  async getVideoDetails(videoIds) {
    const params = new URLSearchParams({
      part: 'snippet,statistics',
      id: videoIds,
      key: this.apiKey
    });

    try {
      const response = await rateLimitManager.enqueue('youtube', {
        endpoint: `videos?${params}`
      });

      return this.transformYouTubeData(response);
    } catch (error) {
      console.error('YouTube video details error:', error);
      throw error;
    }
  }

  async getVideoComments(videoId, maxResults = 20) {
    const params = new URLSearchParams({
      part: 'snippet',
      videoId: videoId,
      order: 'relevance',
      maxResults: maxResults,
      key: this.apiKey
    });

    try {
      const response = await rateLimitManager.enqueue('youtube', {
        endpoint: `commentThreads?${params}`
      });

      return response.items.map(item => ({
        id: item.id,
        platform: 'youtube',
        text: item.snippet.topLevelComment.snippet.textDisplay,
        author: item.snippet.topLevelComment.snippet.authorDisplayName,
        timestamp: item.snippet.topLevelComment.snippet.publishedAt,
        likes: item.snippet.topLevelComment.snippet.likeCount || 0,
        videoId: videoId,
        videoTitle: 'Unknown Video',
        url: `https://www.youtube.com/watch?v=${videoId}&lc=${item.id}`
      }));
    } catch (error) {
      console.error('YouTube comments error:', error);
      return [];
    }
  }

  async getHazardContent(location = 'India', maxResults = 30) {
    const hazardQueries = [
      `tsunami ${location}`,
      `cyclone ${location}`,
      `flood ${location}`,
      `earthquake ${location}`,
      `storm ${location}`,
      `disaster ${location}`
    ];

    const allContent = [];
    
    for (const query of hazardQueries) {
      try {
        const videos = await this.searchVideos(query, { 
          maxResults: Math.ceil(maxResults / hazardQueries.length),
          order: 'date'
        });
        
        // Get comments for each video
        for (const video of videos) {
          try {
            const comments = await this.getVideoComments(video.id, 5);
            allContent.push(...comments.map(comment => ({
              ...comment,
              videoTitle: video.title,
              videoDescription: video.description
            })));
          } catch (error) {
            console.warn(`Failed to get comments for video ${video.id}:`, error);
          }
        }
        
        allContent.push(...videos);
      } catch (error) {
        console.warn(`Failed to fetch YouTube content for query: ${query}`, error);
      }
    }

    return allContent.slice(0, maxResults);
  }

  transformYouTubeData(response) {
    if (!response.items) return [];

    return response.items.map(video => ({
      id: video.id,
      platform: 'youtube',
      type: 'video',
      text: `${video.snippet.title}\n\n${video.snippet.description}`,
      title: video.snippet.title,
      description: video.snippet.description,
      author: video.snippet.channelTitle,
      timestamp: video.snippet.publishedAt,
      likes: parseInt(video.statistics?.likeCount || 0),
      views: parseInt(video.statistics?.viewCount || 0),
      comments: parseInt(video.statistics?.commentCount || 0),
      thumbnails: video.snippet.thumbnails,
      tags: video.snippet.tags || [],
      url: `https://www.youtube.com/watch?v=${video.id}`
    }));
  }
}

// Facebook/Meta API Integration (using public posts only)
class FacebookAPI {
  constructor() {
    this.accessToken =
      import.meta.env.VITE_FACEBOOK_ACCESS_TOKEN ||
      import.meta.env.REACT_APP_FACEBOOK_ACCESS_TOKEN ||
      '';
    this.baseURL = 'https://graph.facebook.com/v18.0';
  }

  async searchPublicPosts(query, options = {}) {
    // Note: Facebook's public post search is limited. This is a simplified implementation
    // In practice, you might need to use specific page IDs for news organizations
    
    const newsPageIds = [
      'ndtv',
      'timesnow',
      'abpnews',
      'republicworld',
      'zeenews'
    ];

    const allPosts = [];

    for (const pageId of newsPageIds) {
      try {
        const posts = await this.getPagePosts(pageId, query, options.maxResults || 10);
        allPosts.push(...posts);
      } catch (error) {
        console.warn(`Failed to fetch posts from page ${pageId}:`, error);
      }
    }

    return allPosts.slice(0, options.maxResults || 50);
  }

  async getPagePosts(pageId, searchTerm, maxResults = 10) {
    const params = new URLSearchParams({
      fields: 'id,message,created_time,likes.limit(0).summary(true),shares,comments.limit(0).summary(true),permalink_url',
      limit: maxResults,
      access_token: this.accessToken
    });

    try {
      const response = await rateLimitManager.enqueue('facebook', {
        endpoint: `${pageId}/posts?${params}`
      });

      const filteredPosts = response.data.filter(post => 
        post.message && post.message.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return this.transformFacebookData(filteredPosts, pageId);
    } catch (error) {
      console.error(`Facebook API error for page ${pageId}:`, error);
      return [];
    }
  }

  async getHazardPosts(location = 'India', maxResults = 30) {
    const hazardTerms = ['tsunami', 'cyclone', 'flood', 'earthquake', 'storm', 'disaster'];
    const allPosts = [];

    for (const term of hazardTerms) {
      try {
        const posts = await this.searchPublicPosts(`${term} ${location}`, { 
          maxResults: Math.ceil(maxResults / hazardTerms.length)
        });
        allPosts.push(...posts);
      } catch (error) {
        console.warn(`Failed to fetch Facebook posts for term: ${term}`, error);
      }
    }

    return allPosts.slice(0, maxResults);
  }

  transformFacebookData(posts, pageId) {
    return posts.map(post => ({
      id: post.id,
      platform: 'facebook',
      text: post.message || '',
      author: pageId,
      timestamp: post.created_time,
      likes: post.likes?.summary?.total_count || 0,
      shares: post.shares?.count || 0,
      comments: post.comments?.summary?.total_count || 0,
      url: post.permalink_url || `https://facebook.com/${post.id}`
    }));
  }
}

// RSS Feed Integration for News Sources
class RSSFeedAPI {
  constructor() {
    this.feeds = [
      { url: 'https://feeds.feedburner.com/ndtvnews-top-stories', source: 'NDTV' },
      { url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', source: 'TOI' },
      { url: 'https://www.hindustantimes.com/feeds/rss/india-news/index.xml', source: 'HT' },
      { url: 'https://indianexpress.com/section/india/feed/', source: 'IE' }
    ];
  }

  async fetchAllFeeds(maxResults = 50) {
    const allArticles = [];

    for (const feed of this.feeds) {
      try {
        const articles = await this.parseFeed(feed.url, feed.source);
        allArticles.push(...articles);
      } catch (error) {
        console.warn(`Failed to fetch RSS feed from ${feed.source}:`, error);
      }
    }

    return this.filterHazardContent(allArticles).slice(0, maxResults);
  }

  async parseFeed(feedUrl, source) {
    try {
      // Using a CORS proxy for RSS feeds (you might need to set up your own)
      const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
      
      const response = await fetch(proxyUrl);
      const data = await response.json();

      if (data.status !== 'ok') {
        throw new Error(`RSS feed error: ${data.message}`);
      }

      return data.items.map(item => ({
        id: `rss_${btoa(item.link)}_${Date.now()}`,
        platform: 'rss',
        source: source,
        text: `${item.title}\n\n${item.description.replace(/<[^>]*>/g, '')}`,
        title: item.title,
        description: item.description.replace(/<[^>]*>/g, ''),
        author: item.author || source,
        timestamp: item.pubDate,
        url: item.link,
        categories: item.categories || []
      }));
    } catch (error) {
      console.error(`Error parsing RSS feed from ${source}:`, error);
      return [];
    }
  }

  filterHazardContent(articles) {
    const hazardKeywords = [
      'tsunami', 'cyclone', 'hurricane', 'typhoon', 'flood', 'flooding',
      'earthquake', 'tremor', 'landslide', 'storm', 'disaster', 'emergency',
      'evacuation', 'warning', 'alert', 'surge', 'waves'
    ];

    return articles.filter(article => {
      const text = (article.title + ' ' + article.description).toLowerCase();
      return hazardKeywords.some(keyword => text.includes(keyword));
    });
  }
}

// Unified Social Media Service
class SocialMediaService {
  constructor() {
    this.twitter = new TwitterAPI();
    this.youtube = new YouTubeAPI();
    this.facebook = new FacebookAPI();
    this.rss = new RSSFeedAPI();
  }

  async fetchAllHazardContent(location = 'India', options = {}) {
    const { maxResults = 100, platforms = ['twitter', 'youtube', 'facebook', 'rss'] } = options;
    const resultsPerPlatform = Math.ceil(maxResults / platforms.length);
    
    const promises = [];

    if (platforms.includes('twitter')) {
      promises.push(
        this.twitter.getHazardTweets(location, resultsPerPlatform)
          .catch(error => {
            console.error('Twitter fetch failed:', error);
            return [];
          })
      );
    }

    if (platforms.includes('youtube')) {
      promises.push(
        this.youtube.getHazardContent(location, resultsPerPlatform)
          .catch(error => {
            console.error('YouTube fetch failed:', error);
            return [];
          })
      );
    }

    if (platforms.includes('facebook')) {
      promises.push(
        this.facebook.getHazardPosts(location, resultsPerPlatform)
          .catch(error => {
            console.error('Facebook fetch failed:', error);
            return [];
          })
      );
    }

    if (platforms.includes('rss')) {
      promises.push(
        this.rss.fetchAllFeeds(resultsPerPlatform)
          .catch(error => {
            console.error('RSS fetch failed:', error);
            return [];
          })
      );
    }

    try {
      const results = await Promise.allSettled(promises);
      const allContent = results
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => result.value);

      // Sort by timestamp (newest first)
      return allContent
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, maxResults);
    } catch (error) {
      console.error('Error fetching social media content:', error);
      return [];
    }
  }

  async fetchRealTimeContent(location = 'India', lastFetchTime = null) {
    const options = {
      publishedAfter: lastFetchTime || new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      maxResults: 50
    };

    return this.fetchAllHazardContent(location, {
      ...options,
      platforms: ['twitter', 'rss'] // Focus on real-time sources
    });
  }

  async searchSpecificHazard(hazardType, location = 'India', options = {}) {
    const hazardQueries = {
      tsunami: 'tsunami OR "tidal wave" OR "sea surge"',
      cyclone: 'cyclone OR hurricane OR typhoon',
      flood: 'flood OR flooding OR "heavy rain"',
      earthquake: 'earthquake OR tremor OR seismic',
      landslide: 'landslide OR "slope failure"',
      storm: 'storm OR "storm surge" OR "high waves"'
    };

    const query = hazardQueries[hazardType.toLowerCase()] || hazardType;
    const locationQuery = location ? ` ${location}` : '';
    const fullQuery = query + locationQuery;

    const promises = [];

    // Search across platforms
    if (options.platforms?.includes('twitter') !== false) {
      promises.push(
        this.twitter.searchTweets(fullQuery, options).catch(() => [])
      );
    }

    if (options.platforms?.includes('youtube') !== false) {
      promises.push(
        this.youtube.searchVideos(fullQuery, options).catch(() => [])
      );
    }

    const results = await Promise.allSettled(promises);
    return results
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => result.value)
      .slice(0, options.maxResults || 50);
  }
}

// Export singleton instance
export const socialMediaService = new SocialMediaService();