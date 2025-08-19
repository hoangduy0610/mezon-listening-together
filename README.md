# 🎵 Listen Together

A real-time collaborative YouTube listening platform where users can search, add, and synchronously watch videos together.

## Features

- 🔍 **YouTube Video Search** - Search and add videos to shared playlists
- 🎥 **Synchronized Playback** - Everyone watches at the same time position
- 👥 **Multi-user Control** - Anyone can play, pause, skip, or adjust volume
- 📱 **Drag & Drop Playlist** - Reorder videos with intuitive drag and drop
- 🚀 **Auto-progression** - Videos automatically advance and remove from playlist
- 🏠 **Room System** - Create/join rooms for different listening groups
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Quick Start

### 1. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
npm run install-client
```

### 2. Set up Configuration

1. **Get YouTube API Key:**
   - Go to [Google Cloud Console](https://console.developers.google.com/apis/credentials)
   - Create a new project or select existing one
   - Enable the YouTube Data API v3
   - Create credentials (API Key)

2. **Backend Configuration:**
   - Copy `config.example.env` to `.env` in the root directory
   - Add your YouTube API key
   - Configure URLs for your deployment

3. **Frontend Configuration:**
   - Copy `client/config.example.env` to `client/.env`
   - Set the backend server URL

**Example .env (backend):**
```env
YOUTUBE_API_KEY=your_api_key_here
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

**Example client/.env (frontend):**
```env
REACT_APP_SERVER_URL=http://localhost:5000
```

### 3. Run the Application

```bash
# Development mode (runs both backend and frontend)
npm run dev:both

# Or run separately:
# Backend only
npm run dev

# Frontend only (in another terminal)
npm run client
```

### 4. Open Your Browser

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Usage

1. **Create or Join a Room**: Enter a room name to create or join a listening session
2. **Search Videos**: Use the search box to find YouTube videos
3. **Add to Playlist**: Click any search result to add it to the shared playlist
4. **Control Playback**: Use the controls to play, pause, skip, or adjust volume
5. **Reorder Playlist**: Drag and drop videos to reorder the queue
6. **Invite Friends**: Share the room URL with others to listen together

## Room Sharing

Share rooms by sending the URL with the room parameter:
```
http://localhost:3000?room=your-room-name
```

## Technology Stack

### Backend
- Node.js + Express
- Socket.IO for real-time communication
- YouTube Data API v3
- Axios for HTTP requests

### Frontend
- React 18
- Socket.IO Client
- YouTube Player API
- React Beautiful DnD for drag and drop
- React Hot Toast for notifications
- Modern CSS with gradients and blur effects

## Project Structure

```
listen-together/
├── server.js              # Main backend server
├── package.json           # Backend dependencies
├── client/                # React frontend
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   ├── components/    # Reusable components
│   │   │   ├── VideoPlayer.js
│   │   │   ├── VideoSearch.js
│   │   │   ├── Playlist.js
│   │   │   └── Controls.js
│   │   └── index.css      # Global styles
│   └── package.json       # Frontend dependencies
└── README.md              # This file
```

## API Endpoints

- `GET /api/search?q={query}` - Search YouTube videos
- Socket.IO events for real-time synchronization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Troubleshooting

### Common Issues

**"YouTube API not configured" error**
- Make sure you have a valid YouTube API key in your `.env` file
- Ensure the YouTube Data API v3 is enabled in Google Cloud Console

**Videos not loading**
- Check browser console for errors
- Some videos may be restricted for embedding

**YouTube Player Issues**
- If you see "getCurrentTime is not a function" error, the app will auto-recover
- If you see "YouTube player element ID required" error, refresh the page
- Check browser console for detailed YouTube player error messages
- Use `window.debugYouTube.checkAPI()` in console to debug API loading
- Use `window.debugYouTube.autoDebug()` to check current player state
- Ensure you're not blocking YouTube iframe API in browser extensions or ad blockers
- Try disabling browser extensions temporarily to test

**Connection issues**
- Make sure both frontend (port 3000) and backend (port 5000) are running
- Check firewall settings if accessing from different devices

**Synchronization problems**
- Refresh the page to reconnect to the room
- Check network connectivity between users

### 🔧 Debug Console Commands

Open browser developer tools and use these commands for troubleshooting:

```javascript
// Check YouTube API loading status
window.debugYouTube.checkAPI()

// Auto-find and debug current player (recommended)
window.debugYouTube.autoDebug()

// Check video display and iframe status
window.debugYouTube.debugDisplay()

// View player state names reference
window.debugYouTube.stateNames

// Test YouTube API loading manually
window.debugYouTube.testLoading()
```

## 🚀 Deployment Guide

### Environment Configuration

The application supports flexible URL configuration for easy deployment:

**Development Setup:**
```env
# Backend (.env)
CLIENT_URL=http://localhost:3000
PORT=5000

# Frontend (client/.env)
REACT_APP_SERVER_URL=http://localhost:5000
```

**Production - Same Domain:**
```env
# Backend (.env)
CLIENT_URL=https://your-domain.com
PORT=5000

# Frontend (client/.env)
REACT_APP_SERVER_URL=https://your-domain.com
```

**Production - Separate Domains:**
```env
# Backend (.env)
CLIENT_URL=https://frontend.your-domain.com
PORT=5000

# Frontend (client/.env)
REACT_APP_SERVER_URL=https://backend.your-domain.com
```

### Deployment Platforms

**Heroku:**
1. Set environment variables in Heroku dashboard
2. Add `YOUTUBE_API_KEY` and `CLIENT_URL`
3. Deploy with: `git push heroku main`

**Vercel (Frontend) + Railway/Render (Backend):**
1. Deploy backend to Railway/Render
2. Deploy frontend to Vercel
3. Set `REACT_APP_SERVER_URL` in Vercel environment variables
4. Set `CLIENT_URL` in backend environment variables

**Docker:**
```dockerfile
# Use environment variables for configuration
ENV CLIENT_URL=https://your-domain.com
ENV REACT_APP_SERVER_URL=https://your-domain.com
```

**VPS/Self-hosted:**
1. Use PM2 or similar process manager
2. Set up reverse proxy (nginx)
3. Configure SSL certificates
4. Set environment variables in your deployment script

### Build for Production

```bash
# Install all dependencies
npm run install-all

# Build the React frontend
npm run build:prod

# Start production server
npm run start:prod

# Or use the complete deployment script
npm run deploy
```

### 📋 Detailed Deployment Guide

For comprehensive deployment instructions including platform-specific guides (Heroku, Vercel, DigitalOcean, Docker), see **[deploy.md](./deploy.md)**

## Future Enhancements

- User authentication and profiles
- Persistent playlists with database storage
- Chat functionality
- Video queue history
- Mobile app version
- Video quality selection
- Playback speed control

---

Built with ❤️ for music lovers who enjoy listening together!
