// src/components/EnhancedSocialFeed.jsx
import React, { useEffect, useState, useMemo } from "react";
import { 
  classifyHazard, 
  extractEntities, 
  highlightKeywords, 
  analyzeSentiment,
  extractEngagementMetrics,
  calculatePriorityScore 
} from "../utils/enhancedHybridNLP.js";

const SeverityBadge = ({ level }) => {
  const colors = {
    critical: "bg-red-600 text-white",
    high: "bg-orange-500 text-white",
    medium: "bg-yellow-400 text-black",
    low: "bg-blue-500 text-white"
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[level]}`}>
      {level.toUpperCase()}
    </span>
  );
};

const PriorityIndicator = ({ score }) => {
  const getColor = (score) => {
    if (score >= 15) return "text-red-600";
    if (score >= 10) return "text-orange-500";
    if (score >= 5) return "text-yellow-600";
    return "text-blue-500";
  };
  
  return (
    <div className={`font-bold ${getColor(score)}`}>
      Priority: {score}
    </div>
  );
};

const EntityDisplay = ({ entities }) => {
  const entityColors = {
    LOC: "bg-green-100 text-green-800",
    PERSON: "bg-blue-100 text-blue-800",
    ORG: "bg-purple-100 text-purple-800",
    HAZARD: "bg-red-100 text-red-800",
    NUMBER: "bg-gray-100 text-gray-800"
  };
  
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {entities.map((entity, idx) => (
        <span 
          key={idx} 
          className={`px-2 py-1 rounded text-xs ${entityColors[entity.type] || "bg-gray-100"}`}
        >
          {entity.text} ({entity.type})
        </span>
      ))}
    </div>
  );
};

const EngagementMetrics = ({ metrics }) => (
  <div className="flex gap-4 text-xs text-gray-600 mt-2">
    <span>👍 {metrics.likes}</span>
    <span>🔄 {metrics.shares}</span>
    <span>💬 {metrics.comments}</span>
    <span>📈 {metrics.reach}</span>
    <span>📊 {(metrics.engagement_rate * 100).toFixed(1)}%</span>
  </div>
);

const SocialFeed = ({ posts, filters = {}, onPostSelect }) => {
  const [processedPosts, setProcessedPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingErrors, setProcessingErrors] = useState([]);

  useEffect(() => {
    const processPosts = async () => {
      if (!posts || posts.length === 0) return;
      // If posts are already NLP-processed (from socialMapService), skip reprocessing
      if (posts[0]?.hazardLabel && posts[0]?.priorityScore !== undefined) {
        setProcessedPosts(posts.map((p, i) => ({
          ...p,
          id: p.id ?? i,
          highlightedText: p.highlightedText ?? highlightKeywords(p.text || ''),
        })));
        return;
      }

      setLoading(true);
      setProcessingErrors([]);
      try {
        const processed = await Promise.all(
          posts.map(async (post, index) => {
            try {
              const classificationResult = await classifyHazard(post.text);
              const entities = extractEntities(post.text, post.nerResults || []);
              const highlightedText = highlightKeywords(post.text);
              const sentiment = analyzeSentiment(post.text);
              const engagement = extractEngagementMetrics(post);
              const priorityScore = calculatePriorityScore(
                classificationResult,
                entities,
                engagement
              );
              return {
                ...post,
                id: post.id || index,
                hazardLabel: classificationResult.label,
                confidence: classificationResult.confidence,
                entities,
                highlightedText,
                sentiment,
                engagement,
                priorityScore,
                processedAt: new Date().toISOString(),
              };
            } catch (error) {
              console.error(`Error processing post ${index}:`, error);
              setProcessingErrors((prev) => [
                ...prev,
                { index, error: error.message },
              ]);
              return {
                ...post,
                id: post.id || index,
                hazardLabel: "Processing Error",
                confidence: 0,
                entities: [],
                highlightedText: post.text,
                sentiment: "UNKNOWN",
                engagement: extractEngagementMetrics(post),
                priorityScore: 0,
                error: true,
              };
            }
          })
        );
        setProcessedPosts(processed);
      } catch (error) {
        console.error("Batch processing error:", error);
      } finally {
        setLoading(false);
      }
    };

    processPosts();
  }, [posts]);

  // Filter and sort posts
  const filteredAndSortedPosts = useMemo(() => {
    let filtered = processedPosts;
    
    // Apply filters
    if (filters.hazardType && filters.hazardType !== "all") {
      filtered = filtered.filter(post => 
        post.hazardLabel.toLowerCase() === filters.hazardType.toLowerCase()
      );
    }
    
    if (filters.minPriority) {
      filtered = filtered.filter(post => post.priorityScore >= filters.minPriority);
    }
    
    if (filters.sentiment && filters.sentiment !== "all") {
      filtered = filtered.filter(post => post.sentiment === filters.sentiment);
    }
    
    if (filters.location) {
      filtered = filtered.filter(post => 
        post.entities.some(entity => 
          entity.type === "LOC" && 
          entity.text.toLowerCase().includes(filters.location.toLowerCase())
        )
      );
    }
    
    // Sort by priority score (descending)
    return filtered.sort((a, b) => b.priorityScore - a.priorityScore);
  }, [processedPosts, filters]);

  const getSeverityLevel = (confidence, hazardLabel) => {
    const criticalHazards = ["Tsunami", "Earthquake", "Cyclone"];
    const highHazards = ["Flood", "Storm Surge", "Landslide"];
    
    if (criticalHazards.includes(hazardLabel) && confidence > 0.7) return "critical";
    if (highHazards.includes(hazardLabel) && confidence > 0.6) return "high";
    if (confidence > 0.5) return "medium";
    return "low";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Processing social media posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Processing Errors */}
      {processingErrors.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <h4 className="text-yellow-800 font-semibold">Processing Warnings:</h4>
          <ul className="text-yellow-700 text-sm mt-1">
            {processingErrors.map((error, idx) => (
              <li key={idx}>Post {error.index + 1}: {error.error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Posts Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex justify-between items-center">
          <span className="text-blue-800 font-semibold">
            {filteredAndSortedPosts.length} posts processed
          </span>
          <span className="text-blue-600 text-sm">
            Avg Priority: {(filteredAndSortedPosts.reduce((sum, post) => sum + post.priorityScore, 0) / filteredAndSortedPosts.length || 0).toFixed(1)}
          </span>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-4 overflow-y-auto max-h-[600px]">
        {filteredAndSortedPosts.map((post) => (
          <div 
            key={post.id} 
            className={`p-4 bg-white shadow rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-shadow ${
              post.error ? 'border-l-red-500' : 
              post.priorityScore >= 15 ? 'border-l-red-500' :
              post.priorityScore >= 10 ? 'border-l-orange-500' :
              post.priorityScore >= 5 ? 'border-l-yellow-500' : 'border-l-blue-500'
            }`}
            onClick={() => onPostSelect && onPostSelect(post)}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <SeverityBadge level={getSeverityLevel(post.confidence, post.hazardLabel)} />
                <span className="text-sm text-gray-500">
                  @{post.author || 'unknown'} • {post.platform || 'social'}
                </span>
              </div>
              <PriorityIndicator score={post.priorityScore} />
            </div>
            
            {/* Content */}
            <div 
              className="mb-3 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: post.highlightedText }} 
            />
            
            {/* Classification */}
            <div className="flex justify-between items-center text-sm mb-2">
              <div>
                <span className="font-semibold text-gray-700">Hazard:</span> 
                <span className="ml-1">{post.hazardLabel}</span>
                <span className="text-gray-500 ml-2">
                  ({(post.confidence * 100).toFixed(1)}% confidence)
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Sentiment:</span>
                <span className={`ml-1 ${
                  post.sentiment === 'POSITIVE' ? 'text-green-600' :
                  post.sentiment === 'NEGATIVE' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {post.sentiment}
                </span>
              </div>
            </div>
            
            {/* Entities */}
            {post.entities.length > 0 && (
              <EntityDisplay entities={post.entities} />
            )}
            
            {/* Engagement Metrics */}
            <EngagementMetrics metrics={post.engagement} />
            
            {/* Timestamp */}
            <div className="text-xs text-gray-400 mt-2">
              Posted: {new Date(post.timestamp || post.processedAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
      
      {filteredAndSortedPosts.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          No posts match the current filters
        </div>
      )}
    </div>
  );
};

export default SocialFeed;
