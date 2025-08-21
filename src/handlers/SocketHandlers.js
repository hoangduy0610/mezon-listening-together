const RoomManager = require('../services/RoomManager');
const SyncService = require('../services/SyncService');
const AuthService = require('../services/AuthService');
const Logger = require('../utils/Logger');
const EVENTS = require('../constants/events');

class SocketHandlers {
  constructor(io) {
    this.io = io;
    this.syncService = new SyncService(io);
    this.authService = new AuthService();
    this.logger = new Logger('SocketHandlers');
    
    // Track authenticated users
    this.authenticatedUsers = new Map();
    
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

    // Authentication
    socket.on(EVENTS.AUTHENTICATE, async (accessToken) => {
      await this.handleAuthentication(socket, accessToken);
    });

    // Room management
    socket.on(EVENTS.JOIN_ROOM, (roomId) => {
      this.handleJoinRoom(socket, roomId, currentRoom);
      currentRoom = roomId;
    });

    // Room ownership events
    socket.on(EVENTS.GRANT_PLAYLIST_PERMISSION, (targetSocketId) => {
      this.handleGrantPlaylistPermission(socket, currentRoom, targetSocketId);
    });

    socket.on(EVENTS.REVOKE_PLAYLIST_PERMISSION, (targetSocketId) => {
      this.handleRevokePlaylistPermission(socket, currentRoom, targetSocketId);
    });

    socket.on(EVENTS.KICK_PARTICIPANT, (targetSocketId) => {
      this.handleKickParticipant(socket, currentRoom, targetSocketId);
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
   * Handle user authentication
   */
  async handleAuthentication(socket, accessToken) {
    try {
      const userInfo = await this.authService.verifyToken(accessToken);
      this.authenticatedUsers.set(socket.id, userInfo);
      
      socket.emit(EVENTS.AUTH_SUCCESS, {
        username: userInfo.username || userInfo.display_name,
        userId: userInfo.sub || userInfo.mezon_id,
        avatar: userInfo.avatar
      });

      this.logger.info(`User authenticated: ${socket.id}`, {
        username: userInfo.username || userInfo.display_name,
        userId: userInfo.sub || userInfo.mezon_id
      });
    } catch (error) {
      socket.emit(EVENTS.AUTH_ERROR, { message: error.message });
      this.logger.warn(`Authentication failed for ${socket.id}`, { error: error.message });
    }
  }

  /**
   * Handle granting playlist permission
   */
  handleGrantPlaylistPermission(socket, roomId, targetSocketId) {
    if (!roomId) return;
    
    const room = RoomManager.getRoom(roomId);
    if (!room || !room.isOwner(socket.id)) {
      socket.emit(EVENTS.PERMISSION_DENIED, { message: 'Only room owner can grant permissions' });
      return;
    }

    const success = room.grantPlaylistPermission(targetSocketId);
    if (success) {
      this.io.to(roomId).emit(EVENTS.PERMISSIONS_UPDATED, room.getParticipants());
      this.logger.debug(`Playlist permission granted in room ${roomId}`, {
        grantedBy: socket.id,
        grantedTo: targetSocketId
      });
    }
  }

  /**
   * Handle revoking playlist permission
   */
  handleRevokePlaylistPermission(socket, roomId, targetSocketId) {
    if (!roomId) return;
    
    const room = RoomManager.getRoom(roomId);
    if (!room || !room.isOwner(socket.id)) {
      socket.emit(EVENTS.PERMISSION_DENIED, { message: 'Only room owner can revoke permissions' });
      return;
    }

    const success = room.revokePlaylistPermission(targetSocketId);
    if (success) {
      this.io.to(roomId).emit(EVENTS.PERMISSIONS_UPDATED, room.getParticipants());
      this.logger.debug(`Playlist permission revoked in room ${roomId}`, {
        revokedBy: socket.id,
        revokedFrom: targetSocketId
      });
    }
  }

  /**
   * Handle kicking a participant
   */
  handleKickParticipant(socket, roomId, targetSocketId) {
    if (!roomId) return;
    
    const room = RoomManager.getRoom(roomId);
    if (!room || !room.isOwner(socket.id)) {
      socket.emit(EVENTS.PERMISSION_DENIED, { message: 'Only room owner can kick participants' });
      return;
    }

    if (targetSocketId === socket.id) {
      socket.emit(EVENTS.PERMISSION_DENIED, { message: 'Cannot kick yourself' });
      return;
    }

    // Notify the kicked user
    this.io.to(targetSocketId).emit(EVENTS.PARTICIPANT_KICKED, { 
      message: 'You have been kicked from the room' 
    });

    // Remove from room
    RoomManager.removeParticipantFromRoom(roomId, targetSocketId);
    
    // Notify remaining participants
    const updatedRoom = RoomManager.getRoom(roomId);
    if (updatedRoom) {
      this.io.to(roomId).emit(EVENTS.PARTICIPANT_LEFT, updatedRoom.participants.size);
      this.io.to(roomId).emit(EVENTS.PERMISSIONS_UPDATED, updatedRoom.getParticipants());
    }

    this.logger.info(`Participant kicked from room ${roomId}`, {
      kickedBy: socket.id,
      kicked: targetSocketId
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
          socket.to(currentRoom).emit(EVENTS.PERMISSIONS_UPDATED, room.getParticipants());
        }
      }
    }

    // Join new room with user info
    socket.join(newRoomId);
    const userInfo = this.authenticatedUsers.get(socket.id);
    const room = RoomManager.addParticipantToRoom(newRoomId, socket.id, userInfo);
    
    // Send current room state to the new participant
    const currentState = room.getState();
    socket.emit(EVENTS.ROOM_STATE, currentState);
    
    // Notify all participants (including the new one) about the updated participant list
    this.io.to(newRoomId).emit(EVENTS.PARTICIPANT_JOINED, room.participants.size);
    this.io.to(newRoomId).emit(EVENTS.PERMISSIONS_UPDATED, room.getParticipants());
    
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

    // Check playlist permission
    if (!room.hasPlaylistPermission(socket.id)) {
      socket.emit(EVENTS.PERMISSION_DENIED, { 
        message: 'You do not have permission to edit the playlist' 
      });
      return;
    }

    const addedVideo = room.addVideo(video, socket.id);
    
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

    // Check playlist permission
    if (!room.hasPlaylistPermission(socket.id)) {
      socket.emit(EVENTS.PERMISSION_DENIED, { 
        message: 'You do not have permission to edit the playlist' 
      });
      return;
    }

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

    // Check playlist permission
    if (!room.hasPlaylistPermission(socket.id)) {
      socket.emit(EVENTS.PERMISSION_DENIED, { 
        message: 'You do not have permission to edit the playlist' 
      });
      return;
    }

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
   * Handle skip video action
   */
  handleSkipVideo(socket, roomId) {
    if (!roomId) return;
    
    const room = RoomManager.getRoom(roomId);
    if (!room) return;

    // Check playlist permission for skipping
    if (!room.hasPlaylistPermission(socket.id)) {
      socket.emit(EVENTS.PERMISSION_DENIED, { 
        message: 'You do not have permission to skip videos' 
      });
      return;
    }

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
    
    // Clean up authentication info
    this.authenticatedUsers.delete(socket.id);
    
    if (currentRoom) {
      const wasRemoved = RoomManager.removeParticipantFromRoom(currentRoom, socket.id);
      
      if (wasRemoved) {
        const room = RoomManager.getRoom(currentRoom);
        if (room) {
          socket.to(currentRoom).emit(EVENTS.PARTICIPANT_LEFT, room.participants.size);
          // Notify about permission changes if ownership transferred
          socket.to(currentRoom).emit(EVENTS.PERMISSIONS_UPDATED, room.getParticipants());
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
