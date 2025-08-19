// YouTube Player Debug Utilities

export const checkYouTubeAPI = () => {
  const debug = {
    apiLoaded: !!window.YT,
    playerClass: !!(window.YT && window.YT.Player),
    ytReady: !!window.YTReady,
    ytLoaded: !!(window.YT && window.YT.loaded),
    onReadyCallback: typeof window.onYouTubeIframeAPIReady === 'function',
    timestamp: new Date().toISOString()
  };
  
  console.log('YouTube API Debug Info:', debug);
  return debug;
};

export const debugPlayerState = (player) => {
  if (!player) {
    console.log('No player instance available');
    return null;
  }
  
  try {
    const state = {
      playerState: player.getPlayerState(),
      currentTime: player.getCurrentTime(),
      duration: player.getDuration(),
      volume: player.getVolume(),
      playbackRate: player.getPlaybackRate(),
      videoId: player.getVideoData()?.video_id
    };
    
    console.log('Player State:', state);
    return state;
  } catch (error) {
    console.error('Error getting player state:', error);
    return null;
  }
};

export const playerStateNames = {
  '-1': 'unstarted',
  0: 'ended',
  1: 'playing',
  2: 'paused',
  3: 'buffering',
  5: 'video cued'
};

export const logPlayerEvent = (eventName, data) => {
  console.log(`[YouTube Player] ${eventName}:`, data);
};

// Test YouTube API loading
export const testYouTubeAPILoading = () => {
  console.log('=== YouTube API Loading Test ===');
  console.log('1. Script tag check:');
  const scripts = Array.from(document.querySelectorAll('script')).filter(s => s.src.includes('youtube'));
  console.log('YouTube script tags found:', scripts.length);
  scripts.forEach(script => console.log('  - Script src:', script.src));
  
  console.log('2. Window objects:');
  console.log('  - window.YT:', !!window.YT);
  console.log('  - window.YT.Player:', !!(window.YT && window.YT.Player));
  console.log('  - window.YTReady:', !!window.YTReady);
  console.log('  - window.onYouTubeIframeAPIReady:', typeof window.onYouTubeIframeAPIReady);
  
  console.log('3. DOM elements:');
  const playerElements = document.querySelectorAll('[id^="youtube-player"]');
  console.log('  - Player elements found:', playerElements.length);
  playerElements.forEach(el => console.log('    - Element ID:', el.id));
  
  console.log('4. Manual API loading attempt...');
  if (!window.YT) {
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onload = () => console.log('YouTube script loaded via manual injection');
    script.onerror = () => console.error('YouTube script failed to load via manual injection');
    document.head.appendChild(script);
  } else {
    console.log('YouTube API already loaded');
  }
};

// Debug video display
export const debugVideoDisplay = () => {
  console.log('=== Video Display Debug ===');
  
  // Find all player elements
  const playerElements = document.querySelectorAll('[id^="youtube-player"]');
  console.log('Player elements found:', playerElements.length);
  
  playerElements.forEach((element, index) => {
    console.log(`Player ${index + 1}:`, element.id);
    console.log('  - Element dimensions:', {
      width: element.offsetWidth,
      height: element.offsetHeight,
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight
    });
    console.log('  - Element styles:', {
      display: window.getComputedStyle(element).display,
      visibility: window.getComputedStyle(element).visibility,
      position: window.getComputedStyle(element).position,
      zIndex: window.getComputedStyle(element).zIndex
    });
    
    // Check for iframe
    const iframe = element.querySelector('iframe');
    if (iframe) {
      console.log('  - Iframe found:', iframe.src);
      console.log('  - Iframe dimensions:', {
        width: iframe.offsetWidth,
        height: iframe.offsetHeight,
        clientWidth: iframe.clientWidth,
        clientHeight: iframe.clientHeight
      });
      console.log('  - Iframe styles:', {
        display: window.getComputedStyle(iframe).display,
        visibility: window.getComputedStyle(iframe).visibility,
        position: window.getComputedStyle(iframe).position,
        zIndex: window.getComputedStyle(iframe).zIndex
      });
    } else {
      console.log('  - No iframe found in this element');
    }
  });
  
  // Check video container
  const videoContainer = document.querySelector('.video-container');
  if (videoContainer) {
    console.log('Video container found:', {
      width: videoContainer.offsetWidth,
      height: videoContainer.offsetHeight,
      aspectRatio: window.getComputedStyle(videoContainer).aspectRatio
    });
  }
};

// Global debug function for browser console
window.debugYouTube = {
  checkAPI: checkYouTubeAPI,
  debugPlayer: debugPlayerState,
  stateNames: playerStateNames,
  testLoading: testYouTubeAPILoading,
  debugDisplay: debugVideoDisplay
};
