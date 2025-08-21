import React, { useState } from 'react';

const Header = ({ 
  roomId, 
  participantCount, 
  isConnected, 
  onLeaveRoom, 
  onCopyShareUrl,
  user = null,
  isOwner = false
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleLeaveRoom = () => {
    if (window.confirm('Are you sure you want to leave this room?')) {
      onLeaveRoom();
    }
    setShowDropdown(false);
  };

  const handleCopyShareUrl = () => {
    onCopyShareUrl();
    setShowDropdown(false);
  };

  return (
    <header className="header">
      <div className="logo">
        <i className="fas fa-headphones"></i>
        <span className="logo-text">Listen Together</span>
      </div>

      <div className="room-info">
        <div className="connection-status">
          <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            <i className={`fas ${isConnected ? 'fa-wifi' : 'fa-exclamation-triangle'}`}></i>
          </div>
          <span className="connection-text">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div className="room-details">
          <span className="room-name">
            <i className="fas fa-door-open"></i>
            <strong>{roomId}</strong>
          </span>
          
          <span className="participant-count">
            <i className="fas fa-users"></i>
            <span>{participantCount}</span>
          </span>

          {user && (
            <span className="user-info">
              {user.avatar && (
                <img src={user.avatar} alt={user.username} className="user-avatar" />
              )}
              <span className="username">
                {user.username}
                {isOwner && <i className="fas fa-crown owner-crown" title="Room Owner"></i>}
              </span>
            </span>
          )}
        </div>

        <div className="room-actions">
          <div className={`dropdown ${showDropdown ? 'open' : ''}`}>
            <button 
              className="dropdown-toggle"
              onClick={toggleDropdown}
              title="Room options"
            >
              <i className="fas fa-ellipsis-v"></i>
            </button>
            
            {showDropdown && (
              <div className="dropdown-menu">
                <button 
                  className="dropdown-item"
                  onClick={handleCopyShareUrl}
                >
                  <i className="fas fa-link"></i>
                  Copy Room Link
                </button>
                
                <button 
                  className="dropdown-item danger"
                  onClick={handleLeaveRoom}
                >
                  <i className="fas fa-sign-out-alt"></i>
                  Leave Room
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div 
          className="dropdown-overlay"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </header>
  );
};

export default Header;
