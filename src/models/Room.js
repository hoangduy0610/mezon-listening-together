const { v4: uuidv4 } = require('uuid');

class Room {
  constructor(id) {
    this.id = id;
    this.playlist = [];
    this.currentVideo = null;
    this.currentTime = 0;
    this.isPlaying = false;
    this.volume = 50;
    this.participants = new Set();
    this.lastUpdate = Date.now();
    this.createdAt = Date.now();
  }

  /**
   * Add a video to the playlist
   * @param {Object} video - Video object from YouTube search
   */
  addVideo(video) {
    const videoWithId = {
      ...video,
      id: uuidv4(),
      addedAt: Date.now()
    };
    
    this.playlist.push(videoWithId);
    return videoWithId;
  }

  /**
   * Remove a video from the playlist
   * @param {string} videoId - Video ID to remove
   */
  removeVideo(videoId) {
    const initialLength = this.playlist.length;
    this.playlist = this.playlist.filter(video => video.id !== videoId);
    return this.playlist.length !== initialLength;
  }

  /**
   * Play the next video in the playlist
   * @returns {Object|null} Next video or null if playlist is empty
   */
  playNext() {
    if (this.playlist.length > 0) {
      this.currentVideo = this.playlist.shift();
      this.currentTime = 0;
      this.isPlaying = true;
      this.lastUpdate = Date.now();
      return this.currentVideo;
    }
    
    this.currentVideo = null;
    this.isPlaying = false;
    this.currentTime = 0;
    return null;
  }

  /**
   * Update room state
   * @param {Object} state - State updates
   */
  updateState(state) {
    if (state.currentTime !== undefined) {
      this.currentTime = state.currentTime;
    }
    if (state.isPlaying !== undefined) {
      this.isPlaying = state.isPlaying;
    }
    if (state.volume !== undefined) {
      this.volume = state.volume;
    }
    
    this.lastUpdate = Date.now();
  }

  /**
   * Get current room state with time calculations
   * @returns {Object} Current room state
   */
  getState() {
    const now = Date.now();
    let adjustedTime = this.currentTime;
    
    // Adjust time if video is playing
    if (this.isPlaying && this.currentVideo) {
      const timePassed = (now - this.lastUpdate) / 1000;
      adjustedTime = Math.max(0, this.currentTime + timePassed);
    }

    return {
      currentVideo: this.currentVideo,
      currentTime: adjustedTime,
      isPlaying: this.isPlaying,
      volume: this.volume,
      playlist: [...this.playlist], // Return copy
      participantCount: this.participants.size,
      lastUpdate: this.lastUpdate
    };
  }

  /**
   * Add a participant to the room
   * @param {string} socketId - Socket ID of participant
   */
  addParticipant(socketId) {
    this.participants.add(socketId);
  }

  /**
   * Remove a participant from the room
   * @param {string} socketId - Socket ID of participant
   */
  removeParticipant(socketId) {
    return this.participants.delete(socketId);
  }

  /**
   * Check if room is empty
   * @returns {boolean} True if no participants
   */
  isEmpty() {
    return this.participants.size === 0;
  }

  /**
   * Reorder playlist
   * @param {Array} newPlaylist - New playlist order
   */
  reorderPlaylist(newPlaylist) {
    // Validate that all items exist and maintain IDs
    const existingIds = new Set(this.playlist.map(v => v.id));
    const newIds = new Set(newPlaylist.map(v => v.id));
    
    if (existingIds.size === newIds.size && 
        [...existingIds].every(id => newIds.has(id))) {
      this.playlist = newPlaylist;
      return true;
    }
    
    return false;
  }
}

module.exports = Room;
