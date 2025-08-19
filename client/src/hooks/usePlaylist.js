import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { SOCKET_EVENTS } from '../config/constants';

/**
 * Custom hook for managing playlist and current video state
 */
export const usePlaylist = (socket) => {
  const [currentVideo, setCurrentVideo] = useState(null);
  const [playlist, setPlaylist] = useState([]);

  /**
   * Add video to playlist
   */
  const addVideo = useCallback((video) => {
    if (!socket || !video) {
      toast.error('Cannot add video at this time');
      return;
    }

    // Validate video object
    if (!video.videoId || !video.title) {
      toast.error('Invalid video data');
      return;
    }

    socket.emit(SOCKET_EVENTS.ADD_VIDEO, video);
    toast.success('Added to playlist!', { icon: '➕' });
  }, [socket]);

  /**
   * Remove video from playlist
   */
  const removeVideo = useCallback((videoId, videoTitle = '') => {
    if (!socket || !videoId) {
      return;
    }

    socket.emit(SOCKET_EVENTS.REMOVE_VIDEO, videoId);
    
    const displayTitle = videoTitle.length > 30 
      ? videoTitle.substring(0, 30) + '...' 
      : videoTitle;
    
    toast.success(`Removed: ${displayTitle || 'Video'}`, { icon: '🗑️' });
  }, [socket]);

  /**
   * Reorder playlist
   */
  const reorderPlaylist = useCallback((newPlaylist) => {
    if (!socket || !Array.isArray(newPlaylist)) {
      return;
    }

    // Optimistically update local state
    setPlaylist(newPlaylist);
    
    // Send to server
    socket.emit(SOCKET_EVENTS.REORDER_PLAYLIST, newPlaylist);
    toast.success('Playlist reordered!', { icon: '🔄' });
  }, [socket]);

  /**
   * Skip to next video
   */
  const skipVideo = useCallback(() => {
    if (!socket) {
      return;
    }

    socket.emit(SOCKET_EVENTS.SKIP_VIDEO);
    toast('Skipping to next video...', { icon: '⏭️' });
  }, [socket]);

  /**
   * Handle video ended
   */
  const handleVideoEnd = useCallback(() => {
    if (!socket) {
      return;
    }

    socket.emit(SOCKET_EVENTS.VIDEO_ENDED);
  }, [socket]);

  /**
   * Clear playlist (local only for UI purposes)
   */
  const clearPlaylist = useCallback(() => {
    setPlaylist([]);
    setCurrentVideo(null);
  }, []);

  /**
   * Get total playlist duration (estimated)
   */
  const getTotalDuration = useCallback(() => {
    // Since we don't have duration data, estimate 3.5 minutes per video
    return playlist.length * 3.5;
  }, [playlist]);

  /**
   * Get playlist statistics
   */
  const getPlaylistStats = useCallback(() => {
    return {
      totalVideos: playlist.length,
      estimatedDuration: getTotalDuration(),
      hasCurrentVideo: !!currentVideo
    };
  }, [playlist, currentVideo, getTotalDuration]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleRoomState = (state) => {
      if (state.currentVideo) {
        setCurrentVideo(state.currentVideo);
      }
      if (Array.isArray(state.playlist)) {
        setPlaylist(state.playlist);
      }
    };

    const handlePlaylistUpdated = (newPlaylist) => {
      setPlaylist(Array.isArray(newPlaylist) ? newPlaylist : []);
    };

    const handlePlayVideo = (video) => {
      setCurrentVideo(video);
      if (video?.title) {
        toast.success(`Now playing: ${video.title}`, { icon: '🎵' });
      }
    };

    const handlePlaylistEnded = () => {
      setCurrentVideo(null);
      toast('Playlist ended! Add more videos to continue.', { icon: '🎵' });
    };

    // Add event listeners
    socket.on(SOCKET_EVENTS.ROOM_STATE, handleRoomState);
    socket.on(SOCKET_EVENTS.PLAYLIST_UPDATED, handlePlaylistUpdated);
    socket.on(SOCKET_EVENTS.PLAY_VIDEO, handlePlayVideo);
    socket.on(SOCKET_EVENTS.PLAYLIST_ENDED, handlePlaylistEnded);

    // Cleanup
    return () => {
      socket.off(SOCKET_EVENTS.ROOM_STATE, handleRoomState);
      socket.off(SOCKET_EVENTS.PLAYLIST_UPDATED, handlePlaylistUpdated);
      socket.off(SOCKET_EVENTS.PLAY_VIDEO, handlePlayVideo);
      socket.off(SOCKET_EVENTS.PLAYLIST_ENDED, handlePlaylistEnded);
    };
  }, [socket]);

  return {
    currentVideo,
    playlist,
    addVideo,
    removeVideo,
    reorderPlaylist,
    skipVideo,
    handleVideoEnd,
    clearPlaylist,
    getPlaylistStats
  };
};
