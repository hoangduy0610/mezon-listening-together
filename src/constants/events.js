// Socket.IO event constants
module.exports = {
  // Connection events
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
  VOLUME_CHANGE: 'volume-change',
  SKIP_VIDEO: 'skip-video',
  VIDEO_ENDED: 'video-ended',
  PLAY_VIDEO: 'play-video',
  PLAYLIST_ENDED: 'playlist-ended',
  
  // Sync events
  SYNC_POSITION: 'sync-position',
  PERIODIC_SYNC: 'periodic-sync',
  TIME_UPDATE: 'time-update'
};
