import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const VideoSearch = ({ onAddVideo }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    setIsSearching(true);
    
    try {
      const response = await axios.get(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data);
      
      if (response.data.length === 0) {
        toast('No videos found. Try different keywords.', { icon: '🔍' });
      }
    } catch (error) {
      console.error('Search error:', error);
      if (error.response?.status === 500 && error.response?.data?.error?.includes('API key')) {
        toast.error('YouTube API not configured. Please add YOUTUBE_API_KEY to .env');
      } else {
        toast.error('Failed to search videos. Please try again.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddVideo = (video) => {
    onAddVideo(video);
    // Keep the search results visible so users can add multiple videos
  };

  const clearResults = () => {
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <div className="search-section">
      <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: '600' }}>
        <i className="fas fa-search" style={{ marginRight: '0.5rem' }}></i>
        Search Videos
      </h2>
      
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          className="search-input"
          placeholder="Search for videos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={isSearching}
        />
        <button 
          type="submit" 
          className="search-btn"
          disabled={isSearching}
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

      {searchResults.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '0.75rem' 
          }}>
            <span style={{ fontSize: '0.9rem', color: '#666' }}>
              {searchResults.length} results
            </span>
            <button
              onClick={clearResults}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                fontSize: '0.8rem',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => e.target.style.background = '#f0f0f0'}
              onMouseLeave={(e) => e.target.style.background = 'none'}
            >
              <i className="fas fa-times"></i> Clear
            </button>
          </div>
          
          <div className="search-results">
            {searchResults.map((video, index) => (
              <div 
                key={`${video.videoId}-${index}`} 
                className="search-result"
                onClick={() => handleAddVideo(video)}
              >
                <img 
                  src={video.thumbnail} 
                  alt={video.title}
                  className="result-thumbnail"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA4MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMiAyMkw0OCAzMkwzMiA0MlYyMloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                  }}
                />
                <div className="result-info">
                  <div className="result-title" title={video.title}>
                    {video.title}
                  </div>
                  <div className="result-channel">
                    {video.channelTitle}
                  </div>
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  color: '#667eea',
                  fontSize: '1.2rem',
                  flexShrink: 0
                }}>
                  <i className="fas fa-plus-circle"></i>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {searchResults.length === 0 && !isSearching && (
        <div className="empty-state">
          <i className="fas fa-search"></i>
          <p>Search for YouTube videos to add to your playlist</p>
          <small style={{ color: '#999', marginTop: '0.5rem', display: 'block' }}>
            Try searching for songs, music videos, or any content you'd like to listen to together
          </small>
        </div>
      )}
    </div>
  );
};

export default VideoSearch;
