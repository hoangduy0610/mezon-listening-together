const Room = require('../models/Room');
const Logger = require('../utils/Logger');

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.logger = new Logger('RoomManager');
  }

  /**
   * Get or create a room
   * @param {string} roomId - Room identifier
   * @returns {Room} Room instance
   */
  getOrCreateRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      const room = new Room(roomId);
      this.rooms.set(roomId, room);
      this.logger.info(`Created new room: ${roomId}`);
    }
    
    return this.rooms.get(roomId);
  }

  /**
   * Get room by ID
   * @param {string} roomId - Room identifier
   * @returns {Room|null} Room instance or null if not found
   */
  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  /**
   * Delete room if empty
   * @param {string} roomId - Room identifier
   * @returns {boolean} True if room was deleted
   */
  cleanupRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room && room.isEmpty()) {
      this.rooms.delete(roomId);
      this.logger.info(`Deleted empty room: ${roomId}`);
      return true;
    }
    return false;
  }

  /**
   * Add participant to room
   * @param {string} roomId - Room identifier
   * @param {string} socketId - Socket ID
   * @param {Object} userInfo - User information from OAuth
   * @returns {Room} Room instance
   */
  addParticipantToRoom(roomId, socketId, userInfo = null) {
    const room = this.getOrCreateRoom(roomId);
    const participant = room.addParticipant(socketId, userInfo);
    this.logger.debug(`Added participant ${socketId} (${participant.username}) to room ${roomId} (${room.participants.size} total)`, {
      isOwner: participant.isOwner
    });
    return room;
  }

  /**
   * Remove participant from room
   * @param {string} roomId - Room identifier  
   * @param {string} socketId - Socket ID
   * @returns {boolean} True if participant was removed
   */
  removeParticipantFromRoom(roomId, socketId) {
    const room = this.getRoom(roomId);
    if (!room) return false;

    const removed = room.removeParticipant(socketId);
    if (removed) {
      this.logger.debug(`Removed participant ${socketId} from room ${roomId} (${room.participants.size} remaining)`);
      // Clean up empty room
      this.cleanupRoom(roomId);
    }
    
    return removed;
  }

  /**
   * Get rooms that need periodic sync
   * @returns {Array} Array of {roomId, room} objects
   */
  getRoomsForPeriodicSync() {
    const rooms = [];
    
    for (const [roomId, room] of this.rooms) {
      if (room.currentVideo && room.isPlaying && room.participants.size > 1) {
        rooms.push({ roomId, room });
      }
    }
    
    return rooms;
  }

  /**
   * Get statistics about all rooms
   * @returns {Object} Statistics object
   */
  getStats() {
    const totalRooms = this.rooms.size;
    let totalParticipants = 0;
    let activeRooms = 0;
    
    for (const room of this.rooms.values()) {
      totalParticipants += room.participants.size;
      if (room.currentVideo && room.participants.size > 0) {
        activeRooms++;
      }
    }
    
    return {
      totalRooms,
      activeRooms,
      totalParticipants,
      averageParticipantsPerRoom: totalRooms > 0 ? totalParticipants / totalRooms : 0
    };
  }

  /**
   * Cleanup old inactive rooms (for maintenance)
   * @param {number} maxAgeMs - Maximum age in milliseconds
   * @returns {number} Number of rooms cleaned up
   */
  cleanupOldRooms(maxAgeMs = 24 * 60 * 60 * 1000) { // 24 hours default
    let cleanedCount = 0;
    const now = Date.now();
    
    for (const [roomId, room] of this.rooms) {
      if (room.isEmpty() && (now - room.createdAt) > maxAgeMs) {
        this.rooms.delete(roomId);
        cleanedCount++;
        this.logger.info(`Cleaned up old room: ${roomId}`);
      }
    }
    
    return cleanedCount;
  }
}

// Singleton instance
const roomManager = new RoomManager();
module.exports = roomManager;
