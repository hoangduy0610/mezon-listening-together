import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { SOCKET_EVENTS } from '../config/constants';

/**
 * Custom hook for managing room state and participants
 */
export const useRoom = (socket) => {
  const [roomId, setRoomId] = useState('');
  const [participantCount, setParticipantCount] = useState(0);
  const [isInRoom, setIsInRoom] = useState(false);

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
      console.warn('Socket not available for room join');
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
      setParticipantCount(0);
      
      // Clear URL parameter
      const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
      
      toast('Left room', { icon: '👋' });

    } catch (error) {
      console.error('Failed to leave room:', error);
    }
  }, [socket, isInRoom]);

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
      console.log('Received room state, updating participant count:', state.participantCount);
      if (typeof state.participantCount === 'number') {
        setParticipantCount(state.participantCount);
      }
      // Don't show toast for initial room state
    };

    const handleParticipantJoined = (count) => {
      console.log('Participant joined, new count:', count);
      setParticipantCount(count);
      // Only show toast if we're already in a room (not for initial join)
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

    // Add event listeners
    socket.on(SOCKET_EVENTS.ROOM_STATE, handleRoomState);
    socket.on(SOCKET_EVENTS.PARTICIPANT_JOINED, handleParticipantJoined);
    socket.on(SOCKET_EVENTS.PARTICIPANT_LEFT, handleParticipantLeft);

    // Cleanup
    return () => {
      socket.off(SOCKET_EVENTS.ROOM_STATE, handleRoomState);
      socket.off(SOCKET_EVENTS.PARTICIPANT_JOINED, handleParticipantJoined);
      socket.off(SOCKET_EVENTS.PARTICIPANT_LEFT, handleParticipantLeft);
    };
  }, [socket, isInRoom]);

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
    participantCount,
    isInRoom,
    joinRoom,
    leaveRoom,
    getShareUrl,
    copyShareUrl,
    validateRoomName
  };
};
