// Sound effect URLs - Using more reliable CDN URLs
export const SOUND_EFFECTS = {
  CALLED: 'https://cdn.jsdelivr.net/gh/mixkit-co/sounds@master/preview/mixkit-positive-notification-951.mp3',
  SEATED: 'https://cdn.jsdelivr.net/gh/mixkit-co/sounds@master/preview/mixkit-achievement-bell-600.mp3',
  CANCELLED: 'https://cdn.jsdelivr.net/gh/mixkit-co/sounds@master/preview/mixkit-negative-guitar-tone-2324.mp3'
} as const;

// Audio instances cache
const audioCache: { [key: string]: HTMLAudioElement } = {};

// Preload sounds
export function preloadSounds() {
  Object.entries(SOUND_EFFECTS).forEach(([status, url]) => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = url;
    audioCache[status] = audio;
  });
}

// Play sound effect with better error handling
export function playSound(status: keyof typeof SOUND_EFFECTS) {
  try {
    const audio = audioCache[status];
    if (!audio) {
      console.warn('Audio not preloaded:', status);
      return;
    }

    // Create a new promise that resolves when the sound is loaded
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Sound is playing
          audio.currentTime = 0;
        })
        .catch(error => {
          console.error('Error playing sound:', {
            status,
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error
          });
        });
    }
  } catch (error) {
    console.error('Error in playSound:', {
      status,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    });
  }
}