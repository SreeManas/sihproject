import React, { useState, useMemo, useRef, useCallback } from "react";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import InfiniteLoader from "react-window-infinite-loader";

const ITEM_HEIGHT = 200;
const LOAD_MORE_THRESHOLD = 10;

const PostItem = React.memo(({ index, style, data }) => {
  const { posts, onPostSelect, onPostVisible } = data;
  const post = posts[index];

  const itemRef = useRef(null);

  if (!post) {
    return (
      <div style={style}>
        <div className="p-4 bg-gray-100 animate-pulse">
          <div className="h-4 bg-gray-300 rounded mb-2"></div>
          <div className="h-3 bg-gray-300 rounded mb-1"></div>
          <div className="h-3 bg-gray-300 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  const getSeverityColor = (score) => {
    if (score >= 15) return "border-l-red-500";
    if (score >= 10) return "border-l-orange-500";
    if (score >= 5) return "border-l-yellow-500";
    return "border-l-blue-500";
  };

  return (
    <div style={style} ref={itemRef}>
      <div
        className={`mx-4 my-2 p-4 bg-white shadow rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-shadow ${getSeverityColor(
          post.priorityScore
        )}`}
        onClick={() => onPostSelect?.(post)}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                post.priorityScore >= 15
                  ? "bg-red-600 text-white"
                  : post.priorityScore >= 10
                  ? "bg-orange-500 text-white"
                  : post.priorityScore >= 5
                  ? "bg-yellow-400 text-black"
                  : "bg-blue-500 text-white"
              }`}
            >
              {post.hazardLabel}
            </span>
            <span className="text-sm text-gray-500">
              @{post.author || "unknown"}
            </span>
          </div>
          <div className="font-bold text-right">
            <div
              className={`${
                post.priorityScore >= 15
                  ? "text-red-600"
                  : post.priorityScore >= 10
                  ? "text-orange-500"
                  : post.priorityScore >= 5
                  ? "text-yellow-600"
                  : "text-blue-500"
              }`}
            >
              {post.priorityScore}
            </div>
          </div>
        </div>

        <div className="mb-3 leading-relaxed text-sm line-clamp-3">
          {post.highlightedText ? (
            <div
              dangerouslySetInnerHTML={{ __html: post.highlightedText }}
            />
          ) : (
            post.text
          )}
        </div>

        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>
            {post.entities?.length || 0} entities • {post.sentiment} •{" "}
            {(post.confidence * 100).toFixed(0)}% confidence
          </span>
          <span>
            👍 {post.engagement?.likes || 0} • 🔄{" "}
            {post.engagement?.shares || 0}
          </span>
        </div>
      </div>
    </div>
  );
});

PostItem.displayName = "PostItem";

const VirtualizedSocialFeed = ({
  posts,
  onLoadMore,
  hasNextPage,
  onPostSelect,
  onPostVisible,
  loading = false,
}) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const listRef = useRef(null);

  const itemData = useMemo(
    () => ({
      posts,
      onPostSelect,
      onPostVisible,
    }),
    [posts, onPostSelect, onPostVisible]
  );

  const isItemLoaded = useCallback(
    (index) => !!posts[index],
    [posts]
  );

  const loadMoreItems = useCallback(
    async (startIndex, stopIndex) => {
      if (onLoadMore && hasNextPage && !loading) {
        await onLoadMore(startIndex, stopIndex);
      }
    },
    [onLoadMore, hasNextPage, loading]
  );

  const itemCount = hasNextPage ? posts.length + 1 : posts.length;

  const handleItemsRendered = useCallback(
    ({ visibleStartIndex, visibleStopIndex }) => {
      setVisibleRange({ start: visibleStartIndex, end: visibleStopIndex });
    },
    []
  );

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-50 px-4 py-2 border-b">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">
            Showing {visibleRange.start + 1}-
            {Math.min(visibleRange.end + 1, posts.length)} of {posts.length}{" "}
            posts
          </span>
          <button
            onClick={() => listRef.current?.scrollToItem(0, "start")}
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            ↑ Back to top
          </button>
        </div>
      </div>

      <div className="flex-1">
        <AutoSizer>
          {({ height, width }) => (
            <InfiniteLoader
              isItemLoaded={isItemLoaded}
              itemCount={itemCount}
              loadMoreItems={loadMoreItems}
              threshold={LOAD_MORE_THRESHOLD}
            >
              {({ onItemsRendered, ref }) => (
                <List
                  ref={(list) => {
                    listRef.current = list;
                    ref(list);
                  }}
                  height={height}
                  width={width}
                  itemCount={itemCount}
                  itemSize={ITEM_HEIGHT}
                  itemData={itemData}
                  onItemsRendered={(params) => {
                    onItemsRendered(params);
                    handleItemsRendered(params);
                  }}
                  overscanCount={5}
                >
                  {PostItem}
                </List>
              )}
            </InfiniteLoader>
          )}
        </AutoSizer>
      </div>

      {loading && (
        <div className="p-4 text-center bg-gray-50 border-t">
          <div className="inline-flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Loading more posts...
          </div>
        </div>
      )}
    </div>
  );
};

export default VirtualizedSocialFeed;

