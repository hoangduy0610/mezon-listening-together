import React, { useState, useEffect } from "react";

const Controls = ({
  isPlaying,
  volume,
  onPlay,
  onPause,
  onSkip,
  onVolumeChange,
  onToggleMute,
  hasVideo,
  isConnected,
  canControl = true,
}) => {
  const [localVolume, setLocalVolume] = useState(volume);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);

  // Sync local volume with prop
  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

  const handlePlayPause = () => {
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setLocalVolume(newVolume);
    onVolumeChange(newVolume);

    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const handleMuteToggle = () => {
    if (onToggleMute) {
      // Use the prop function if provided
      onToggleMute();
    } else {
      // Fallback to local implementation
      if (isMuted) {
        const volumeToRestore = previousVolume > 0 ? previousVolume : 50;
        setLocalVolume(volumeToRestore);
        onVolumeChange(volumeToRestore);
        setIsMuted(false);
      } else {
        setPreviousVolume(localVolume);
        setLocalVolume(0);
        onVolumeChange(0);
        setIsMuted(true);
      }
    }
  };

  const getVolumeIcon = () => {
    if (isMuted || localVolume === 0) {
      return "fas fa-volume-mute";
    } else if (localVolume < 50) {
      return "fas fa-volume-down";
    } else {
      return "fas fa-volume-up";
    }
  };

  const isControlsDisabled = !isConnected || !hasVideo || !canControl;

  return (
    <div className="controls">
      {/* Connection Status */}
      {!isConnected && (
        <div className="controls-offline">
          <i className="fas fa-wifi-slash"></i>
          <span>Offline - Controls disabled</span>
        </div>
      )}

      {isConnected && !canControl && (
        <div className="controls-offline">
          <i className="fas fa-lock"></i>
          <span>You need playlist permission to control playback</span>
        </div>
      )}

      {/* Play/Pause Button */}
      <button
        className="control-btn"
        onClick={handlePlayPause}
        disabled={isControlsDisabled}
        title={
          !isConnected 
            ? "Connect to control playback"
            : !canControl
            ? "You need playlist permission to control playback"
            : isPlaying
            ? "Pause"
            : "Play"
        }
        style={{
          fontSize: "1.4rem",
          opacity: isControlsDisabled ? 0.3 : 1,
        }}
      >
        <i className={isPlaying ? "fas fa-pause" : "fas fa-play"}></i>
      </button>

      {/* Skip Button */}
      <button
        className="control-btn"
        onClick={onSkip}
        disabled={isControlsDisabled}
        title={
          !isConnected 
            ? "Connect to skip videos" 
            : !canControl
            ? "You need playlist permission to skip videos"
            : "Skip to next video"
        }
        style={{
          opacity: isControlsDisabled ? 0.3 : 1,
        }}
      >
        <i className="fas fa-forward"></i>
      </button>

      {/* Current Status Indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          color: "#666",
          fontSize: "0.9rem",
          marginLeft: "1rem",
        }}
      >
        {hasVideo ? (
          <>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: isPlaying ? "#4ade80" : "#ef4444",
                animation: isPlaying ? "pulse 2s infinite" : "none",
              }}
            ></div>
            <span>{isPlaying ? "Playing" : "Paused"}</span>
          </>
        ) : (
          <>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#94a3b8",
              }}
            ></div>
            <span>No video</span>
          </>
        )}
      </div>

      {/* Volume Control */}
      <div className="volume-control">
        <button
          className="control-btn"
          onClick={handleMuteToggle}
          title={isMuted ? "Unmute" : "Mute"}
          style={{
            fontSize: "1rem",
            width: "40px",
            height: "40px",
          }}
        >
          <i className={getVolumeIcon()}></i>
        </button>

        <input
          type="range"
          min="0"
          max="100"
          value={localVolume}
          onChange={handleVolumeChange}
          className="volume-slider"
          title={`Volume: ${localVolume}%`}
          style={{
            background: `linear-gradient(to right, #667eea 0%, #667eea ${localVolume}%, #e1e5e9 ${localVolume}%, #e1e5e9 100%)`,
          }}
        />

        <span
          style={{
            fontSize: "0.8rem",
            color: "#666",
            minWidth: "30px",
            textAlign: "right",
          }}
        >
          {localVolume}%
        </span>
      </div>

      {/* Custom styles are handled via CSS classes in index.css */}
    </div>
  );
};

export default Controls;
