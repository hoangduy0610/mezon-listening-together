const axios = require('axios');
const Logger = require('../utils/Logger');

class YouTubeService {
  constructor(apiKey, maxResults = 10) {
    this.apiKey = apiKey;
    this.maxResults = maxResults;
    this.logger = new Logger('YouTubeService');
    this.baseURL = 'https://www.googleapis.com/youtube/v3';
  }

  /**
   * Search for videos on YouTube
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum number of results
   * @returns {Promise<Array>} Array of video objects
   */
  async searchVideos(query, maxResults = this.maxResults) {
    try {
      this.validateApiKey();
      
      const response = await axios.get(`${this.baseURL}/search`, {
        params: {
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults,
          key: this.apiKey
        }
      });

      const videos = response.data.items.map(this.transformVideoData);
      
      this.logger.debug(`Search completed for "${query}"`, { 
        resultCount: videos.length,
        query 
      });
      
      return videos;

    } catch (error) {
      this.logger.error('YouTube search failed', {
        query,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      throw this.handleApiError(error);
    }
  }

  /**
   * Transform YouTube API video data to our format
   * @param {Object} item - YouTube API video item
   * @returns {Object} Transformed video object
   */
  transformVideoData(item) {
    return {
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      channelTitle: item.snippet.channelTitle,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt
    };
  }

  /**
   * Validate that API key is configured
   * @throws {Error} If API key is missing
   */
  validateApiKey() {
    if (!this.apiKey) {
      throw new Error('YouTube API key not configured. Please add YOUTUBE_API_KEY to environment variables.');
    }
  }

  /**
   * Handle YouTube API errors
   * @param {Error} error - Axios error
   * @returns {Error} Formatted error
   */
  handleApiError(error) {
    if (error.response?.status === 403) {
      return new Error('YouTube API quota exceeded or invalid API key');
    }
    
    if (error.response?.status === 400) {
      return new Error('Invalid search query');
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new Error('Network error: Unable to connect to YouTube API');
    }
    
    return new Error('YouTube API error: ' + error.message);
  }

  /**
   * Get video details by ID
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<Object>} Video details
   */
  async getVideoDetails(videoId) {
    try {
      this.validateApiKey();
      
      const response = await axios.get(`${this.baseURL}/videos`, {
        params: {
          part: 'snippet,contentDetails',
          id: videoId,
          key: this.apiKey
        }
      });

      if (response.data.items.length === 0) {
        throw new Error('Video not found');
      }

      const video = response.data.items[0];
      return {
        videoId: video.id,
        title: video.snippet.title,
        channelTitle: video.snippet.channelTitle,
        duration: video.contentDetails.duration,
        thumbnail: video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
        description: video.snippet.description
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
