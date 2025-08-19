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
   * Change volume
   */
  const handleVolumeChange = useCallback((newVolume) => {
    if (!socket || typeof newVolume !== 'number') {
      return;
    }

    // Clamp volume between 0 and 100
    const clampedVolume = Math.max(0, Math.min(100, Math.round(newVolume)));
    
    socket.emit(SOCKET_EVENTS.VOLUME_CHANGE, clampedVolume);
    setVolume(clampedVolume);
  }, [socket]);

  /**
   * Mute/unmute volume
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
      if (typeof state.volume === 'number') {
        setVolume(state.volume);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleVolumeChangeEvent = (newVolume) => {
      if (typeof newVolume === 'number') {
        setVolume(newVolume);
      }
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
    socket.on(SOCKET_EVENTS.VOLUME_CHANGE, handleVolumeChangeEvent);
    socket.on(SOCKET_EVENTS.SEEK, handleSeekEvent);
    socket.on(SOCKET_EVENTS.SYNC_POSITION, handleSyncPosition);
    socket.on(SOCKET_EVENTS.PERIODIC_SYNC, handlePeriodicSync);

    // Cleanup
    return () => {
      socket.off(SOCKET_EVENTS.ROOM_STATE, handleRoomState);
      socket.off(SOCKET_EVENTS.PLAY, handlePlay);
      socket.off(SOCKET_EVENTS.PAUSE, handlePause);
      socket.off(SOCKET_EVENTS.VOLUME_CHANGE, handleVolumeChangeEvent);
      socket.off(SOCKET_EVENTS.SEEK, handleSeekEvent);
      socket.off(SOCKET_EVENTS.SYNC_POSITION, handleSyncPosition);
      socket.off(SOCKET_EVENTS.PERIODIC_SYNC, handlePeriodicSync);
    };
  }, [socket, isPlaying]);

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
