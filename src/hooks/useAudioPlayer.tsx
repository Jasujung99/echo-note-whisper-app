import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playingId: string | null;
}

export const useAudioPlayer = () => {
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playingId: null,
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.removeEventListener('ended', handleEnded);
      audioRef.current = null;
    }
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }
    setState(prev => ({ ...prev, isPlaying: false, playingId: null, currentTime: 0 }));
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setState(prev => ({ ...prev, duration: audioRef.current!.duration }));
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setState(prev => ({ ...prev, currentTime: audioRef.current!.currentTime }));
    }
  }, []);

  const handleEnded = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const play = useCallback(async (audioSource: string | Blob, id: string) => {
    try {
      // Stop current audio if playing
      cleanup();

      let audioUrl: string;
      if (audioSource instanceof Blob) {
        audioUrl = URL.createObjectURL(audioSource);
        currentUrlRef.current = audioUrl;
      } else {
        audioUrl = audioSource;
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);

      await audio.play();
      setState(prev => ({ ...prev, isPlaying: true, playingId: id }));
    } catch (error) {
      cleanup();
      throw error;
    }
  }, [cleanup, handleLoadedMetadata, handleTimeUpdate, handleEnded]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const stop = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const toggle = useCallback(async (audioSource: string | Blob, id: string) => {
    if (state.playingId === id && state.isPlaying) {
      pause();
    } else if (state.playingId === id && !state.isPlaying) {
      if (audioRef.current) {
        await audioRef.current.play();
        setState(prev => ({ ...prev, isPlaying: true }));
      }
    } else {
      await play(audioSource, id);
    }
  }, [state.playingId, state.isPlaying, play, pause]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    state,
    play,
    pause,
    stop,
    toggle,
  };
};