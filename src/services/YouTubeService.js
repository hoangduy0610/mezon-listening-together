const yt = require('youtube-search-without-api-key');
const Logger = require('../utils/Logger');

class YouTubeService {
  constructor(apiKey = null, maxResults = 10) {
    // API key no longer needed but keeping parameter for backward compatibility
    this.maxResults = maxResults;
    this.logger = new Logger('YouTubeService');
  }

  /**
   * Search for videos on YouTube
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum number of results
   * @returns {Promise<Array>} Array of video objects
   */
  async searchVideos(query, maxResults = this.maxResults) {
    try {
      const videos = await yt.search(query.trim());
      
      // Limit results to maxResults
      const limitedVideos = videos.slice(0, maxResults);
      
      // Transform to our expected format
      const transformedVideos = limitedVideos.map(this.transformVideoData);
      
      this.logger.debug(`Search completed for "${query}"`, { 
        resultCount: transformedVideos.length,
        query 
      });
      
      return transformedVideos;

    } catch (error) {
      this.logger.error('YouTube search failed', {
        query,
        error: error.message
      });
      
      throw this.handleApiError(error);
    }
  }

  /**
   * Transform youtube-search-without-api-key video data to our format
   * @param {Object} item - Video item from youtube-search-without-api-key
   * @returns {Object} Transformed video object
   */
  transformVideoData(item) {
    return {
      videoId: item.id?.videoId || item.snippet?.url?.split('v=')[1]?.split('&')[0],
      title: item.title || item.snippet?.title,
      thumbnail: item.snippet?.thumbnails?.url || item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
      channelTitle: item.channelTitle || 'Unknown Channel', // New API doesn't provide channel info
      description: item.description || '',
      publishedAt: item.snippet?.publishedAt || 'Unknown'
    };
  }

  // API key validation no longer needed with youtube-search-without-api-key

  /**
   * Handle search errors
   * @param {Error} error - Search error
   * @returns {Error} Formatted error
   */
  handleApiError(error) {
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new Error('Network error: Unable to connect to YouTube');
    }
    
    if (error.message && error.message.includes('timeout')) {
      return new Error('Search timeout: YouTube request took too long');
    }
    
    return new Error('YouTube search error: ' + error.message);
  }

  /**
   * Get video details by ID
   * Note: youtube-search-without-api-key doesn't provide detailed video info by ID
   * This method now performs a search with the video ID
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<Object>} Video details
   */
  async getVideoDetails(videoId) {
    try {
      // Search using the video ID
      const results = await yt.search(videoId);
      
      if (!results || results.length === 0) {
        throw new Error('Video not found');
      }

      // Find exact match or use first result
      const video = results.find(v => v.id?.videoId === videoId) || results[0];
      
      return {
        videoId: video.id?.videoId || videoId,
        title: video.title || video.snippet?.title,
        channelTitle: video.channelTitle || 'Unknown Channel',
        duration: video.duration_raw || 'Unknown',
        thumbnail: video.snippet?.thumbnails?.url || video.snippet?.thumbnails?.high?.url,
        description: video.description || ''
      };

    } catch (error) {
      this.logger.error('Failed to get video details', {
        videoId,
        error: error.message
      });
      
      throw this.handleApiError(error);
    }
  }
}

module.exports = YouTubeService;
