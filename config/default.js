module.exports = {
  server: {
    port: process.env.PORT || 5000,
    corsOrigin: process.env.CLIENT_URL || (process.env.NODE_ENV === 'production' ? false : 'http://localhost:3000'),
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY,
    searchMaxResults: 10
  },
  
  sync: {
    periodicSyncInterval: 10000, // 10 seconds
    timeUpdateInterval: 2000,    // 2 seconds
    syncThresholds: {
      initial: 2,    // seconds
      periodic: 4,   // seconds
      manual: 3      // seconds
    }
  },
  
  player: {
    defaultVolume: 50,
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      rel: 0,
      showinfo: 0,
      modestbranding: 1,
      playsinline: 1,
      enablejsapi: 1
    }
  },
  
  app: {
    name: 'Listen Together',
    description: 'Synchronized YouTube listening platform'
  }
};
