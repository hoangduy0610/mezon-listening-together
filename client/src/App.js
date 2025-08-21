import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';

// Import refactored components
import VideoPlayer from './components/VideoPlayer';
import VideoSearch from './components/VideoSearch';
import Playlist from './components/Playlist';
import Controls from './components/Controls';
import RoomJoin from './components/RoomJoin';
import Header from './components/Header';
import Login from './components/Login';
import ParticipantsList from './components/ParticipantsList';
import ErrorBoundary from './components/ErrorBoundary';

// Import custom hooks
import { useSocket } from './hooks/useSocket';
import { useAuth } from './hooks/useAuth';
import { useRoom } from './hooks/useRoom';
import { usePlaylist } from './hooks/usePlaylist';
import { usePlayerControls } from './hooks/usePlayerControls';

// Import constants
import { APP_CONFIG } from './config/constants';

function App() {
  const [showLogin, setShowLogin] = useState(true);
  const [showRoomJoin, setShowRoomJoin] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasAttemptedAutoJoin, setHasAttemptedAutoJoin] = useState(false);

  // Initialize custom hooks
  const { socket, isConnected, connectionError, createSocket, disconnect } = useSocket();
  const { user, isAuthenticated, login, logout, continueAsGuest } = useAuth(socket);
  const {
    roomId,
    participants,
    participantCount,
    currentUser,
    isOwner,
    isInRoom,
    joinRoom,
    copyShareUrl,
    validateRoomName,
    grantPlaylistPermission,
    revokePlaylistPermission,
    kickParticipant
  } = useRoom(socket);
  const { currentVideo, playlist, addVideo, removeVideo, reorderPlaylist, skipVideo, handleVideoEnd } = usePlaylist(socket);
  const {
    isPlaying,
    volume,
    syncTime,
    handlePlay,
    handlePause,
    handleSeek,
    handleVolumeChange,
    toggleMute,
    sendTimeUpdate,
    clearSyncTime
  } = usePlayerControls(socket);

  // Handle authentication
  const handleLoginSuccess = (userInfo) => {
    login(userInfo);
    setShowLogin(false);
    setShowRoomJoin(true);
  };

  const handleSkipLogin = () => {
    continueAsGuest();
    setShowLogin(false);
    setShowRoomJoin(true);
  };

  useEffect(() => {
    if (!socket) {
      createSocket();
    }
  }, [socket]);

  // Handle room joining - simplified to prevent duplicate notifications
  const handleJoinRoom = (roomIdToJoin) => {
    console.log('handleJoinRoom called with:', roomIdToJoin);

    // Quick validation 
    const validationError = validateRoomName(roomIdToJoin);
    if (validationError) {
      console.warn('Room validation failed:', validationError);
      return; // Let the RoomJoin component show the error
    }

    // Prevent duplicate attempts
    if (hasAttemptedAutoJoin || isInRoom) {
      console.log('Skipping join - already attempted or in room');
      setShowRoomJoin(false);
      setIsInitialized(true);
      return;
    }

    // Store room ID for when socket connects
    window.pendingRoomJoin = roomIdToJoin;

    // Store the room ID to join when socket connects
    if (!socket) {
      console.log('Creating socket for room:', roomIdToJoin);
      createSocket();
    } else if (isConnected) {
      // Socket already connected, join immediately
      console.log('Socket already connected, joining room');
      const success = joinRoom(roomIdToJoin);
      if (success) {
        setShowRoomJoin(false);
        setIsInitialized(true);
        setHasAttemptedAutoJoin(true);
        toast.success(`Joined room: ${roomIdToJoin}`);
      }
    }
  };

  // Handle pending room join when socket connects
  useEffect(() => {
    if (socket && isConnected && window.pendingRoomJoin && !hasAttemptedAutoJoin) {
      console.log('Socket connected, processing pending room join:', window.pendingRoomJoin);
      const roomIdToJoin = window.pendingRoomJoin;
      window.pendingRoomJoin = null; // Clear pending join

      const success = joinRoom(roomIdToJoin);
      if (success) {
        setShowRoomJoin(false);
        setIsInitialized(true);
        setHasAttemptedAutoJoin(true);
        toast.success(`Joined room: ${roomIdToJoin}`);
      }
    }
  }, [socket, isConnected, joinRoom, hasAttemptedAutoJoin]);

  // Initialize app and check for room in URL - single useEffect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomId = urlParams.get('room');

    if (urlRoomId?.trim()) {
      console.log('Found room in URL, attempting to join:', urlRoomId.trim());
      handleJoinRoom(urlRoomId.trim());
    } else {
      console.log('No room in URL, checking if user needs authentication');
      // Check if user is already authenticated or has chosen to be a guest
      if (user) {
        setShowLogin(false);
        setShowRoomJoin(true);
      }
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // React to user changes

  // Handle leaving room
  const handleLeaveRoom = () => {
    disconnect();
    setShowRoomJoin(true);
    setIsInitialized(false);
    setHasAttemptedAutoJoin(false);
    // Clear any pending room join
    window.pendingRoomJoin = null;
    window.location.replace("/");
  };

  // Cleanup pending room join on unmount
  useEffect(() => {
    return () => {
      window.pendingRoomJoin = null;
    };
  }, []);

  // Show login screen if needed
  if (showLogin && !user) {
    return (
      <ErrorBoundary>
        <Login
          onLoginSuccess={handleLoginSuccess}
          onSkipLogin={handleSkipLogin}
        />
      </ErrorBoundary>
    );
  }

  // Show room join screen if not initialized
  if (!isInitialized || showRoomJoin) {
    return (
      <ErrorBoundary>
        <RoomJoin
          initialRoomId={roomId}
          onJoinRoom={handleJoinRoom}
          isConnecting={!isConnected && !!socket}
          connectionError={connectionError}
          validateRoomName={validateRoomName}
          user={user}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: APP_CONFIG.toastDuration,
            style: {
              background: '#363636',
              color: '#fff',
            }
          }}
        />

        <Header
          roomId={roomId}
          participantCount={participantCount}
          isConnected={isConnected}
          onLeaveRoom={handleLeaveRoom}
          onCopyShareUrl={copyShareUrl}
          user={user}
          isOwner={isOwner}
        />

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
              onSyncComplete={clearSyncTime}
              onTimeUpdate={sendTimeUpdate}
            />

            <Controls
              isPlaying={isPlaying}
              volume={volume}
              onPlay={handlePlay}
              onPause={handlePause}
              onSkip={skipVideo}
              onVolumeChange={handleVolumeChange}
              onToggleMute={toggleMute}
              hasVideo={!!currentVideo}
              isConnected={isConnected}
              canControl={currentUser?.hasPlaylistPermission || false}
            />
          </div>

          <div className="sidebar">
            <ParticipantsList
              participants={participants}
              currentUser={currentUser}
              isOwner={isOwner}
              onGrantPermission={grantPlaylistPermission}
              onRevokePermission={revokePlaylistPermission}
              onKickParticipant={kickParticipant}
            />

            <VideoSearch
              onAddVideo={addVideo}
              isConnected={isConnected}
              canAddVideo={currentUser?.hasPlaylistPermission || false}
            />

            <Playlist
              playlist={playlist}
              currentVideo={currentVideo}
              onRemoveVideo={removeVideo}
              onReorderPlaylist={reorderPlaylist}
              isConnected={isConnected}
              canEdit={currentUser?.hasPlaylistPermission || false}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
