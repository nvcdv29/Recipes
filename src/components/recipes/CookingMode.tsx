import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  CheckCircle2, 
  Circle, 
  Timer, 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  Check 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Recipe } from '../../types';

interface CookingModeProps {
  recipe: Recipe;
  onClose: () => void;
}

export const CookingMode = ({ recipe, onClose }: CookingModeProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock error:', err);
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock) {
        wakeLock.release().catch(console.warn);
      }
    };
  }, []);

  const totalSteps = recipe.instructions.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const currentText = recipe.instructions[currentStep];

  // Extraction of timer
  const extractTime = (text: string) => {
    const match = text.match(/(\d+)\s*(minuten|minute|min|m|stunden|stunde|h)\b/i);
    if (match) {
      const val = parseInt(match[1]);
      if (match[2].toLowerCase().startsWith('h') || match[2].toLowerCase().startsWith('stunde')) {
        return val * 60; // to minutes
      }
      return val;
    }
    return null;
  };

  const detectedMinutes = extractTime(currentText);

  // Timer State
  const [timerLeft, setTimerLeft] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);

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

  const toggleIngredient = (index: number) => {
    const newSet = new Set(checkedIngredients);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setCheckedIngredients(newSet);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      className="fixed inset-0 z-[100] bg-surface flex flex-col overflow-hidden"
      style={{ isolation: 'isolate' }}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-outline-variant/10 shadow-sm z-10 shrink-0">
        <h2 className="text-xl font-serif font-bold text-on-surface line-clamp-1 flex-1">
          {recipe.title}
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-on-surface-variant">
            Schritt {currentStep + 1} von {totalSteps}
          </span>
          <button 
            onClick={onClose}
            className="p-3 bg-surface-container-low hover:bg-surface-container-high rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>
      <div className="w-full h-1.5 bg-surface-container-low shrink-0 relative">
        <motion.div 
          className="absolute inset-y-0 left-0 bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "easeInOut" }}
        />
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Ingredients Panel */}
        <div className="w-full md:w-80 lg:w-96 bg-surface-container-low border-r border-outline-variant/10 flex flex-col shrink-0">
          <div className="p-6 overflow-y-auto flex-1">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-on-surface">
              <CheckCircle2 size={20} className="text-primary" />
              Zutaten
            </h3>
            <ul className="space-y-4 text-left">
              {recipe.ingredients.map((ing: string, i: number) => {
                const checked = checkedIngredients.has(i);
                return (
                  <li 
                    key={i} 
                    className={cn(
                      "flex items-start gap-3 cursor-pointer p-3 rounded-xl transition-all",
                      checked ? "bg-surface text-on-surface-variant/50 line-through" : "hover:bg-surface"
                    )}
                    onClick={() => toggleIngredient(i)}
                  >
                    <div className="mt-1 shrink-0">
                      {checked ? <CheckCircle2 size={20} className="text-primary" /> : <Circle size={20} className="text-outline-variant" />}
                    </div>
                    <span className="text-base leading-snug">{ing}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Instruction Panel */}
        <div className="flex-1 bg-white p-8 md:p-16 flex flex-col relative overflow-y-auto">
          <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col justify-center">
            
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-12"
            >
              <div className="flex items-start gap-4 md:gap-8 mb-8">
                <span className="text-6xl md:text-8xl font-serif font-bold text-primary/10 select-none leading-none">
                  {(currentStep + 1).toString().padStart(2, '0')}
                </span>
                <p className="text-2xl md:text-4xl text-on-surface font-serif font-bold leading-relaxed pt-2 md:pt-4 text-left">
                  {currentText}
                </p>
              </div>

              {/* Timer UI */}
              {(detectedMinutes !== null || timerLeft !== null) && (
                <div className="mt-8 flex flex-col items-start gap-4 p-6 bg-surface-container-low rounded-3xl border border-outline-variant/10">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                      <Timer size={32} />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">
                        {timerLeft !== null 
                          ? `${Math.floor(timerLeft / 60)}:${(timerLeft % 60).toString().padStart(2, '0')}` 
                          : `${detectedMinutes} Minuten`}
                      </h4>
                      <p className="text-sm text-on-surface-variant font-medium">Timer für diesen Schritt</p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-2">
                    {timerLeft === null ? (
                      <button 
                        onClick={() => {
                          setTimerLeft(detectedMinutes! * 60);
                          setTimerRunning(true);
                        }}
                        className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors"
                      >
                        <Play size={20} className="fill-white" />
                        Starten
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={() => setTimerRunning(!timerRunning)}
                          className={cn(
                            "px-6 py-3 text-white rounded-xl font-bold flex items-center gap-2 transition-colors",
                            timerRunning ? "bg-[#FF3B30] hover:bg-[#FF3B30]/90" : "bg-primary hover:bg-primary/90"
                          )}
                        >
                          {timerRunning ? (
                            <><Pause size={20} className="fill-white" /> Pause</>
                          ) : (
                            <><Play size={20} className="fill-white" /> Fortsetzen</>
                          )}
                        </button>
                        <button 
                          onClick={() => {
                            setTimerLeft(null);
                            setTimerRunning(false);
                          }}
                          className="px-6 py-3 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant rounded-xl font-bold flex items-center gap-2 transition-colors"
                        >
                          <X size={20} />
                          Zurücksetzen
                        </button>
                      </>
                    )}
                  </div>
                  {timerLeft === 0 && (
                    <div className="text-[#4CAF50] font-bold text-lg mt-2 flex items-center gap-2 animate-pulse">
                      <CheckCircle2 size={24} />
                      Zeit abgelaufen!
                    </div>
                  )}
                </div>
              )}
            </motion.div>

          </div>

          {/* Navigation Controls */}
          <div className="shrink-0 max-w-3xl w-full mx-auto flex items-center justify-between mt-auto pt-8 border-t border-outline-variant/10 bg-white">
            <button 
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="p-5 flex items-center gap-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft size={28} />
              <span className="text-lg font-bold hidden sm:block">Zurück</span>
            </button>
            
            {currentStep < totalSteps - 1 ? (
              <button 
                onClick={() => setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))}
                className="p-5 px-10 flex items-center gap-3 rounded-2xl bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                <span className="text-xl font-bold">Nächster Schritt</span>
                <ChevronRight size={28} />
              </button>
            ) : (
              <button 
                onClick={onClose}
                className="p-5 px-10 flex items-center gap-3 rounded-2xl bg-[#4CAF50] text-white hover:bg-[#43A047] transition-all shadow-lg shadow-[#4CAF50]/20"
              >
                <span className="text-xl font-bold">Fertig!</span>
                <Check size={28} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
