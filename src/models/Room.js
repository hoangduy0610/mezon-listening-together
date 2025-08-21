const { v4: uuidv4 } = require('uuid');

class Room {
  constructor(id) {
    this.id = id;
    this.playlist = [];
    this.currentVideo = null;
    this.currentTime = 0;
    this.isPlaying = false;
    this.volume = 50;
    this.participants = new Map(); // Changed to Map to store user info
    this.owner = null; // First user to join becomes owner
    this.playlistPermissions = new Set(); // Users with playlist edit permissions
    this.lastUpdate = Date.now();
    this.createdAt = Date.now();
  }

  /**
   * Add a participant to the room
   * @param {string} socketId - Socket ID of participant
   * @param {Object} userInfo - User information from OAuth
   */
  addParticipant(socketId, userInfo = null) {
    const participant = {
      socketId,
      username: userInfo?.username || userInfo?.display_name || `Guest-${socketId.slice(-6)}`,
      userId: userInfo?.sub || userInfo?.mezon_id || null,
      avatar: userInfo?.avatar || null,
      joinedAt: Date.now(),
      isOwner: false,
      hasPlaylistPermission: false
    };

    // Set as owner if first participant
    if (this.participants.size === 0) {
      participant.isOwner = true;
      participant.hasPlaylistPermission = true;
      this.owner = socketId;
      this.playlistPermissions.add(socketId);
    }

    this.participants.set(socketId, participant);
    return participant;
  }

  /**
   * Remove a participant from the room
   * @param {string} socketId - Socket ID of participant
   */
  removeParticipant(socketId) {
    const participant = this.participants.get(socketId);
    if (!participant) return false;

    this.participants.delete(socketId);
    this.playlistPermissions.delete(socketId);

    // Transfer ownership if owner leaves
    if (this.owner === socketId && this.participants.size > 0) {
      const newOwner = this.participants.values().next().value;
      if (newOwner) {
        newOwner.isOwner = true;
        newOwner.hasPlaylistPermission = true;
        this.owner = newOwner.socketId;
        this.playlistPermissions.add(newOwner.socketId);
      } else {
        this.owner = null;
      }
    }

    return true;
  }

  /**
   * Grant playlist permission to a user
   * @param {string} socketId - Socket ID to grant permission
   * @returns {boolean} Success
   */
  grantPlaylistPermission(socketId) {
    const participant = this.participants.get(socketId);
    if (!participant) return false;

    participant.hasPlaylistPermission = true;
    this.playlistPermissions.add(socketId);
    return true;
  }

  /**
   * Revoke playlist permission from a user
   * @param {string} socketId - Socket ID to revoke permission
   * @returns {boolean} Success
   */
  revokePlaylistPermission(socketId) {
    const participant = this.participants.get(socketId);
    if (!participant || participant.isOwner) return false; // Can't revoke owner permission

    participant.hasPlaylistPermission = false;
    this.playlistPermissions.delete(socketId);
    return true;
  }

  /**
   * Check if user has playlist permission
   * @param {string} socketId - Socket ID to check
   * @returns {boolean} Has permission
   */
  hasPlaylistPermission(socketId) {
    return this.playlistPermissions.has(socketId);
  }

  /**
   * Check if user is owner
   * @param {string} socketId - Socket ID to check
   * @returns {boolean} Is owner
   */
  isOwner(socketId) {
    return this.owner === socketId;
  }

  /**
   * Get participant by socket ID
   * @param {string} socketId - Socket ID
   * @returns {Object|null} Participant info
   */
  getParticipant(socketId) {
    return this.participants.get(socketId) || null;
  }

  /**
   * Get all participants as array
   * @returns {Array} Array of participants
   */
  getParticipants() {
    return Array.from(this.participants.values());
  }

  /**
   * Add a video to the playlist
   * @param {Object} video - Video object from YouTube search
   * @param {string} addedBy - Socket ID of user adding video
   */
  addVideo(video, addedBy = null) {
    const participant = addedBy ? this.participants.get(addedBy) : null;
    const videoWithId = {
      ...video,
      id: uuidv4(),
      addedAt: Date.now(),
      addedBy: participant ? participant.username : 'Unknown'
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
   * Update room state (volume removed as it's now local)
   * @param {Object} state - State updates
   */
  updateState(state) {
    if (state.currentTime !== undefined) {
      this.currentTime = state.currentTime;
    }
    if (state.isPlaying !== undefined) {
      this.isPlaying = state.isPlaying;
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
      playlist: [...this.playlist], // Return copy
      participants: this.getParticipants(),
      participantCount: this.participants.size,
      owner: this.owner,
      lastUpdate: this.lastUpdate
    };
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
