// Application constants
export const APP_CONFIG = {
  name: 'Listen Together',
  defaultVolume: 50,
  maxRoomNameLength: 50,
  maxSearchQueryLength: 100,
  searchDebounceMs: 300,
  toastDuration: 3000
};

// Socket event names (should match server)
export const SOCKET_EVENTS = {
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  
  // Auth events
  AUTHENTICATE: 'authenticate',
  AUTH_SUCCESS: 'auth-success',
  AUTH_ERROR: 'auth-error',
  
  // Room events
  JOIN_ROOM: 'join-room',
  PARTICIPANT_JOINED: 'participant-joined',
  PARTICIPANT_LEFT: 'participant-left',
  ROOM_STATE: 'room-state',
  KICK_PARTICIPANT: 'kick-participant',
  PARTICIPANT_KICKED: 'participant-kicked',
  
  // Room ownership events
  GRANT_PLAYLIST_PERMISSION: 'grant-playlist-permission',
  REVOKE_PLAYLIST_PERMISSION: 'revoke-playlist-permission',
  PERMISSIONS_UPDATED: 'permissions-updated',
  
  // Playlist events
  ADD_VIDEO: 'add-video',
  REMOVE_VIDEO: 'remove-video',
  PLAYLIST_UPDATED: 'playlist-updated',
  REORDER_PLAYLIST: 'reorder-playlist',
  PERMISSION_DENIED: 'permission-denied',
  
  // Player control events
  PLAY: 'play',
  PAUSE: 'pause',
  SEEK: 'seek',
  SKIP_VIDEO: 'skip-video',
  VIDEO_ENDED: 'video-ended',
  PLAY_VIDEO: 'play-video',
  PLAYLIST_ENDED: 'playlist-ended',
  
  // Sync events
  SYNC_POSITION: 'sync-position',
  PERIODIC_SYNC: 'periodic-sync',
  TIME_UPDATE: 'time-update'
};

// YouTube Player configuration
export const YOUTUBE_CONFIG = {
  playerVars: {
    autoplay: 0,
    controls: 0,
    disablekb: 1,
    fs: 0,
    rel: 0,
    showinfo: 0,
    modestbranding: 1,
    playsinline: 1,
    enablejsapi: 1
  },
  syncThresholds: {
    initial: 2,
    periodic: 4,
    manual: 3
  },
  timeUpdateInterval: 2000 // 2 seconds
};

// API configuration
export const API_CONFIG = {
  baseURL: process.env.REACT_APP_SERVER_URL || '',
  endpoints: {
    search: '/api/search',
    health: '/api/health'
  }
};

// UI Constants
export const UI_CONSTANTS = {
  breakpoints: {
    mobile: '768px'
  },
  animations: {
    fast: '0.2s',
    medium: '0.3s',
    slow: '0.5s'
  }
};
