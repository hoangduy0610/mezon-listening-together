const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));

// In-memory storage for rooms and playlists
const rooms = new Map();

// Room class to manage playlist and state
class Room {
  constructor(id) {
    this.id = id;
    this.playlist = [];
    this.currentVideo = null;
    this.currentTime = 0;
    this.isPlaying = false;
    this.volume = 50;
    this.participants = new Set();
    this.lastUpdate = Date.now();
  }

  addVideo(video) {
    this.playlist.push({
      ...video,
      id: Date.now() + Math.random(),
      addedAt: Date.now()
    });
  }

  removeVideo(videoId) {
    this.playlist = this.playlist.filter(video => video.id !== videoId);
  }

  playNext() {
    if (this.playlist.length > 0) {
      this.currentVideo = this.playlist.shift();
      this.currentTime = 0;
      this.isPlaying = true;
      this.lastUpdate = Date.now();
      return this.currentVideo;
    }
    this.currentVideo = null;
    this.isPlaying = false;
    return null;
  }

  updateState(state) {
    this.currentTime = state.currentTime || this.currentTime;
    this.isPlaying = state.isPlaying !== undefined ? state.isPlaying : this.isPlaying;
    this.volume = state.volume !== undefined ? state.volume : this.volume;
    this.lastUpdate = Date.now();
  }

  getState() {
    const now = Date.now();
    let adjustedTime = this.currentTime;
    
    // Adjust time if video is playing
    if (this.isPlaying && this.currentVideo) {
      adjustedTime += (now - this.lastUpdate) / 1000;
    }

    return {
      currentVideo: this.currentVideo,
      currentTime: adjustedTime,
      isPlaying: this.isPlaying,
      volume: this.volume,
      playlist: this.playlist,
      participantCount: this.participants.size
    };
  }
}

// YouTube API search
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    if (!YOUTUBE_API_KEY) {
      return res.status(500).json({ error: 'YouTube API key not configured' });
    }

    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: q,
        type: 'video',
        maxResults: 10,
        key: YOUTUBE_API_KEY
      }
    });

    const videos = response.data.items.map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      channelTitle: item.snippet.channelTitle,
      description: item.snippet.description
    }));

    res.json(videos);
  } catch (error) {
    console.error('YouTube search error:', error);
    res.status(500).json({ error: 'Failed to search YouTube' });
  }
});

// Periodic sync broadcast to keep all participants synchronized
setInterval(() => {
  rooms.forEach((room, roomId) => {
    if (room.currentVideo && room.isPlaying && room.participants.size > 1) {
      const currentState = room.getState();
      console.log(`Broadcasting periodic sync for room ${roomId}: ${currentState.currentTime.toFixed(1)}s to ${room.participants.size} participants`);
      // Broadcast current position to all participants
      io.to(roomId).emit('periodic-sync', {
        time: currentState.currentTime,
        tolerance: 3 // Allow 3 second difference before forcing sync
      });
    }
  });
}, 10000); // Sync every 10 seconds

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  let currentRoom = null;

  // Join a room
  socket.on('join-room', (roomId) => {
    if (currentRoom) {
      socket.leave(currentRoom);
      const room = rooms.get(currentRoom);
      if (room) {
        room.participants.delete(socket.id);
        socket.to(currentRoom).emit('participant-left', room.participants.size);
      }
    }

    currentRoom = roomId;
    socket.join(roomId);

    // Create room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Room(roomId));
    }

    const room = rooms.get(roomId);
    room.participants.add(socket.id);

    // Send current room state
    const currentState = room.getState();
    socket.emit('room-state', currentState);
    socket.to(roomId).emit('participant-joined', room.participants.size);
    
    // If there's a video currently playing, sync the new participant
    if (currentState.currentVideo && currentState.isPlaying) {
      console.log(`Syncing new participant to position: ${currentState.currentTime}`);
      setTimeout(() => {
        socket.emit('sync-position', {
          time: currentState.currentTime,
          isPlaying: currentState.isPlaying
        });
      }, 1000); // Give the client time to initialize the player
    }
    
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Add video to playlist
  socket.on('add-video', (video) => {
    if (!currentRoom) return;
    
    const room = rooms.get(currentRoom);
    if (room) {
      room.addVideo(video);
      
      // If no video is currently playing, start the next one
      if (!room.currentVideo) {
        const nextVideo = room.playNext();
        if (nextVideo) {
          io.to(currentRoom).emit('play-video', nextVideo);
        }
      }
      
      io.to(currentRoom).emit('playlist-updated', room.playlist);
    }
  });

  // Remove video from playlist
  socket.on('remove-video', (videoId) => {
    if (!currentRoom) return;
    
    const room = rooms.get(currentRoom);
    if (room) {
      room.removeVideo(videoId);
      io.to(currentRoom).emit('playlist-updated', room.playlist);
    }
  });

  // Player control events
  socket.on('play', () => {
    if (!currentRoom) return;
    
    const room = rooms.get(currentRoom);
    if (room) {
      room.updateState({ isPlaying: true });
      socket.to(currentRoom).emit('play');
    }
  });

  socket.on('pause', () => {
    if (!currentRoom) return;
    
    const room = rooms.get(currentRoom);
    if (room) {
      room.updateState({ isPlaying: false });
      socket.to(currentRoom).emit('pause');
    }
  });

  socket.on('seek', (time) => {
    if (!currentRoom) return;
    
    const room = rooms.get(currentRoom);
    if (room) {
      room.updateState({ currentTime: time });
      socket.to(currentRoom).emit('seek', time);
    }
  });

  socket.on('volume-change', (volume) => {
    if (!currentRoom) return;
    
    const room = rooms.get(currentRoom);
    if (room) {
      room.updateState({ volume });
      socket.to(currentRoom).emit('volume-change', volume);
    }
  });

  socket.on('skip-video', () => {
    if (!currentRoom) return;
    
    const room = rooms.get(currentRoom);
    if (room) {
      const nextVideo = room.playNext();
      if (nextVideo) {
        io.to(currentRoom).emit('play-video', nextVideo);
      } else {
        io.to(currentRoom).emit('playlist-ended');
      }
      io.to(currentRoom).emit('playlist-updated', room.playlist);
    }
  });

  socket.on('video-ended', () => {
    if (!currentRoom) return;
    
    const room = rooms.get(currentRoom);
    if (room) {
      const nextVideo = room.playNext();
      if (nextVideo) {
        io.to(currentRoom).emit('play-video', nextVideo);
      } else {
        io.to(currentRoom).emit('playlist-ended');
      }
      io.to(currentRoom).emit('playlist-updated', room.playlist);
    }
  });

  socket.on('reorder-playlist', (newPlaylist) => {
    if (!currentRoom) return;
    
    const room = rooms.get(currentRoom);
    if (room) {
      room.playlist = newPlaylist;
      io.to(currentRoom).emit('playlist-updated', room.playlist);
    }
  });

  // Handle time updates from clients to keep server state accurate
  socket.on('time-update', (currentTime) => {
    if (!currentRoom) return;
    
    const room = rooms.get(currentRoom);
    if (room && room.currentVideo && room.isPlaying) {
      // Update the server's time tracking
      const oldTime = room.currentTime;
      room.updateState({ currentTime: currentTime });
      console.log(`Time update from ${socket.id} in room ${currentRoom}: ${oldTime.toFixed(1)}s -> ${currentTime.toFixed(1)}s`);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.participants.delete(socket.id);
        socket.to(currentRoom).emit('participant-left', room.participants.size);
        
        // Clean up empty rooms
        if (room.participants.size === 0) {
          rooms.delete(currentRoom);
        }
      }
    }
  });
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
