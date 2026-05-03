import { useState, useCallback, useEffect } from 'react';
import { Recipe } from '../types';

export interface CookingModeState {
  currentStep: number;
  totalSteps: number;
  checkedIngredients: Set<number>;
  timerLeft: number | null;
  timerRunning: boolean;
  isFullscreen: boolean;
  detectedMinutes: number | null;
}

export function useCookingMode(recipe: Recipe) {
  const [currentStep, setCurrentStep] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [timerLeft, setTimerLeft] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const totalSteps = recipe.instructions.length;

  const currentText = recipe.instructions[currentStep];

  const extractTime = useCallback((text: string) => {
    if (!text) return null;
    const match = text.match(/(\d+)\s*(minuten|minute|min|m|stunden|stunde|h)\b/i);
    if (match) {
      const val = parseInt(match[1]);
      if (match[2].toLowerCase().startsWith('h') || match[2].toLowerCase().startsWith('stunde')) {
        return val * 60; // to minutes
      }
      return val;
    }
    return null;
  }, []);

  const detectedMinutes = extractTime(currentText);

  useEffect(() => {
    setTimerLeft(null);
    setTimerRunning(false);
  }, [currentStep]);

  useEffect(() => {
    let interval: any;
    if (timerRunning && timerLeft !== null && timerLeft > 0) {
      interval = setInterval(() => {
        setTimerLeft(t => (t !== null ? t - 1 : null));
      }, 1000);
    } else if (timerLeft === 0) {
      setTimerRunning(false);
      try {
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
      } catch (e) {}
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerLeft]);

  // Keep screen awake
  useEffect(() => {
    let wakeLock: any = null;
    let isMounted = true;
    
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock error:', err);
      }
    };
    
    if (document.visibilityState === 'visible') {
      requestWakeLock();
    }
    
    const visibilityListener = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        requestWakeLock();
      }
    };
    
    document.addEventListener('visibilitychange', visibilityListener);
    
    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', visibilityListener);
      if (wakeLock !== null) {
        wakeLock.release().catch(console.warn);
      }
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.warn);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(console.warn);
      }
    }
  };

  const toggleIngredient = useCallback((index: number) => {
    setCheckedIngredients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
      return newSet;
    });
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(totalSteps - 1, prev + 1));
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const jumpToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < totalSteps) {
      setCurrentStep(stepIndex);
    }
  }, [totalSteps]);

  const startTimer = useCallback(() => {
    if (detectedMinutes !== null) {
      setTimerLeft(detectedMinutes * 60);
      setTimerRunning(true);
    }
  }, [detectedMinutes]);

  const toggleTimer = useCallback(() => {
    setTimerRunning(prev => !prev);
  }, []);

  const resetTimer = useCallback(() => {
    setTimerLeft(null);
    setTimerRunning(false);
  }, []);

  return {
    state: {
      currentStep,
      totalSteps,
      checkedIngredients,
      timerLeft,
      timerRunning,
      isFullscreen,
      detectedMinutes
    },
    actions: {
      toggleIngredient,
      nextStep,
      prevStep,
      jumpToStep,
      startTimer,
      toggleTimer,
      resetTimer,
      toggleFullscreen
    }
  };
}
