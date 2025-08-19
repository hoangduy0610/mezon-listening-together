import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_CONFIG, APP_CONFIG } from '../config/constants';

/**
 * Custom hook for YouTube video search functionality
 */
export const useYouTubeSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Refs for managing async operations
  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  /**
   * Validate search query
   */
  const validateQuery = useCallback((query) => {
    if (!query || query.trim().length === 0) {
      return 'Please enter a search term';
    }
    
    if (query.length > APP_CONFIG.maxSearchQueryLength) {
      return `Search query too long (max ${APP_CONFIG.maxSearchQueryLength} characters)`;
    }
    
    // Check for potentially problematic characters
    if (/[<>"/\\]/.test(query)) {
      return 'Search query contains invalid characters';
    }
    
    return null;
  }, []);

  /**
   * Perform YouTube search
   */
  const performSearch = useCallback(async (query, options = {}) => {
    const { skipValidation = false } = options;
    
    // Validate query unless skipped
    if (!skipValidation) {
      const validationError = validateQuery(query);
      if (validationError) {
        toast.error(validationError);
        setSearchError(validationError);
        return [];
      }
    }

    // Cancel previous search if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await axios.get(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.search}`, {
        params: { q: query.trim() },
        signal: abortControllerRef.current.signal,
        timeout: 10000 // 10 second timeout
      });

      const results = response.data || [];
      setSearchResults(results);
      setHasSearched(true);

      if (results.length === 0) {
        const message = 'No videos found. Try different keywords.';
        toast(message, { icon: '🔍' });
        setSearchError(message);
      } else {
        setSearchError(null);
      }

      return results;

    } catch (error) {
      // Don't handle aborted requests
      if (axios.isCancel(error) || error.name === 'AbortError') {
        return [];
      }

      console.error('Search error:', error);
      
      let errorMessage = 'Failed to search videos. Please try again.';
      let toastMessage = errorMessage;

      if (error.response) {
        switch (error.response.status) {
          case 400:
            errorMessage = 'Invalid search query';
            break;
          case 429:
            errorMessage = 'Too many requests. Please wait and try again.';
            toastMessage = 'Rate limit exceeded. Please wait a moment.';
            break;
          case 500:
            if (error.response.data?.error?.includes('API key')) {
              errorMessage = 'YouTube API not configured';
              toastMessage = 'Server configuration error. Please contact support.';
            } else {
              errorMessage = 'Server error occurred';
            }
            break;
          default:
            errorMessage = `Server error: ${error.response.status}`;
        }
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Search timeout. Please try again.';
        toastMessage = 'Search took too long. Please try again.';
      } else if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
        errorMessage = 'Network error. Check your connection.';
        toastMessage = 'Please check your internet connection.';
      }

      setSearchError(errorMessage);
      toast.error(toastMessage);
      return [];

    } finally {
      setIsSearching(false);
      abortControllerRef.current = null;
    }
  }, [validateQuery]);

  /**
   * Handle search with debouncing
   */
  const handleSearch = useCallback((query = searchQuery) => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Validate immediately for UX feedback
    const validationError = validateQuery(query);
    if (validationError) {
      setSearchError(validationError);
      return;
    }

    setSearchError(null);

    // Debounce the actual search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query, { skipValidation: true });
    }, APP_CONFIG.searchDebounceMs);
  }, [searchQuery, validateQuery, performSearch]);

  /**
   * Handle search form submission
   */
  const handleSearchSubmit = useCallback((e) => {
    e?.preventDefault?.();
    
    // Clear timeout to perform immediate search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  /**
   * Update search query
   */
  const updateSearchQuery = useCallback((query) => {
    setSearchQuery(query);
    
    // Clear results if query is empty
    if (!query.trim()) {
      setSearchResults([]);
      setSearchError(null);
      setHasSearched(false);
    }
  }, []);

  /**
   * Clear search results and query
   */
  const clearSearch = useCallback(() => {
    // Cancel any ongoing search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Clear timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
    setHasSearched(false);
    setIsSearching(false);
  }, []);

  /**
   * Retry last search
   */
  const retrySearch = useCallback(() => {
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  }, [searchQuery, performSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    searchQuery,
    searchResults,
    isSearching,
    searchError,
    hasSearched,
    updateSearchQuery,
    handleSearch,
    handleSearchSubmit,
    clearSearch,
    retrySearch,
    validateQuery
  };
};
