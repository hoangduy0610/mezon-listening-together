import React, { useState } from 'react';

const ParticipantsList = ({ 
  participants, 
  currentUser, 
  isOwner, 
  onGrantPermission, 
  onRevokePermission, 
  onKickParticipant 
}) => {
  const [showParticipants, setShowParticipants] = useState(false);

  if (!participants || participants.length === 0) {
    return null;
  }

  const handlePermissionToggle = (participant) => {
    if (participant.hasPlaylistPermission) {
      onRevokePermission(participant.socketId);
    } else {
      onGrantPermission(participant.socketId);
    }
  };

  return (
    <div className="participants-section">
      <button 
        className="participants-toggle"
        onClick={() => setShowParticipants(!showParticipants)}
      >
        👥 Participants ({participants.length})
        <span className={`chevron ${showParticipants ? 'open' : ''}`}>▼</span>
      </button>

      {showParticipants && (
        <div className="participants-list">
          {participants.map((participant) => (
            <div key={participant.socketId} className="participant-item">
              <div className="participant-info">
                {participant.avatar && (
                  <img 
                    src={participant.avatar} 
                    alt={participant.username}
                    className="participant-avatar"
                  />
                )}
                <div className="participant-details">
                  <span className="participant-name">
                    {participant.username}
                    {participant.isOwner && <span className="owner-badge">👑</span>}
                    {participant.socketId === currentUser?.socketId && <span className="you-badge">(You)</span>}
                  </span>
                  {participant.hasPlaylistPermission && !participant.isOwner && (
                    <span className="permission-badge">🎵 Can edit playlist</span>
                  )}
                </div>
              </div>

              {isOwner && participant.socketId !== currentUser?.socketId && (
                <div className="participant-actions">
                  {!participant.isOwner && (
                    <>
                      <button
                        className={`permission-btn ${participant.hasPlaylistPermission ? 'revoke' : 'grant'}`}
                        onClick={() => handlePermissionToggle(participant)}
                        title={participant.hasPlaylistPermission ? 'Revoke playlist permission' : 'Grant playlist permission'}
                      >
                        {participant.hasPlaylistPermission ? '🚫' : '🎵'}
                      </button>
                      <button
                        className="kick-btn"
                        onClick={() => onKickParticipant(participant.socketId)}
                        title="Kick from room"
                      >
                        👢
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ParticipantsList;
