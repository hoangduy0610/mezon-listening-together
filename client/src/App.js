import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import toast, { Toaster } from 'react-hot-toast';
import VideoPlayer from './components/VideoPlayer';
import VideoSearch from './components/VideoSearch';
import Playlist from './components/Playlist';
import Controls from './components/Controls';

function App() {
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [showRoomJoin, setShowRoomJoin] = useState(true);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [participantCount, setParticipantCount] = useState(0);
  const [syncTime, setSyncTime] = useState(null);

  useEffect(() => {
    // Check if there's a room ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomId = urlParams.get('room');
    if (urlRoomId) {
      setRoomId(urlRoomId);
    }
  }, []);

  const joinRoom = (newRoomId) => {
    if (!newRoomId.trim()) {
      toast.error('Please enter a room name');
      return;
    }

    // Create socket connection
    const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000');
    setSocket(newSocket);

    // Set up socket listeners
    newSocket.on('connect', () => {
      console.log('Connected to server');
      newSocket.emit('join-room', newRoomId);
      setShowRoomJoin(false);
      
      // Update URL
      const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${newRoomId}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
      
      toast.success(`Joined room: ${newRoomId}`);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      toast.error('Disconnected from server');
    });

    newSocket.on('room-state', (state) => {
      setCurrentVideo(state.currentVideo);
      setPlaylist(state.playlist);
      setIsPlaying(state.isPlaying);
      setVolume(state.volume);
      setParticipantCount(state.participantCount);
    });

    newSocket.on('playlist-updated', (newPlaylist) => {
      setPlaylist(newPlaylist);
    });

    newSocket.on('play-video', (video) => {
      setCurrentVideo(video);
      setIsPlaying(true);
      toast.success(`Now playing: ${video.title}`);
    });

    newSocket.on('playlist-ended', () => {
      setCurrentVideo(null);
      setIsPlaying(false);
      toast('Playlist ended! Add more videos to continue.', { icon: '🎵' });
    });

    newSocket.on('participant-joined', (count) => {
      setParticipantCount(count);
      toast('Someone joined the room!', { icon: '👋' });
    });

    newSocket.on('participant-left', (count) => {
      setParticipantCount(count);
      toast('Someone left the room', { icon: '👋' });
    });

    // Player sync events
    newSocket.on('play', () => {
      setIsPlaying(true);
    });

    newSocket.on('pause', () => {
      setIsPlaying(false);
    });

    newSocket.on('volume-change', (newVolume) => {
      setVolume(newVolume);
    });

    newSocket.on('seek', (time) => {
      console.log('Received seek event from server:', time);
      setSyncTime(time);
    });

    // Handle initial sync when joining room with active video
    newSocket.on('sync-position', (data) => {
      console.log('Received initial sync position:', data);
      setSyncTime({ time: data.time, type: 'initial' });
      if (data.isPlaying !== isPlaying) {
        setIsPlaying(data.isPlaying);
      }
    });

    // Handle periodic sync to keep everyone aligned (gentler than manual sync)
    newSocket.on('periodic-sync', (data) => {
      console.log('Received periodic sync:', data);
      // Add a flag to indicate this is a gentle sync
      setSyncTime({ time: data.time, type: 'periodic', tolerance: data.tolerance });
    });

    setRoomId(newRoomId);
  };

  const addVideo = (video) => {
    if (!socket) return;
    socket.emit('add-video', video);
    toast.success('Added to playlist!', { icon: '➕' });
  };

  const removeVideo = (videoId) => {
    if (!socket) return;
    socket.emit('remove-video', videoId);
  };

  const handlePlay = () => {
    if (!socket) return;
    socket.emit('play');
    setIsPlaying(true);
  };

  const handlePause = () => {
    if (!socket) return;
    socket.emit('pause');
    setIsPlaying(false);
  };

  const handleSeek = (time) => {
    if (!socket) return;
    socket.emit('seek', time);
  };

  const handleVolumeChange = (newVolume) => {
    if (!socket) return;
    socket.emit('volume-change', newVolume);
    setVolume(newVolume);
  };

  const handleSkip = () => {
    if (!socket) return;
    socket.emit('skip-video');
  };

  const handleVideoEnd = () => {
    if (!socket) return;
    socket.emit('video-ended');
  };

  const reorderPlaylist = (newPlaylist) => {
    if (!socket) return;
    socket.emit('reorder-playlist', newPlaylist);
    setPlaylist(newPlaylist);
  };

  if (showRoomJoin) {
    return (
      <div className="room-join">
        <div className="room-join-modal">
          <h1 className="room-join-title">🎵 Listen Together</h1>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            Join or create a room to start listening together
          </p>
          <input
            type="text"
            className="room-input"
            placeholder="Enter room name..."
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && joinRoom(roomId)}
            autoFocus
          />
          <button 
            className="join-btn"
            onClick={() => joinRoom(roomId)}
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Toaster position="top-right" />
      
      <header className="header">
        <div className="logo">
          <i className="fas fa-headphones"></i>
          Listen Together
        </div>
        <div className="room-info">
          <span>Room: <strong>{roomId}</strong></span>
          <span className="participant-count">
            <i className="fas fa-users"></i> {participantCount}
          </span>
        </div>
      </header>

      <div className="main-container">
        <div className="video-section">
          <VideoPlayer 
            currentVideo={currentVideo}
            isPlaying={isPlaying}
            volume={volume}
            syncTime={syncTime}
            socket={socket}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onVideoEnd={handleVideoEnd}
            onSyncComplete={() => setSyncTime(null)}
          />
          
          <Controls
            isPlaying={isPlaying}
            volume={volume}
            onPlay={handlePlay}
            onPause={handlePause}
            onSkip={handleSkip}
            onVolumeChange={handleVolumeChange}
            hasVideo={!!currentVideo}
          />
        </div>

        <div className="sidebar">
          <VideoSearch onAddVideo={addVideo} />
          <Playlist 
            playlist={playlist}
            currentVideo={currentVideo}
            onRemoveVideo={removeVideo}
            onReorderPlaylist={reorderPlaylist}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
