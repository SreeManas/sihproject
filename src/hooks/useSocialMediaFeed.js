// src/hooks/useSocialMediaFeed.js
import { useState, useEffect, useCallback } from 'react';
import { socialMediaService } from '../services/socialMediaAPI';

export const useSocialMediaFeed = (location = 'India', options = {}) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalFetched, setTotalFetched] = useState(0);

  const fetchInitialPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const newPosts = await socialMediaService.fetchAllHazardContent(location, {
        maxResults: options.initialBatch || 50,
        platforms: options.platforms || ['twitter', 'youtube', 'facebook', 'rss']
      });

      setPosts(newPosts);
      setTotalFetched(newPosts.length);
      setLastFetchTime(new Date().toISOString());
      setHasMore(newPosts.length >= (options.initialBatch || 50));
    } catch (err) {
      setError(err);
      // Error fetching initial posts
    } finally {
      setLoading(false);
    }
  }, [location, options.initialBatch, options.platforms]);

  const fetchMorePosts = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const morePosts = await socialMediaService.fetchAllHazardContent(location, {
        maxResults: options.batchSize || 25,
        platforms: options.platforms || ['twitter', 'youtube', 'rss'],
        offset: totalFetched
      });

      if (morePosts.length === 0) {
        setHasMore(false);
      } else {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newUniquePosts = morePosts.filter(p => !existingIds.has(p.id));
          return [...prev, ...newUniquePosts];
        });
        setTotalFetched(prev => prev + morePosts.length);
      }
    } catch (err) {
      setError(err);
      // Error fetching more posts
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, location, totalFetched, options.batchSize, options.platforms]);

  const fetchRealTimePosts = useCallback(async () => {
    if (loading) return;

    try {
      const realtimePosts = await socialMediaService.fetchRealTimeContent(
        location, 
        lastFetchTime
      );

      if (realtimePosts.length > 0) {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = realtimePosts.filter(p => !existingIds.has(p.id));
          return [...newPosts, ...prev];
        });
        setLastFetchTime(new Date().toISOString());
      }
    } catch (err) {
      // Error fetching real-time posts
    }
  }, [location, lastFetchTime, loading]);

  const searchHazard = useCallback(async (hazardType) => {
    setLoading(true);
    setError(null);

    try {
      const results = await socialMediaService.searchSpecificHazard(
        hazardType, 
        location, 
        { maxResults: options.searchBatch || 30 }
      );
      
      setPosts(results);
      setTotalFetched(results.length);
    } catch (err) {
      setError(err);
      // Error searching hazard
    } finally {
      setLoading(false);
    }
  }, [location, options.searchBatch]);

  const refreshFeed = useCallback(() => {
    setPosts([]);
    setTotalFetched(0);
    setHasMore(true);
    setError(null);
    fetchInitialPosts();
  }, [fetchInitialPosts]);

  useEffect(() => {
    if (options.realTime && lastFetchTime) {
      const interval = setInterval(fetchRealTimePosts, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [options.realTime, lastFetchTime, fetchRealTimePosts]);

  useEffect(() => {
    fetchInitialPosts();
  }, [fetchInitialPosts]);

  return {
    posts,
    loading,
    error,
    hasMore,
    totalFetched,
    lastFetchTime,
    fetchMorePosts,
    fetchRealTimePosts,
    searchHazard,
    refreshFeed
  };
};
