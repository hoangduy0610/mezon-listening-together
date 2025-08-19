import React, { useState, useEffect } from 'react';
import { APP_CONFIG } from '../config/constants';

const RoomJoin = ({ 
  initialRoomId = '', 
  onJoinRoom, 
  isConnecting = false, 
  connectionError = null,
  validateRoomName = null // Optional validation function from parent
}) => {
  const [roomId, setRoomId] = useState(initialRoomId);
  const [isValid, setIsValid] = useState(true);
  const [validationError, setValidationError] = useState('');

  // Validate room ID in real-time
  useEffect(() => {
    if (!roomId.trim()) {
      setIsValid(true);
      setValidationError('');
      return;
    }

    // Use parent validation function if provided, otherwise use local validation
    if (validateRoomName) {
      const error = validateRoomName(roomId);
      setIsValid(!error);
      setValidationError(error || '');
    } else {
      // Fallback local validation
      if (roomId.length > APP_CONFIG.maxRoomNameLength) {
        setIsValid(false);
        setValidationError(`Room name too long (max ${APP_CONFIG.maxRoomNameLength} characters)`);
        return;
      }

      // Check for invalid characters
      if (!/^[a-zA-Z0-9-_\s]*$/.test(roomId)) {
        setIsValid(false);
        setValidationError('Room name can only contain letters, numbers, hyphens, and underscores');
        return;
      }

      setIsValid(true);
      setValidationError('');
    }
  }, [roomId, validateRoomName]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!isValid || !roomId.trim()) {
      // Show validation error in UI instead of toast
      if (!roomId.trim()) {
        setValidationError('Please enter a room name');
      }
      return;
    }

    onJoinRoom(roomId.trim());
  };

  const handleInputChange = (e) => {
    setRoomId(e.target.value);
  };

  const generateRandomRoom = () => {
    const adjectives = ['happy', 'bright', 'calm', 'swift', 'brave', 'quiet', 'cool', 'warm'];
    const nouns = ['music', 'sound', 'beat', 'tune', 'song', 'rhythm', 'melody', 'vibe'];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 100);
    
    setRoomId(`${adjective}-${noun}-${number}`);
  };

  const isSubmitDisabled = !isValid || !roomId.trim() || isConnecting;

  return (
    <div className="room-join">
      <div className="room-join-modal">
        <div className="logo-large">
          <i className="fas fa-headphones"></i>
        </div>
        
        <h1 className="room-join-title">🎵 Listen Together</h1>
        
        <p className="room-join-description">
          Join or create a room to start listening to YouTube videos together with friends
        </p>

        <form onSubmit={handleSubmit} className="room-join-form">
          <div className="input-group">
            <input
              type="text"
              className={`room-input ${!isValid ? 'error' : ''}`}
              placeholder="Enter room name..."
              value={roomId}
              onChange={handleInputChange}
              autoFocus
              disabled={isConnecting}
              maxLength={APP_CONFIG.maxRoomNameLength}
            />
            
            <button
              type="button"
              className="random-btn"
              onClick={generateRandomRoom}
              disabled={isConnecting}
              title="Generate random room name"
            >
              <i className="fas fa-dice"></i>
            </button>
          </div>

          {validationError && (
            <div className="validation-error">
              <i className="fas fa-exclamation-triangle"></i>
              {validationError}
            </div>
          )}

          {connectionError && (
            <div className="connection-error">
              <i className="fas fa-wifi"></i>
              Connection failed: {connectionError}
            </div>
          )}

          <button 
            type="submit"
            className={`join-btn ${isConnecting ? 'connecting' : ''}`}
            disabled={isSubmitDisabled}
          >
            {isConnecting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Connecting...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i>
                Join Room
              </>
            )}
          </button>
        </form>

        <div className="room-join-features">
          <div className="feature">
            <i className="fas fa-users"></i>
            <span>Listen with friends</span>
          </div>
          <div className="feature">
            <i className="fas fa-sync"></i>
            <span>Synchronized playback</span>
          </div>
          <div className="feature">
            <i className="fas fa-list"></i>
            <span>Collaborative playlists</span>
          </div>
        </div>

        <div className="room-join-tips">
          <h3>💡 Tips:</h3>
          <ul>
            <li>Room names are case-insensitive and spaces are allowed</li>
            <li>Share the room link with friends to join together</li>
            <li>Anyone in the room can control playback and manage the playlist</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RoomJoin;
