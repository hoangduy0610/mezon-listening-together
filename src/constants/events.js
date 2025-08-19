// Socket.IO event constants
module.exports = {
  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  
  // Room events
  JOIN_ROOM: 'join-room',
  PARTICIPANT_JOINED: 'participant-joined',
  PARTICIPANT_LEFT: 'participant-left',
  ROOM_STATE: 'room-state',
  
  // Playlist events
  ADD_VIDEO: 'add-video',
  REMOVE_VIDEO: 'remove-video',
  PLAYLIST_UPDATED: 'playlist-updated',
  REORDER_PLAYLIST: 'reorder-playlist',
  
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
