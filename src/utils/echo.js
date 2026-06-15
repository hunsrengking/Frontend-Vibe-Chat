import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

let echoInstance = null;
let currentToken = null;

/**
 * Get or create Laravel Echo instance dynamically.
 * Recreates the instance if the Sanctum token changes.
 */
export default function getEcho(token) {
  if (!token) {
    if (echoInstance) {
      echoInstance.disconnect();
      echoInstance = null;
      currentToken = null;
    }
    return null;
  }

  // If token changes, recreate instance with updated auth headers
  if (echoInstance && currentToken !== token) {
    echoInstance.disconnect();
    echoInstance = null;
  }

  if (!echoInstance) {
    currentToken = token;

    const PUSHER_KEY = import.meta.env.VITE_PUSHER_APP_KEY || 'anonymous_social_app_key';
    const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_APP_CLUSTER || 'ap1';
    
    // Auth URL defaults to local server broadcasting auth
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

    echoInstance = new Echo({
      broadcaster: 'pusher',
      key: PUSHER_KEY,
      cluster: PUSHER_CLUSTER,
      forceTLS: true,
      authEndpoint: `${API_URL}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    });
  }

  return echoInstance;
}
