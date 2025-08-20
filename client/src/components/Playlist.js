import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import toast from 'react-hot-toast';

const Playlist = ({ playlist, currentVideo, onRemoveVideo, onReorderPlaylist }) => {
  // eslint-disable-next-line no-unused-vars
  const [draggedItem, setDraggedItem] = useState(null);

  const handleDragStart = (result) => {
    setDraggedItem(result.draggableId);
  };

  const handleDragEnd = (result) => {
    setDraggedItem(null);
    
    if (!result.destination) {
      return;
    }

    if (result.destination.index === result.source.index) {
      return;
    }

    const newPlaylist = Array.from(playlist);
    const [reorderedItem] = newPlaylist.splice(result.source.index, 1);
    newPlaylist.splice(result.destination.index, 0, reorderedItem);

    onReorderPlaylist(newPlaylist);
    toast.success('Playlist reordered!', { icon: '🔄' });
  };

  const handleRemoveVideo = (videoId, videoTitle) => {
    onRemoveVideo(videoId);
    toast.success(`Removed: ${videoTitle}`, { icon: '🗑️' });
  };

  if (playlist.length === 0) {
    return (
      <div className="playlist-section">
        <div className="playlist-header">
          <h2 className="playlist-title">
            <i className="fas fa-list" style={{ marginRight: '0.5rem' }}></i>
            Up Next
          </h2>
          <span className="playlist-count">0 videos</span>
        </div>
        
        <div className="empty-state">
          <i className="fas fa-music"></i>
          <p>No videos in playlist</p>
          <small style={{ color: '#999', marginTop: '0.5rem', display: 'block' }}>
            Search and add videos to get started
          </small>
        </div>
      </div>
    );
  }

  return (
    <div className="playlist-section">
      <div className="playlist-header">
        <h2 className="playlist-title">
          <i className="fas fa-list" style={{ marginRight: '0.5rem' }}></i>
          Up Next
        </h2>
        <span className="playlist-count">
          {playlist.length} video{playlist.length !== 1 ? 's' : ''}
        </span>
      </div>

      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Droppable droppableId="playlist">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="playlist"
              style={{
                backgroundColor: snapshot.isDraggingOver ? 'rgba(102, 126, 234, 0.05)' : 'transparent',
                borderRadius: '12px',
                padding: snapshot.isDraggingOver ? '0.5rem' : '0',
                transition: 'all 0.2s ease',
              }}
            >
              {playlist.map((video, index) => (
                <Draggable 
                  key={video.id} 
                  draggableId={video.id.toString()} 
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`playlist-item ${currentVideo?.id === video.id ? 'current' : ''}`}
                      style={{
                        ...provided.draggableProps.style,
                        transform: snapshot.isDragging 
                          ? `${provided.draggableProps.style?.transform} rotate(5deg)` 
                          : provided.draggableProps.style?.transform,
                        opacity: snapshot.isDragging ? 0.9 : 1,
                        boxShadow: snapshot.isDragging 
                          ? '0 8px 25px rgba(0, 0, 0, 0.15)' 
                          : 'none',
                        zIndex: snapshot.isDragging ? 1000 : 'auto',
                      }}
                    >
                      <div 
                        {...provided.dragHandleProps}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginRight: '0.5rem',
                          color: '#999',
                          cursor: 'grab'
                        }}
                        onMouseDown={() => setDraggedItem(video.id)}
                      >
                        <i className="fas fa-grip-vertical"></i>
                      </div>

                      <img 
                        src={video.thumbnail} 
                        alt={video.title}
                        className="playlist-thumbnail"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNDUiIHZpZXdCb3g9IjAgMCA2MCA0NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjQ1IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAyMUwzNiAyN0wyNCAzM1YyMVoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                        }}
                      />
                      
                      <div className="playlist-info">
                        <div className="playlist-item-title" title={video.title}>
                          {video.title}
                        </div>
                        <div className="playlist-item-channel">
                          {video.channelTitle}
                        </div>
                      </div>

                      <div className="playlist-actions">
                        <button
                          className="action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveVideo(video.id, video.title);
                          }}
                          title="Remove from playlist"
                          style={{ 
                            background: 'rgba(255, 59, 59, 0.1)',
                            color: currentVideo?.id === video.id ? 'white' : '#ff3b3b'
                          }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>

                      {/* Position indicator */}
                      <div style={{
                        position: 'absolute',
                        top: '0.5rem',
                        left: '0.5rem',
                        background: 'rgba(0, 0, 0, 0.5)',
                        color: 'white',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        zIndex: 10
                      }}>
                        #{index + 1}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div style={{ 
        marginTop: '1rem', 
        padding: '0.75rem', 
        background: 'rgba(102, 126, 234, 0.05)', 
        borderRadius: '8px',
        fontSize: '0.8rem',
        color: '#666',
        textAlign: 'center'
      }}>
        <i className="fas fa-info-circle" style={{ marginRight: '0.5rem' }}></i>
        Drag to reorder • Videos auto-remove after playing
      </div>
    </div>
  );
};

export default Playlist;
