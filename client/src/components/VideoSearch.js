import React, { useMemo } from 'react';
import { useYouTubeSearch } from '../hooks/useYouTubeSearch';

const VideoSearch = ({ onAddVideo, isConnected }) => {
  const {
    searchQuery,
    searchResults,
    isSearching,
    searchError,
    hasSearched,
    updateSearchQuery,
    handleSearchSubmit,
    clearSearch,
    retrySearch
  } = useYouTubeSearch();

  const handleAddVideo = (video) => {
    if (!isConnected) {
      return;
    }
    onAddVideo(video);
  };

  // Memoize search results to prevent unnecessary re-renders
  const searchResultItems = useMemo(() => {
    return searchResults.map((video, index) => (
      <SearchResultItem
        key={`${video.videoId}-${index}`}
        video={video}
        onAdd={handleAddVideo}
        isConnected={isConnected}
      />
    ));
  }, [searchResults, isConnected]);

  const hasResults = searchResults.length > 0;
  const showEmptyState = hasSearched && !isSearching && !hasResults && !searchError;

  return (
    <div className="search-section">
      <div className="section-header">
        <h2 className="section-title">
          <i className="fas fa-search"></i>
          Search Videos
        </h2>
        {!isConnected && (
          <div className="offline-indicator">
            <i className="fas fa-wifi-slash"></i>
            Offline
          </div>
        )}
      </div>
      
      <form onSubmit={handleSearchSubmit} className="search-form">
        <div className="search-input-wrapper">
          <input
            type="text"
            className={`search-input ${searchError ? 'error' : ''}`}
            placeholder="Search for videos..."
            value={searchQuery}
            onChange={(e) => updateSearchQuery(e.target.value)}
            disabled={isSearching || !isConnected}
            maxLength={100}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-input-btn"
              onClick={clearSearch}
              title="Clear search"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
        
        <button 
          type="submit" 
          className="search-btn"
          disabled={isSearching || !isConnected || !searchQuery.trim()}
        >
          {isSearching ? (
            <>
              <i className="fas fa-spinner fa-spin"></i>
              Searching...
            </>
          ) : (
            <>
              <i className="fas fa-search"></i>
              Search
            </>
          )}
        </button>
      </form>

      {searchError && (
        <div className="search-error">
          <i className="fas fa-exclamation-triangle"></i>
          <span>{searchError}</span>
          <button 
            className="retry-btn"
            onClick={retrySearch}
            disabled={isSearching || !isConnected}
          >
            Retry
          </button>
        </div>
      )}

      {hasResults && (
        <div className="search-results-container">
          <div className="search-results-header">
            <span className="results-count">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </span>
            <button
              className="clear-results-btn"
              onClick={clearSearch}
              title="Clear search results"
            >
              <i className="fas fa-times"></i> Clear
            </button>
          </div>
          
          <div className="search-results">
            {searchResultItems}
          </div>
        </div>
      )}

      {showEmptyState && (
        <SearchEmptyState />
      )}

      {!hasSearched && !isSearching && (
        <SearchInitialState />
      )}
    </div>
  );
};

// Memoized search result item component
const SearchResultItem = React.memo(({ video, onAdd, isConnected }) => {
  const handleClick = () => {
    if (isConnected) {
      onAdd(video);
    }
  };

  const fallbackThumbnail = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA4MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMiAyMkw0OCAzMkwzMiA0MlYyMloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';

  return (
    <div 
      className={`search-result ${!isConnected ? 'disabled' : ''}`}
      onClick={handleClick}
      title={isConnected ? 'Click to add to playlist' : 'Connect to add videos'}
    >
      <img 
        src={video.thumbnail} 
        alt={video.title}
        className="result-thumbnail"
        onError={(e) => { e.target.src = fallbackThumbnail; }}
        loading="lazy"
      />
      <div className="result-info">
        <div className="result-title" title={video.title}>
          {video.title}
        </div>
        <div className="result-channel">
          {video.channelTitle}
        </div>
      </div>
      <div className="result-action">
        <i className={`fas ${isConnected ? 'fa-plus-circle' : 'fa-wifi-slash'}`}></i>
      </div>
    </div>
  );
});

// Empty state component
const SearchEmptyState = () => (
  <div className="empty-state">
    <i className="fas fa-search"></i>
    <h3>No videos found</h3>
    <p>Try different keywords or check your spelling</p>
  </div>
);

// Initial state component
const SearchInitialState = () => (
  <div className="empty-state">
    <i className="fas fa-youtube"></i>
    <h3>Search YouTube Videos</h3>
    <p>Search for songs, music videos, or any content you'd like to listen to together</p>
    <div className="search-suggestions">
      <span>Try: </span>
      <button className="suggestion-tag">lofi music</button>
      <button className="suggestion-tag">relaxing piano</button>
      <button className="suggestion-tag">80s hits</button>
    </div>
  </div>
);

export default VideoSearch;
