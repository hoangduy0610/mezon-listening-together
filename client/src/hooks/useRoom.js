import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { SOCKET_EVENTS } from '../config/constants';

/**
 * Custom hook for managing room state and participants
 */
export const useRoom = (socket) => {
  const [roomId, setRoomId] = useState('');
  const [participants, setParticipants] = useState([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [isInRoom, setIsInRoom] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  /**
   * Validate room name
   */
  const validateRoomName = useCallback((roomName) => {
    if (!roomName || !roomName.trim()) {
      return 'Please enter a valid room name';
    }

    if (roomName.length > 50) {
      return 'Room name too long (max 50 characters)';
    }

    // Clean room name
    const cleanRoomId = roomName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');

    if (cleanRoomId.length === 0) {
      return 'Please enter a valid room name (letters, numbers, hyphens, underscores only)';
    }

    return null;
  }, []);

  /**
   * Join or create a room
   */
  const joinRoom = useCallback((newRoomId) => {
    console.log('joinRoom called with:', newRoomId);

    if (!socket) {
      console.error('Socket not available for room join');
      return false;
    }

    // Validate room name (but don't show toast - let UI handle it)
    const validationError = validateRoomName(newRoomId);
    if (validationError) {
      console.warn('Room validation failed:', validationError);
      return false;
    }

    // Clean room name
    const cleanRoomId = newRoomId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');

    try {
      console.log('Emitting join-room event for:', cleanRoomId);
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, cleanRoomId);
      setRoomId(cleanRoomId);
      setIsInRoom(true);

      // Update URL without page refresh
      const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${cleanRoomId}`;
      window.history.pushState({ path: newUrl }, '', newUrl);

      // Don't show success toast here - let the room-state event handle it
      console.log('Room join request sent successfully');
      return true;

    } catch (error) {
      console.error('Failed to join room:', error);
      toast.error('Failed to join room');
      return false;
    }
  }, [socket, validateRoomName]);

  /**
   * Leave current room
   */
  const leaveRoom = useCallback(() => {
    if (!socket || !isInRoom) {
      return;
    }

    try {
      // Socket will automatically handle leaving on disconnect
      setRoomId('');
      setIsInRoom(false);
      setParticipants([]);
      setParticipantCount(0);
      setCurrentUser(null);
      setIsOwner(false);

      // Clear URL parameter
      // const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
      // window.history.pushState({ path: newUrl }, '', newUrl);
      window.location.replace("/");

      toast('Left room', { icon: '👋' });

    } catch (error) {
      console.error('Failed to leave room:', error);
    }
  }, [socket, isInRoom]);

  /**
   * Grant playlist permission to user
   */
  const grantPlaylistPermission = useCallback((socketId) => {
    if (!socket || !isOwner) return;
    socket.emit(SOCKET_EVENTS.GRANT_PLAYLIST_PERMISSION, socketId);
  }, [socket, isOwner]);

  /**
   * Revoke playlist permission from user
   */
  const revokePlaylistPermission = useCallback((socketId) => {
    if (!socket || !isOwner) return;
    socket.emit(SOCKET_EVENTS.REVOKE_PLAYLIST_PERMISSION, socketId);
  }, [socket, isOwner]);

  /**
   * Kick participant from room
   */
  const kickParticipant = useCallback((socketId) => {
    if (!socket || !isOwner) return;
    socket.emit(SOCKET_EVENTS.KICK_PARTICIPANT, socketId);
  }, [socket, isOwner]);

  /**
   * Get room share URL
   */
  const getShareUrl = useCallback(() => {
    if (!roomId) {
      return window.location.href;
    }
    return `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${roomId}`;
  }, [roomId]);

  /**
   * Copy room share URL to clipboard
   */
  const copyShareUrl = useCallback(async () => {
    try {
      const url = getShareUrl();
      await navigator.clipboard.writeText(url);
      toast.success('Room link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy link');
    }
  }, [getShareUrl]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleRoomState = (state) => {
      console.log('Received room state:', state);

      if (state.participants) {
        setParticipants(state.participants);
        setParticipantCount(state.participants.length);

        // Find current user and check if owner
        const current = state.participants.find(p => p.socketId === socket.id);
        setCurrentUser(current);
        setIsOwner(current?.isOwner || false);
      } else if (typeof state.participantCount === 'number') {
        setParticipantCount(state.participantCount);
      }
    };

    const handleParticipantJoined = (count) => {
      console.log('Participant joined, new count:', count);
      setParticipantCount(count);
      if (isInRoom) {
        toast('Someone joined the room!', { icon: '👋' });
      }
    };

    const handleParticipantLeft = (count) => {
      console.log('Participant left, new count:', count);
      setParticipantCount(count);
      if (isInRoom) {
        toast('Someone left the room', { icon: '👋' });
      }
    };

    const handlePermissionsUpdated = (updatedParticipants) => {
      console.log('Permissions updated:', updatedParticipants);
      setParticipants(updatedParticipants);
      setParticipantCount(updatedParticipants.length);

      // Update current user info
      const current = updatedParticipants.find(p => p.socketId === socket.id);
      setCurrentUser(current);
      setIsOwner(current?.isOwner || false);
    };

    const handlePermissionDenied = (error) => {
      toast.error(error.message || 'Permission denied');
    };

    const handleParticipantKicked = (data) => {
      toast.error(data.message || 'You have been kicked from the room');
      leaveRoom();
    };

    // Add event listeners
    socket.on(SOCKET_EVENTS.ROOM_STATE, handleRoomState);
    socket.on(SOCKET_EVENTS.PARTICIPANT_JOINED, handleParticipantJoined);
    socket.on(SOCKET_EVENTS.PARTICIPANT_LEFT, handleParticipantLeft);
    socket.on(SOCKET_EVENTS.PERMISSIONS_UPDATED, handlePermissionsUpdated);
    socket.on(SOCKET_EVENTS.PERMISSION_DENIED, handlePermissionDenied);
    socket.on(SOCKET_EVENTS.PARTICIPANT_KICKED, handleParticipantKicked);

    // Cleanup
    return () => {
      socket.off(SOCKET_EVENTS.ROOM_STATE, handleRoomState);
      socket.off(SOCKET_EVENTS.PARTICIPANT_JOINED, handleParticipantJoined);
      socket.off(SOCKET_EVENTS.PARTICIPANT_LEFT, handleParticipantLeft);
      socket.off(SOCKET_EVENTS.PERMISSIONS_UPDATED, handlePermissionsUpdated);
      socket.off(SOCKET_EVENTS.PERMISSION_DENIED, handlePermissionDenied);
      socket.off(SOCKET_EVENTS.PARTICIPANT_KICKED, handleParticipantKicked);
    };
  }, [socket, isInRoom, leaveRoom]);

  // Check for room ID in URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomId = urlParams.get('room');

    if (urlRoomId && urlRoomId.trim()) {
      setRoomId(urlRoomId.trim().toLowerCase());
    }
  }, []);

  return {
    roomId,
    participants,
    participantCount,
    currentUser,
    isOwner,
    isInRoom,
    joinRoom,
    leaveRoom,
    grantPlaylistPermission,
    revokePlaylistPermission,
    kickParticipant,
    getShareUrl,
    copyShareUrl,
    validateRoomName
  };
};
