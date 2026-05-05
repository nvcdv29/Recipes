import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  CheckCircle2, 
  Circle, 
  Timer, 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  Check,
  Maximize2,
  Minimize2,
  List
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Recipe } from '../../types';
import { useCookingMode } from '../../hooks/useCookingMode';
import { useState, useRef, useEffect } from 'react';

interface CookingModeProps {
  recipe: Recipe;
  onClose: () => void;
}

export const CookingMode = ({ recipe, onClose }: CookingModeProps) => {
  const { state, actions } = useCookingMode(recipe);
  const [showStepList, setShowStepList] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    currentStep,
    totalSteps,
    checkedIngredients,
    timerLeft,
    timerRunning,
    isFullscreen,
    detectedMinutes
  } = state;

  const currentText = recipe.instructions[currentStep];
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Scroll to top of instruction panel when step changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      className="fixed inset-0 z-[100] bg-surface flex flex-col overflow-hidden"
      style={{ isolation: 'isolate' }}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-surface-container-low border-b border-outline-variant/10 shadow-sm z-10 shrink-0">
        <h2 className="text-xl font-serif font-bold text-on-surface line-clamp-1 flex-1">
          {recipe.title}
        </h2>
        <div className="flex items-center gap-2 sm:gap-4 relative text-on-surface-variant z-50">
          <button
            onClick={() => setShowStepList(!showStepList)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-surface-container-low hover:bg-surface-container-high rounded-xl font-medium transition-colors"
          >
            <List size={20} />
            <span className="hidden sm:inline">Schritt {currentStep + 1} von {totalSteps}</span>
            <span className="sm:hidden">{currentStep + 1}/{totalSteps}</span>
          </button>

          {/* Jump to step dropdown */}
          <AnimatePresence>
            {showStepList && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 top-full mt-2 w-64 max-h-80 overflow-y-auto bg-white dark:bg-surface-container-low rounded-2xl shadow-xl border border-outline-variant/10 py-2 z-50"
              >
                {recipe.instructions.map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      actions.jumpToStep(idx);
                      setShowStepList(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-surface-container-low transition-colors",
                      idx === currentStep ? "text-primary bg-primary/5 font-bold" : "text-on-surface"
                    )}
                  >
                    <span className="shrink-0 mt-0.5">{idx + 1}.</span>
                    <span className="line-clamp-2 text-sm">{step}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={actions.toggleFullscreen}
            className="hidden sm:flex p-3 bg-surface-container-low hover:bg-surface-container-high rounded-full transition-colors"
            title="Vollbild"
          >
            {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
          </button>
          
          <button 
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              }
              onClose();
            }}
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

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
        {/* Click outside target to close dropdown */}
        {showStepList && (
          <div 
            className="absolute inset-0 z-40 bg-transparent" 
            onClick={() => setShowStepList(false)}
          />
        )}

        {/* Ingredients Panel */}
        <div className="w-full md:w-80 lg:w-96 bg-surface-container-low border-r border-outline-variant/10 flex flex-col shrink-0">
          <div className="p-4 md:p-6 overflow-y-auto flex-1">
            <h3 className="text-lg font-bold mb-4 md:mb-6 flex items-center gap-2 text-on-surface">
              <CheckCircle2 size={20} className="text-primary" />
              Zutaten
            </h3>
            <ul className="space-y-3 md:space-y-4 text-left">
              {recipe.ingredients.map((ing: string, i: number) => {
                const checked = checkedIngredients.has(i);
                return (
                  <li 
                    key={i} 
                    className={cn(
                      "flex items-start gap-3 cursor-pointer p-3 rounded-xl transition-all",
                      checked ? "bg-surface text-on-surface-variant/50 line-through" : "hover:bg-white md:hover:bg-surface"
                    )}
                    onClick={() => actions.toggleIngredient(i)}
                  >
                    <div className="mt-1 shrink-0">
                      {checked ? <CheckCircle2 size={20} className="text-primary" /> : <Circle size={20} className="text-outline-variant/50" />}
                    </div>
                    <span className="text-base md:text-[15px] leading-snug">{ing}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Instruction Panel */}
        <div 
          className="flex-1 bg-white dark:bg-surface-container-low p-6 md:p-16 flex flex-col relative overflow-y-auto"
          ref={scrollContainerRef}
        >
          <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col justify-center min-h-[50vh]">
            
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-8 md:mb-12"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4 md:gap-8 mb-8">
                <span className="text-6xl md:text-8xl font-serif font-bold text-primary/10 select-none leading-none shrink-0">
                  {(currentStep + 1).toString().padStart(2, '0')}
                </span>
                <p className="text-2xl md:text-4xl text-on-surface font-serif font-bold leading-relaxed pt-2 md:pt-4 text-left">
                  {currentText}
                </p>
              </div>

              {/* Timer UI */}
              {(detectedMinutes !== null || timerLeft !== null) && (
                <div className="mt-8 flex flex-col sm:flex-row sm:items-center items-start gap-4 p-5 md:p-6 bg-surface-container-low rounded-3xl border border-outline-variant/10">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 md:p-4 bg-primary/10 rounded-2xl text-primary shrink-0">
                      <Timer size={32} />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">
                        {timerLeft !== null 
                          ? `${Math.floor(timerLeft / 60)}:${(timerLeft % 60).toString().padStart(2, '0')}` 
                          : `${detectedMinutes} Minuten`}
                      </h4>
                      <p className="text-sm text-on-surface-variant font-medium hidden sm:block">Timer für diesen Schritt</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 md:gap-3 mt-2 sm:mt-0 w-full sm:w-auto">
                    {timerLeft === null ? (
                      <button 
                        onClick={actions.startTimer}
                        className="flex-1 sm:flex-none justify-center px-4 md:px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors"
                      >
                        <Play size={20} className="fill-white" />
                        Starten
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={actions.toggleTimer}
                          className={cn(
                            "flex-1 sm:flex-none justify-center px-4 md:px-6 py-3 text-white rounded-xl font-bold flex items-center gap-2 transition-colors",
                            timerRunning ? "bg-[#FF3B30] hover:bg-[#FF3B30]/90" : "bg-primary hover:bg-primary/90"
                          )}
                        >
                          {timerRunning ? (
                            <><Pause size={20} className="fill-white" /> Pause</>
                          ) : (
                            <><Play size={20} className="fill-white" /> Weiter</>
                          )}
                        </button>
                        <button 
                          onClick={actions.resetTimer}
                          className="px-4 py-3 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant rounded-xl font-bold flex items-center justify-center transition-colors shrink-0"
                          title="Zurücksetzen"
                        >
                          <X size={20} />
                        </button>
                      </>
                    )}
                  </div>
                  {timerLeft === 0 && (
                    <div className="text-[#4CAF50] font-bold text-lg w-full sm:hidden flex items-center gap-2 animate-pulse mt-2">
                      <CheckCircle2 size={24} />
                      Zeit abgelaufen!
                    </div>
                  )}
                </div>
              )}
              {/* Desktop timer finish message */}
              {timerLeft === 0 && (
                <div className="text-[#4CAF50] font-bold text-lg mt-4 hidden sm:flex items-center gap-2 animate-pulse">
                  <CheckCircle2 size={24} />
                  Zeit abgelaufen!
                </div>
              )}
            </motion.div>
          </div>

          {/* Navigation Controls */}
          <div className="shrink-0 max-w-3xl w-full mx-auto flex items-center flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between mt-auto pt-6 border-t border-outline-variant/10 bg-white dark:bg-surface-container-low">
            <button 
              onClick={actions.prevStep}
              disabled={currentStep === 0}
              className="w-full sm:w-auto p-4 md:p-5 flex items-center justify-center gap-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft size={28} />
              <span className="text-lg font-bold">Zurück</span>
            </button>
            
            {currentStep < totalSteps - 1 ? (
              <button 
                onClick={actions.nextStep}
                className="w-full sm:w-auto p-4 md:p-5 px-6 md:px-10 flex flex-row-reverse sm:flex-row justify-center items-center gap-3 rounded-2xl bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                <span className="text-xl md:text-[22px] font-bold">Nächster Schritt</span>
                <ChevronRight size={28} />
              </button>
            ) : (
              <button 
                onClick={onClose}
                className="w-full sm:w-auto p-4 md:p-5 px-6 md:px-10 flex items-center justify-center gap-3 rounded-2xl bg-[#4CAF50] text-white hover:bg-[#43A047] transition-all shadow-lg shadow-[#4CAF50]/20"
              >
                <span className="text-xl md:text-[22px] font-bold">Fertig!</span>
                <Check size={28} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
