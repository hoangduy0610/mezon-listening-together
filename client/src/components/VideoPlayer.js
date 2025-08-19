import React, { useEffect, useRef, useState } from 'react';
import { checkYouTubeAPI, logPlayerEvent } from '../utils/youtubeDebug';

// YouTube API ready callback is now handled in index.html to avoid conflicts

const VideoPlayer = ({ 
  currentVideo, 
  isPlaying, 
  volume, 
  syncTime,
  socket,
  onPlay, 
  onPause, 
  onSeek, 
  onVideoEnd,
  onSyncComplete,
  onTimeUpdate
}) => {
  // Optimized for performance - minimal logging
  
  const playerRef = useRef(null);
  const playerInstanceRef = useRef(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [playerError, setPlayerError] = useState(null);
  const [initializationAttempted, setInitializationAttempted] = useState(false);
  const lastSyncTime = useRef(0);
  const playerIdRef = useRef('youtube-player-' + Math.random().toString(36).substr(2, 9));
  const isMountedRef = useRef(true);
  const currentVideoIdRef = useRef(null); // Track the currently loaded video ID

  /**
   * Safely get current time from YouTube player
   * @returns {number} Current time in seconds or 0 if not available
   */
  const safeGetCurrentTime = () => {
    try {
      if (!playerInstanceRef.current) {
        return 0;
      }
      
      if (!playerReady) {
        return 0;
      }
      
      if (typeof playerInstanceRef.current.getCurrentTime !== 'function') {
        console.warn('getCurrentTime method not available on player instance');
        return 0;
      }
      
      const time = playerInstanceRef.current.getCurrentTime();
      return typeof time === 'number' && !isNaN(time) ? time : 0;
      
    } catch (error) {
      console.warn('Error getting current time:', error.message);
      
      // If we get this error, the player might be in a bad state
      if (error.message.includes('getCurrentTime is not a function')) {
        console.warn('Player appears to be in invalid state, marking as not ready');
        setPlayerReady(false);
      }
    }
    return 0;
  };

  /**
   * Safely call YouTube player method
   * @param {string} methodName - Method to call
   * @param {...any} args - Arguments to pass
   * @returns {any} Method result or null if failed
   */
  const safePlayerCall = (methodName, ...args) => {
    try {
      if (!playerInstanceRef.current) {
        return null;
      }
      
      if (!playerReady) {
        return null;
      }
      
      if (typeof playerInstanceRef.current[methodName] !== 'function') {
        console.warn(`Method ${methodName} not available on player instance`);
        return null;
      }
      
      const result = playerInstanceRef.current[methodName](...args);
      return result;
      
    } catch (error) {
      console.warn(`Error calling player method ${methodName}:`, error.message);
      
      // If we get method errors, the player might be in a bad state
      if (error.message.includes('is not a function')) {
        console.warn(`Player method ${methodName} failed, player may be in invalid state`);
        
        // For critical methods, mark player as not ready
        if (['getCurrentTime', 'seekTo', 'loadVideoById'].includes(methodName)) {
          setPlayerReady(false);
        }
      }
    }
    return null;
  };

  // Initialize player when currentVideo changes
  useEffect(() => {
    console.log('VideoPlayer useEffect - currentVideo changed:', currentVideo?.title || 'null');
    
    // Only initialize if we have a current video and haven't initialized yet
    if (!currentVideo) {
      console.log('No current video, skipping initialization');
      return;
    }

    if (isInitialized) {
      console.log('Player already initialized, checking if new video needed');
      if (playerReady && playerInstanceRef.current && currentVideoIdRef.current !== currentVideo.videoId) {
        console.log('Loading new video in existing player:', currentVideo.title);
        const loadResult = safePlayerCall('loadVideoById', currentVideo.videoId);
        if (loadResult !== null) {
          currentVideoIdRef.current = currentVideo.videoId;
          lastSyncTime.current = 0;
        }
      } else {
        console.log('Same video already loaded, not reloading');
      }
      return;
    }

    if (initializationAttempted) {
      console.log('Initialization already attempted, skipping');
      return;
    }
    
    console.log('Starting player initialization for video:', currentVideo.title);
    
    // Initialize YouTube Player when we have a video
    const handleYouTubeAPIReady = () => {
      console.log('Handling YouTube API ready event...');
      setTimeout(initializePlayer, 200); // Delay to ensure DOM is ready
    };

    const initializeWhenReady = () => {
      console.log('initializeWhenReady called for video:', currentVideo.title);
      // Check current API state
      const apiState = checkYouTubeAPI();
      console.log('API State:', apiState);
      
      // Check if YouTube API is already loaded and functional
      if (window.YT && 
          window.YT.Player && 
          typeof window.YT.Player === 'function' &&
          (window.YTReady || window.YT.loaded)) {
        logPlayerEvent('API Ready', 'Initializing player immediately');
        setTimeout(initializePlayer, 100);
      } else {
        logPlayerEvent('API Not Ready', 'Waiting for YouTube API to load');
        // Listen for the API ready event
        window.addEventListener('youtubeAPIReady', handleYouTubeAPIReady);
        
        // Also try to initialize after a delay in case the API loads without the event
        setTimeout(() => {
          console.log('Backup initialization attempt after 2 seconds');
          if (window.YT && 
              window.YT.Player && 
              typeof window.YT.Player === 'function' && 
              !isInitialized) {
            console.log('Backup: YouTube API found, initializing...');
            initializePlayer();
          } else {
            console.log('Backup: YouTube API still not ready');
          }
        }, 2000);
      }
    };

    // Initialize when DOM is ready
    console.log('Document ready state:', document.readyState);
    if (document.readyState === 'loading') {
      console.log('Document still loading, waiting for DOMContentLoaded');
      document.addEventListener('DOMContentLoaded', initializeWhenReady);
    } else {
      console.log('Document already ready, initializing immediately');
      initializeWhenReady();
    }

    return () => {
      window.removeEventListener('youtubeAPIReady', handleYouTubeAPIReady);
      document.removeEventListener('DOMContentLoaded', initializeWhenReady);
    };
  }, [currentVideo, isInitialized, initializationAttempted]); // Run when currentVideo changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('VideoPlayer cleanup');
      isMountedRef.current = false;
      if (playerInstanceRef.current) {
        try {
          playerInstanceRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying YouTube player:', error);
        }
      }
    };
  }, []);

  const initializePlayer = () => {
    if (isInitialized || initializationAttempted) {
      console.log('Player initialization already attempted or completed');
      return;
    }
    
    setInitializationAttempted(true);
    
    if (!playerRef.current) {
      console.warn('Player ref not available');
      setInitializationAttempted(false);
      return;
    }
    
    if (!window.YT || !window.YT.Player || typeof window.YT.Player !== 'function') {
      console.warn('YouTube API not available or Player constructor not ready');
      setInitializationAttempted(false);
      return;
    }

    const playerId = playerIdRef.current;
    const element = document.getElementById(playerId);
    if (!element) {
      console.warn('Player element not found:', playerId);
      // Reset attempt flag and try again after a short delay
      setInitializationAttempted(false);
      setTimeout(() => {
        if (isMountedRef.current && !isInitialized && !initializationAttempted) {
          console.log('Retrying player initialization...');
          initializePlayer();
        }
      }, 300);
      return;
    }
    
    try {
      console.log('Creating YouTube player with ID:', playerId);
      playerInstanceRef.current = new window.YT.Player(playerId, {
        height: '100%',
        width: '100%',
        videoId: currentVideo.videoId, // Load the current video immediately
        playerVars: {
          autoplay: 0,
          controls: 0, // Hide default controls since we have custom ones
          disablekb: 1,
          fs: 0,
          rel: 0,
          showinfo: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
          widget_referrer: window.location.origin
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError,
        },
      });
      
      // Track which video we just loaded
      currentVideoIdRef.current = currentVideo.videoId;
      
      // Store player reference in DOM element for debugging
      const playerElement = document.getElementById(playerId);
      if (playerElement) {
        playerElement._ytPlayer = playerInstanceRef.current;
      }
      
      setIsInitialized(true);
      console.log('YouTube player successfully initialized');
      
      // Verify the player instance is properly set and functional
      setTimeout(() => {
        if (playerInstanceRef.current && typeof playerInstanceRef.current.getCurrentTime === 'function') {
          console.log('Player verification successful - all methods available');
        } else {
          console.warn('Player verification failed - methods may not be available yet');
          setPlayerReady(false); // Reset ready state to trigger re-initialization if needed
        }
      }, 500);
    } catch (error) {
      console.error('Failed to initialize YouTube player:', error);
      setPlayerError('Failed to initialize video player. Please refresh the page.');
      setIsInitialized(false);
      setInitializationAttempted(false);
    }
  };

  const onPlayerReady = () => {
    console.log('onPlayerReady called');
    
    // Verify player is actually ready and functional
    if (!playerInstanceRef.current) {
      console.error('Player ready event fired but no player instance');
      return;
    }

    // Test if basic methods are available
    try {
      if (typeof playerInstanceRef.current.getCurrentTime !== 'function') {
        console.error('Player instance missing getCurrentTime method');
        return;
      }
    } catch (error) {
      console.error('Error testing player methods:', error);
      return;
    }

    setPlayerReady(true);
    setPlayerError(null); // Clear any previous errors
    logPlayerEvent('Player Ready', 'YouTube player is ready for use');
    
    // Initialize lastSyncTime to current video position
    setTimeout(() => {
      const currentTime = safeGetCurrentTime();
      lastSyncTime.current = currentTime;
      console.log('Initialized sync time to:', currentTime);
    }, 100); // Small delay to ensure player is fully ready
    
    // Debug: Check if iframe was created and is visible
    const playerElement = document.getElementById(playerIdRef.current);
    console.log('Player element after ready:', playerElement);
    const iframe = playerElement?.querySelector('iframe');
    console.log('YouTube iframe found:', iframe);
    console.log('Iframe styles:', iframe ? {
      width: iframe.style.width || iframe.width,
      height: iframe.style.height || iframe.height,
      display: window.getComputedStyle(iframe).display,
      visibility: window.getComputedStyle(iframe).visibility,
      position: window.getComputedStyle(iframe).position
    } : 'No iframe');
    
    // Force iframe to be properly sized and visible
    if (iframe) {
      console.log('Forcing iframe to be visible and properly sized');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.display = 'block';
      iframe.style.visibility = 'visible';
      iframe.style.position = 'absolute';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.border = 'none';
      iframe.style.zIndex = '1';
      
      // Also ensure the player element is properly sized
      playerElement.style.width = '100%';
      playerElement.style.height = '100%';
      playerElement.style.position = 'relative';
    }
  };

  const onPlayerStateChange = (event) => {
    const state = event.data;
    
    // YouTube Player States:
    // -1 – unstarted
    // 0 – ended
    // 1 – playing
    // 2 – paused
    // 3 – buffering
    // 5 – video cued

    if (state === window.YT.PlayerState.ENDED) {
      console.log('Video ended, clearing current video reference');
      currentVideoIdRef.current = null; // Clear reference so next video loads properly
      onVideoEnd();
    } else if (state === window.YT.PlayerState.PLAYING) {
      // Only trigger onPlay if we didn't initiate this play
      if (!isPlaying) {
        onPlay();
      }
    } else if (state === window.YT.PlayerState.PAUSED) {
      // Only trigger onPause if we didn't initiate this pause
      if (isPlaying) {
        onPause();
      }
    }
  };

  const onPlayerError = (event) => {
    console.error('YouTube player error:', event.data);
    let errorMessage = '';
    
    // Handle different error codes
    switch(event.data) {
      case 2:
        errorMessage = 'Invalid video ID';
        break;
      case 5:
        errorMessage = 'HTML5 player error - video cannot be played';
        break;
      case 100:
        errorMessage = 'Video not found or has been removed';
        break;
      case 101:
      case 150:
        errorMessage = 'Video cannot be played in embedded players';
        break;
      default:
        errorMessage = 'Unknown player error occurred';
    }
    
    console.error('YouTube player error details:', errorMessage);
    
    // Clear current video reference on error so next video loads properly
    currentVideoIdRef.current = null;
    
    // Skip to next video on error, but don't set global player error
    // This allows the player to continue working with other videos
    onVideoEnd();
  };

  // Handle video changes (only reload if it's actually a different video)
  useEffect(() => {
    if (currentVideo && isInitialized) {
      // Check if this is actually a different video
      const isDifferentVideo = currentVideoIdRef.current !== currentVideo.videoId;
      
      if (isDifferentVideo && playerReady && playerInstanceRef.current) {
        console.log('Loading new video (different from current):', currentVideo.title);
        const loadResult = safePlayerCall('loadVideoById', currentVideo.videoId);
        if (loadResult !== null) {
          currentVideoIdRef.current = currentVideo.videoId;
          // Reset sync time when loading new video to prevent sync loops
          lastSyncTime.current = 0;
        }
      } else if (isDifferentVideo) {
        console.log('New video detected but player not ready yet:', currentVideo.title);
        currentVideoIdRef.current = currentVideo.videoId;
        lastSyncTime.current = 0;
      } else {
        console.log('Same video detected, not reloading:', currentVideo.title);
      }
    } else if (currentVideo && !isInitialized) {
      // If we have a new video but player isn't initialized, reset states to allow initialization
      console.log('New video detected, resetting initialization state');
      currentVideoIdRef.current = currentVideo.videoId;
      setInitializationAttempted(false);
      setPlayerError(null);
      // Reset sync time for new video
      lastSyncTime.current = 0;
    }
  }, [currentVideo, isInitialized, playerReady]);

  // Sync play/pause state
  useEffect(() => {
    if (playerReady && playerInstanceRef.current) {
      const playerState = safePlayerCall('getPlayerState');
      
      if (isPlaying && playerState !== window.YT?.PlayerState?.PLAYING) {
        safePlayerCall('playVideo');
      } else if (!isPlaying && playerState === window.YT?.PlayerState?.PLAYING) {
        safePlayerCall('pauseVideo');
      }
    }
  }, [isPlaying, playerReady]);

  // Sync volume
  useEffect(() => {
    if (playerReady && playerInstanceRef.current) {
      safePlayerCall('setVolume', volume);
    }
  }, [volume, playerReady]);

  // Handle external sync events (from other users or periodic sync)
  useEffect(() => {
    if (syncTime !== null && playerReady && playerInstanceRef.current) {
      const currentTime = safeGetCurrentTime();
      
      // Handle both simple number and object format
      let targetTime, syncType, customTolerance;
      if (typeof syncTime === 'object') {
        targetTime = syncTime.time;
        syncType = syncTime.type || 'manual';
        customTolerance = syncTime.tolerance;
      } else {
        targetTime = syncTime;
        syncType = syncTime === 0 ? 'initial' : 'manual';
        customTolerance = null;
      }
      
      const timeDifference = Math.abs(currentTime - targetTime);
      
      console.log('Received sync request:', { 
        targetTime, 
        currentTime, 
        difference: timeDifference,
        type: syncType
      });
      
      // Determine sync threshold based on sync type
      let syncThreshold = customTolerance || 3; // Use custom tolerance or default
      
      if (syncType === 'periodic') {
        syncThreshold = Math.max(syncThreshold, 4); // Periodic sync is more gentle
      } else if (syncType === 'initial' || (currentTime < 5 && targetTime > 10)) {
        syncThreshold = 2; // Initial sync is more aggressive
        console.log('Initial sync detected - lowering threshold');
      }
      
      // Only sync if there's a significant difference and avoid problematic sync to 0
      const shouldSync = timeDifference > syncThreshold && 
                        !(targetTime === 0 && currentTime < 15); // More lenient to avoid sync to 0 loops
      
      if (shouldSync) {
        console.log(`Syncing to external position: ${targetTime} (difference: ${timeDifference}s, type: ${syncType})`);
        const seekResult = safePlayerCall('seekTo', targetTime);
        if (seekResult !== null) {
          lastSyncTime.current = targetTime;
        }
      } else {
        console.log(`Skipping ${syncType} sync - difference: ${timeDifference}s (threshold: ${syncThreshold}s)`);
      }
      
      // Mark sync as complete
      if (onSyncComplete) {
        onSyncComplete();
      }
    }
  }, [syncTime, playerReady, onSyncComplete]);

  // Update lastSyncTime and broadcast time to server when video naturally progresses
  useEffect(() => {
    if (!playerReady || !playerInstanceRef.current || !currentVideo || !isPlaying) {
      return;
    }

    const updateAndBroadcastTime = () => {
      const currentTime = safeGetCurrentTime();
      if (currentTime >= 0) {
        lastSyncTime.current = currentTime;
        
        // Use the onTimeUpdate prop if provided
        if (onTimeUpdate) {
          onTimeUpdate(currentTime);
        }
      }
    };

    // Update sync time and broadcast to server periodically while playing
    const syncUpdateInterval = setInterval(updateAndBroadcastTime, 2000); // Every 2 seconds

    return () => clearInterval(syncUpdateInterval);
  }, [playerReady, currentVideo, isPlaying, onTimeUpdate]);

  const handleSeek = (time) => {
    console.log('Local seek requested to:', time);
    
    const seekResult = safePlayerCall('seekTo', time);
    if (seekResult !== null) {
      lastSyncTime.current = time;
      // Only send seek event if this is a manual user action and seek was successful
      onSeek(time);
    } else {
      console.warn('Failed to seek - player not ready');
    }
  };

  // Show error state if player failed to initialize
  if (playerError) {
    return (
      <div className="video-container">
        <div className="video-placeholder">
          <div>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block', color: '#ef4444' }}></i>
            <h3>Player Error</h3>
            <p>{playerError}</p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentVideo) {
    // Reset video ID reference when no video is selected
    if (currentVideoIdRef.current !== null) {
      console.log('Clearing current video ID reference');
      currentVideoIdRef.current = null;
    }
    
    return (
      <div className="video-container">
        <div className="video-placeholder">
          <div>
            <i className="fas fa-play-circle" style={{ fontSize: '4rem', marginBottom: '1rem', display: 'block' }}></i>
            <h3>No video selected</h3>
            <p>Search and add videos to start listening together!</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while player is initializing
  if (currentVideo && !playerReady) {
    return (
      <div className="video-container">
        <div className="video-placeholder">
          <div>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}></i>
            <h3>Loading video player...</h3>
            <p>{currentVideo.title}</p>
          </div>
        </div>
        {/* Hidden player element that YouTube API will use */}
        <div 
          id={playerIdRef.current}
          ref={playerRef} 
          style={{ position: 'absolute' }}
        />
      </div>
    );
  }

  return (
    <div className="video-container">
      <div 
        id={playerIdRef.current}
        ref={playerRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          backgroundColor: '#000',
          position: 'relative'
        }}
      />
      
      {currentVideo && (
        <div className="current-video-info">
          <h3 className="current-title">{currentVideo.title}</h3>
          <p className="current-channel">{currentVideo.channelTitle}</p>
        </div>
      )}
      

    </div>
  );
};

export default VideoPlayer;
