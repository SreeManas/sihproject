import React, { useState, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { useNLPWorker } from "../hooks/useWebWorker";

const LazyPostCard = React.memo(({ post, onVisible, onPostSelect }) => {
  const [processedPost, setProcessedPost] = useState(post);
  const { processSinglePost } = useNLPWorker();

  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  React.useEffect(() => {
    if (inView && !post.hazardLabel) {
      processSinglePost(post)
        .then((result) => {
          setProcessedPost(result);
          onVisible?.(result);
        })
        .catch((error) => console.error("Error processing post:", error));
    }
  }, [inView, post, processSinglePost, onVisible]);

  return (
    <div ref={ref} className="mb-4">
      <div
        className={`p-4 bg-white shadow rounded-lg border-l-4 cursor-pointer hover:shadow-md`}
        onClick={() => onPostSelect?.(processedPost)}
      >
        <div className="flex justify-between items-start mb-2">
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-500 text-white">
            {processedPost.hazardLabel || "Processing..."}
          </span>
          <span className="text-sm text-gray-500">
            @{processedPost.author || "unknown"}
          </span>
        </div>
        <div className="mb-3 text-gray-800">{processedPost.text}</div>
      </div>
    </div>
  );
});

LazyPostCard.displayName = "LazyPostCard";

const LazyLoadedFeed = ({ posts, onPostSelect, onPostVisible }) => {
  const [visiblePosts, setVisiblePosts] = useState([]);

  const handlePostVisible = useCallback(
    (processedPost) => {
      if (!visiblePosts.some((p) => p.id === processedPost.id)) {
        onPostVisible?.(processedPost);
        setVisiblePosts((prev) => [...prev, processedPost]);
      }
    },
    [visiblePosts, onPostVisible]
  );

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-3 rounded-lg">
        <span className="text-blue-800">
          {posts.length} posts • {visiblePosts.length} processed
        </span>
      </div>
      <div>
        {posts.map((post, i) => (
          <LazyPostCard
            key={post.id || i}
            post={post}
            onVisible={handlePostVisible}
            onPostSelect={onPostSelect}
          />
        ))}
      </div>
    </div>
  );
};

export default LazyLoadedFeed;
