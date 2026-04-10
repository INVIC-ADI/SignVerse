export const CONFIG = {
  // Use your computer's local IP address provided (10.215.219.89)
  // Ensure the Flask server is running on the same network
  BASE_URL: 'http://10.215.219.89:5000',
  
  // Endpoints
  ENDPOINTS: {
    PREDICT: '/mobile/predict',
    CHAT: '/chat',
    SENTENCE: '/sentence',
    CLEAR: '/clear_sentence',
    SPACE: '/add_space',
    BACKSPACE: '/backspace',
    STT: '/stt',
    TRANSLATE: '/translate',
  },
  
  // Frame capture interval (ms)
  PREDICTION_INTERVAL: 1000,
};
