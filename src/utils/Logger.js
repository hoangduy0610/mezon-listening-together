class Logger {
  constructor(module = 'App') {
    this.module = module;
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  /**
   * Format log message with timestamp and module
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @returns {string} Formatted message
   */
  format(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.module}]`;
    
    if (Object.keys(meta).length > 0) {
      return `${prefix} ${message} ${JSON.stringify(meta)}`;
    }
    
    return `${prefix} ${message}`;
  }

  /**
   * Log info message
   * @param {string} message - Message to log
   * @param {Object} meta - Additional metadata
   */
  info(message, meta = {}) {
    console.log(this.format('info', message, meta));
  }

  /**
   * Log error message
   * @param {string} message - Message to log
   * @param {Object} meta - Additional metadata
   */
  error(message, meta = {}) {
    console.error(this.format('error', message, meta));
  }

  /**
   * Log warning message
   * @param {string} message - Message to log
   * @param {Object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    console.warn(this.format('warn', message, meta));
  }

  /**
   * Log debug message (only in development)
   * @param {string} message - Message to log
   * @param {Object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    if (this.isDevelopment) {
      console.log(this.format('debug', message, meta));
    }
  }

  /**
   * Create child logger with extended module name
   * @param {string} childModule - Child module name
   * @returns {Logger} New logger instance
   */
  child(childModule) {
    return new Logger(`${this.module}:${childModule}`);
  }
}

module.exports = Logger;
