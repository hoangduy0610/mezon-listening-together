const RoomManager = require('./RoomManager');
const Logger = require('../utils/Logger');
const config = require('../../config/default');
const EVENTS = require('../constants/events');

class SyncService {
  constructor(io) {
    this.io = io;
    this.logger = new Logger('SyncService');
    this.syncInterval = null;
    this.config = config.sync;
  }

  /**
   * Start periodic synchronization service
   */
  start() {
    if (this.syncInterval) {
      this.logger.warn('Sync service already running');
      return;
    }

    this.syncInterval = setInterval(() => {
      this.performPeriodicSync();
    }, this.config.periodicSyncInterval);

    this.logger.info('Sync service started', {
      interval: this.config.periodicSyncInterval
    });
  }

  /**
   * Stop periodic synchronization service
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.logger.info('Sync service stopped');
    }
  }

  /**
   * Perform periodic sync for all active rooms
   */
  performPeriodicSync() {
    const rooms = RoomManager.getRoomsForPeriodicSync();
    
    if (rooms.length === 0) {
      return;
    }

    this.logger.debug(`Performing periodic sync for ${rooms.length} rooms`);

    rooms.forEach(({ roomId, room }) => {
      const currentState = room.getState();
      
      this.logger.debug(`Broadcasting periodic sync for room ${roomId}`, {
        time: currentState.currentTime.toFixed(1),
        participants: room.participants.size
      });

      this.io.to(roomId).emit(EVENTS.PERIODIC_SYNC, {
        time: currentState.currentTime,
        tolerance: this.config.syncThresholds.periodic
      });
    });
  }

  /**
   * Sync new participant to current room state
   * @param {string} socketId - Socket ID of new participant
   * @param {string} roomId - Room ID
   * @param {Object} currentState - Current room state
   */
  syncNewParticipant(socketId, roomId, currentState) {
    if (!currentState.currentVideo || !currentState.isPlaying) {
      return;
    }

    this.logger.debug(`Syncing new participant to position`, {
      socketId,
      roomId,
      time: currentState.currentTime.toFixed(1),
      isPlaying: currentState.isPlaying
    });

    // Delay sync to allow client player to initialize
    setTimeout(() => {
      this.io.to(socketId).emit(EVENTS.SYNC_POSITION, {
        time: currentState.currentTime,
        isPlaying: currentState.isPlaying
      });
    }, 1000);
  }

  /**
   * Broadcast seek event to all participants in room except sender
   * @param {string} roomId - Room ID
   * @param {string} senderSocketId - Socket ID of sender
   * @param {number} time - Seek time
   */
  broadcastSeek(roomId, senderSocketId, time) {
    this.logger.debug(`Broadcasting seek event`, {
      roomId,
      time: time.toFixed(1),
      sender: senderSocketId
    });

    this.io.to(roomId).except(senderSocketId).emit(EVENTS.SEEK, time);
  }

  /**
   * Broadcast play/pause state to all participants in room except sender
   * @param {string} roomId - Room ID
   * @param {string} senderSocketId - Socket ID of sender
   * @param {boolean} isPlaying - Playing state
   */
  broadcastPlayState(roomId, senderSocketId, isPlaying) {
    const event = isPlaying ? EVENTS.PLAY : EVENTS.PAUSE;
    
    this.logger.debug(`Broadcasting ${event} event`, {
      roomId,
      sender: senderSocketId
    });

    this.io.to(roomId).except(senderSocketId).emit(event);
  }

  /**
   * Broadcast volume change to all participants in room except sender
   * @param {string} roomId - Room ID
   * @param {string} senderSocketId - Socket ID of sender
   * @param {number} volume - New volume
   */
  broadcastVolumeChange(roomId, senderSocketId, volume) {
    this.logger.debug(`Broadcasting volume change`, {
      roomId,
      volume,
      sender: senderSocketId
    });

    this.io.to(roomId).except(senderSocketId).emit(EVENTS.VOLUME_CHANGE, volume);
  }

  /**
   * Update room time based on client updates
   * @param {string} roomId - Room ID
   * @param {string} socketId - Socket ID of updater
   * @param {number} currentTime - Current time from client
   */
  updateRoomTime(roomId, socketId, currentTime) {
    const room = RoomManager.getRoom(roomId);
    if (!room || !room.currentVideo || !room.isPlaying) {
      return;
    }

    const oldTime = room.currentTime;
    room.updateState({ currentTime });

    this.logger.debug(`Time update received`, {
      roomId,
      socketId,
      oldTime: oldTime.toFixed(1),
      newTime: currentTime.toFixed(1)
    });
  }
}

module.exports = SyncService;
