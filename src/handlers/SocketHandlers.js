const RoomManager = require('../services/RoomManager');
const SyncService = require('../services/SyncService');
const Logger = require('../utils/Logger');
const EVENTS = require('../constants/events');

class SocketHandlers {
  constructor(io) {
    this.io = io;
    this.syncService = new SyncService(io);
    this.logger = new Logger('SocketHandlers');
    
    // Start sync service
    this.syncService.start();
  }

  /**
   * Handle new socket connection
   * @param {Object} socket - Socket instance
   */
  handleConnection(socket) {
    this.logger.info(`User connected: ${socket.id}`);
    let currentRoom = null;

    // Room management
    socket.on(EVENTS.JOIN_ROOM, (roomId) => {
      this.handleJoinRoom(socket, roomId, currentRoom);
      currentRoom = roomId;
    });

    // Playlist management
    socket.on(EVENTS.ADD_VIDEO, (video) => {
      this.handleAddVideo(socket, currentRoom, video);
    });

    socket.on(EVENTS.REMOVE_VIDEO, (videoId) => {
      this.handleRemoveVideo(socket, currentRoom, videoId);
    });

    socket.on(EVENTS.REORDER_PLAYLIST, (newPlaylist) => {
      this.handleReorderPlaylist(socket, currentRoom, newPlaylist);
    });

    // Player controls
    socket.on(EVENTS.PLAY, () => {
      this.handlePlay(socket, currentRoom);
    });

    socket.on(EVENTS.PAUSE, () => {
      this.handlePause(socket, currentRoom);
    });

    socket.on(EVENTS.SEEK, (time) => {
      this.handleSeek(socket, currentRoom, time);
    });

    socket.on(EVENTS.VOLUME_CHANGE, (volume) => {
      this.handleVolumeChange(socket, currentRoom, volume);
    });

    socket.on(EVENTS.SKIP_VIDEO, () => {
      this.handleSkipVideo(socket, currentRoom);
    });

    socket.on(EVENTS.VIDEO_ENDED, () => {
      this.handleVideoEnded(socket, currentRoom);
    });

    // Sync events
    socket.on(EVENTS.TIME_UPDATE, (currentTime) => {
      this.syncService.updateRoomTime(currentRoom, socket.id, currentTime);
    });

    // Disconnect
    socket.on(EVENTS.DISCONNECT, () => {
      this.handleDisconnect(socket, currentRoom);
    });
  }

  /**
   * Handle joining a room
   */
  handleJoinRoom(socket, newRoomId, currentRoom) {
    // Leave current room if exists
    if (currentRoom) {
      socket.leave(currentRoom);
      const wasRemoved = RoomManager.removeParticipantFromRoom(currentRoom, socket.id);
      
      if (wasRemoved) {
        const room = RoomManager.getRoom(currentRoom);
        if (room) {
          socket.to(currentRoom).emit(EVENTS.PARTICIPANT_LEFT, room.participants.size);
        }
      }
    }

    // Join new room
    socket.join(newRoomId);
    const room = RoomManager.addParticipantToRoom(newRoomId, socket.id);
    
    // Send current room state
    const currentState = room.getState();
    socket.emit(EVENTS.ROOM_STATE, currentState);
    socket.to(newRoomId).emit(EVENTS.PARTICIPANT_JOINED, room.participants.size);
    
    // Sync new participant if video is playing
    this.syncService.syncNewParticipant(socket.id, newRoomId, currentState);
    
    this.logger.info(`User ${socket.id} joined room ${newRoomId} (${room.participants.size} participants)`);
  }

  /**
   * Handle adding video to playlist
   */
  handleAddVideo(socket, roomId, video) {
    if (!roomId) return;
    
    const room = RoomManager.getRoom(roomId);
    if (!room) return;

    const addedVideo = room.addVideo(video);
    
    // If no video is currently playing, start the next one
    if (!room.currentVideo) {
      const nextVideo = room.playNext();
      if (nextVideo) {
        this.io.to(roomId).emit(EVENTS.PLAY_VIDEO, nextVideo);
      }
    }
    
    this.io.to(roomId).emit(EVENTS.PLAYLIST_UPDATED, room.playlist);
    
    this.logger.debug(`Video added to room ${roomId}`, {
      title: video.title,
      addedBy: socket.id
    });
  }

  /**
   * Handle removing video from playlist
   */
  handleRemoveVideo(socket, roomId, videoId) {
    if (!roomId) return;
    
    const room = RoomManager.getRoom(roomId);
    if (!room) return;

    const wasRemoved = room.removeVideo(videoId);
    if (wasRemoved) {
      this.io.to(roomId).emit(EVENTS.PLAYLIST_UPDATED, room.playlist);
      
      this.logger.debug(`Video removed from room ${roomId}`, {
        videoId,
        removedBy: socket.id
      });
    }
  }

  /**
   * Handle reordering playlist
   */
  handleReorderPlaylist(socket, roomId, newPlaylist) {
    if (!roomId) return;
    
    const room = RoomManager.getRoom(roomId);
    if (!room) return;

    const success = room.reorderPlaylist(newPlaylist);
    if (success) {
      this.io.to(roomId).emit(EVENTS.PLAYLIST_UPDATED, room.playlist);
      
      this.logger.debug(`Playlist reordered in room ${roomId}`, {
        reorderedBy: socket.id
      });
    }
  }

  /**
   * Handle play action
   */
  handlePlay(socket, roomId) {
    if (!roomId) return;
    
    const room = RoomManager.getRoom(roomId);
    if (!room) return;

    room.updateState({ isPlaying: true });
    this.syncService.broadcastPlayState(roomId, socket.id, true);
  }

  /**
   * Handle pause action
   */
  handlePause(socket, roomId) {
    if (!roomId) return;
    
    const room = RoomManager.getRoom(roomId);
    if (!room) return;

    room.updateState({ isPlaying: false });
    this.syncService.broadcastPlayState(roomId, socket.id, false);
  }

  /**
   * Handle seek action
   */
  handleSeek(socket, roomId, time) {
    if (!roomId) return;
    
    const room = RoomManager.getRoom(roomId);
    if (!room) return;

    room.updateState({ currentTime: time });
    this.syncService.broadcastSeek(roomId, socket.id, time);
  }

  /**
   * Handle volume change
   */
  handleVolumeChange(socket, roomId, volume) {
    if (!roomId) return;
    
    const room = RoomManager.getRoom(roomId);
    if (!room) return;

    room.updateState({ volume });
    this.syncService.broadcastVolumeChange(roomId, socket.id, volume);
  }

  /**
   * Handle skip video action
   */
  handleSkipVideo(socket, roomId) {
    if (!roomId) return;
    
    const room = RoomManager.getRoom(roomId);
    if (!room) return;

    const nextVideo = room.playNext();
    if (nextVideo) {
      this.io.to(roomId).emit(EVENTS.PLAY_VIDEO, nextVideo);
    } else {
      this.io.to(roomId).emit(EVENTS.PLAYLIST_ENDED);
    }
    
    this.io.to(roomId).emit(EVENTS.PLAYLIST_UPDATED, room.playlist);
    
    this.logger.debug(`Video skipped in room ${roomId}`, {
      skippedBy: socket.id,
      nextVideo: nextVideo?.title || 'none'
    });
  }

  /**
   * Handle video ended event
   */
  handleVideoEnded(socket, roomId) {
    if (!roomId) return;
    
    const room = RoomManager.getRoom(roomId);
    if (!room) return;

    const nextVideo = room.playNext();
    if (nextVideo) {
      this.io.to(roomId).emit(EVENTS.PLAY_VIDEO, nextVideo);
    } else {
      this.io.to(roomId).emit(EVENTS.PLAYLIST_ENDED);
    }
    
    this.io.to(roomId).emit(EVENTS.PLAYLIST_UPDATED, room.playlist);
    
    this.logger.debug(`Video ended in room ${roomId}`, {
      nextVideo: nextVideo?.title || 'none'
    });
  }

  /**
   * Handle socket disconnect
   */
  handleDisconnect(socket, currentRoom) {
    this.logger.info(`User disconnected: ${socket.id}`);
    
    if (currentRoom) {
      const wasRemoved = RoomManager.removeParticipantFromRoom(currentRoom, socket.id);
      
      if (wasRemoved) {
        const room = RoomManager.getRoom(currentRoom);
        if (room) {
          socket.to(currentRoom).emit(EVENTS.PARTICIPANT_LEFT, room.participants.size);
        }
      }
    }
  }

  /**
   * Stop all services
   */
  stop() {
    this.syncService.stop();
  }
}

module.exports = SocketHandlers;
