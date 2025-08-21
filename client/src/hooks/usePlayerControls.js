import { useState, useEffect, useCallback } from 'react';
import { SOCKET_EVENTS, APP_CONFIG } from '../config/constants';

/**
 * Custom hook for managing player controls and synchronization
 */
export const usePlayerControls = (socket) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(APP_CONFIG.defaultVolume);
  const [syncTime, setSyncTime] = useState(null);

  /**
   * Play video
   */
  const handlePlay = useCallback(() => {
    if (!socket) return;
    
    socket.emit(SOCKET_EVENTS.PLAY);
    setIsPlaying(true);
  }, [socket]);

  /**
   * Pause video
   */
  const handlePause = useCallback(() => {
    if (!socket) return;
    
    socket.emit(SOCKET_EVENTS.PAUSE);
    setIsPlaying(false);
  }, [socket]);

  /**
   * Toggle play/pause
   */
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  }, [isPlaying, handlePlay, handlePause]);

  /**
   * Seek to specific time
   */
  const handleSeek = useCallback((time) => {
    if (!socket || typeof time !== 'number' || time < 0) {
      return;
    }

    socket.emit(SOCKET_EVENTS.SEEK, time);
  }, [socket]);

  /**
   * Change volume (local only)
   */
  const handleVolumeChange = useCallback((newVolume) => {
    if (typeof newVolume !== 'number') {
      return;
    }

    // Clamp volume between 0 and 100
    const clampedVolume = Math.max(0, Math.min(100, Math.round(newVolume)));
    
    // Only update local state, don't sync with room
    setVolume(clampedVolume);
    
    // Store in localStorage for persistence
    localStorage.setItem('playerVolume', clampedVolume.toString());
  }, []);

  /**
   * Mute/unmute volume (local only)
   */
  const toggleMute = useCallback(() => {
    const newVolume = volume === 0 ? APP_CONFIG.defaultVolume : 0;
    handleVolumeChange(newVolume);
  }, [volume, handleVolumeChange]);

  /**
   * Send time update to server
   */
  const sendTimeUpdate = useCallback((currentTime) => {
    if (!socket || typeof currentTime !== 'number') {
      return;
    }

    socket.emit(SOCKET_EVENTS.TIME_UPDATE, currentTime);
  }, [socket]);

  /**
   * Clear sync time (called after sync is complete)
   */
  const clearSyncTime = useCallback(() => {
    setSyncTime(null);
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleRoomState = (state) => {
      if (typeof state.isPlaying === 'boolean') {
        setIsPlaying(state.isPlaying);
      }
      // Don't sync volume from room state - it's local only
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleSeekEvent = (time) => {
      console.log('Received seek event from server:', time);
      setSyncTime(time);
    };

    const handleSyncPosition = (data) => {
      console.log('Received initial sync position:', data);
      setSyncTime({ time: data.time, type: 'initial' });
      
      if (typeof data.isPlaying === 'boolean' && data.isPlaying !== isPlaying) {
        setIsPlaying(data.isPlaying);
      }
    };

    const handlePeriodicSync = (data) => {
      console.log('Received periodic sync:', data);
      setSyncTime({ 
        time: data.time, 
        type: 'periodic', 
        tolerance: data.tolerance 
      });
    };

    // Add event listeners
    socket.on(SOCKET_EVENTS.ROOM_STATE, handleRoomState);
    socket.on(SOCKET_EVENTS.PLAY, handlePlay);
    socket.on(SOCKET_EVENTS.PAUSE, handlePause);
    socket.on(SOCKET_EVENTS.SEEK, handleSeekEvent);
    socket.on(SOCKET_EVENTS.SYNC_POSITION, handleSyncPosition);
    socket.on(SOCKET_EVENTS.PERIODIC_SYNC, handlePeriodicSync);

    // Cleanup
    return () => {
      socket.off(SOCKET_EVENTS.ROOM_STATE, handleRoomState);
      socket.off(SOCKET_EVENTS.PLAY, handlePlay);
      socket.off(SOCKET_EVENTS.PAUSE, handlePause);
      socket.off(SOCKET_EVENTS.SEEK, handleSeekEvent);
      socket.off(SOCKET_EVENTS.SYNC_POSITION, handleSyncPosition);
      socket.off(SOCKET_EVENTS.PERIODIC_SYNC, handlePeriodicSync);
    };
  }, [socket, isPlaying]);

  // Load volume from localStorage on mount
  useEffect(() => {
    const savedVolume = localStorage.getItem('playerVolume');
    if (savedVolume) {
      const parsedVolume = parseInt(savedVolume, 10);
      if (!isNaN(parsedVolume) && parsedVolume >= 0 && parsedVolume <= 100) {
        setVolume(parsedVolume);
      }
    }
  }, []);

  return {
    isPlaying,
    volume,
    syncTime,
    handlePlay,
    handlePause,
    togglePlayPause,
    handleSeek,
    handleVolumeChange,
    toggleMute,
    sendTimeUpdate,
    clearSyncTime
  };
};
