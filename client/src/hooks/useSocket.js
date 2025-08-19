import { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import { SOCKET_EVENTS, API_CONFIG } from '../config/constants';

/**
 * Custom hook for managing socket connection and room state
 */
export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  /**
   * Create and configure socket connection
   */
  const createSocket = useCallback(() => {
    try {
      const newSocket = io(API_CONFIG.baseURL, {
        timeout: 10000,
        transports: ['websocket', 'polling']
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        
        // Don't show connection toast - let the app handle success messaging
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        setIsConnected(false);
        
        // Only show disconnect toast for unexpected disconnections
        if (reason === 'io server disconnect') {
          toast.error('Disconnected by server');
        } else if (reason === 'transport error' || reason === 'ping timeout') {
          toast.error('Connection lost');
        }
        // Don't show toast for manual disconnects or transport close
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setConnectionError(error.message);
        
        reconnectAttempts.current += 1;
        
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          toast.error('Failed to connect to server. Please check your connection.');
          newSocket.disconnect();
        } else if (reconnectAttempts.current === 1) {
          // Only show retry message on first attempt to avoid spam
          toast.error('Connection failed. Retrying...');
        }
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('Reconnected after', attemptNumber, 'attempts');
        // Don't show reconnect toast to avoid notification spam
      });

      setSocket(newSocket);
      return newSocket;

    } catch (error) {
      console.error('Failed to create socket:', error);
      setConnectionError(error.message);
      toast.error('Failed to initialize connection');
      return null;
    }
  }, []);

  /**
   * Disconnect and cleanup socket
   */
  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setConnectionError(null);
    }
  }, [socket]);

  /**
   * Emit event with error handling
   */
  const emit = useCallback((event, data, callback) => {
    if (!socket || !isConnected) {
      console.warn('Socket not connected, cannot emit:', event);
      if (callback) callback(new Error('Not connected'));
      return false;
    }

    try {
      if (callback) {
        socket.emit(event, data, callback);
      } else {
        socket.emit(event, data);
      }
      return true;
    } catch (error) {
      console.error('Failed to emit event:', event, error);
      if (callback) callback(error);
      return false;
    }
  }, [socket, isConnected]);

  /**
   * Add event listener with automatic cleanup
   */
  const on = useCallback((event, handler) => {
    if (!socket) {
      console.warn('Socket not available for event:', event);
      return () => {};
    }

    socket.on(event, handler);
    
    // Return cleanup function
    return () => {
      socket.off(event, handler);
    };
  }, [socket]);

  /**
   * Remove event listener
   */
  const off = useCallback((event, handler) => {
    if (socket) {
      socket.off(event, handler);
    }
  }, [socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return {
    socket,
    isConnected,
    connectionError,
    createSocket,
    disconnect,
    emit,
    on,
    off
  };
};
