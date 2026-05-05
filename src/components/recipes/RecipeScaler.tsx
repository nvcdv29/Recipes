import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { ParsedIngredient, suggestSubstitutions, solveForInventory } from '../../services/recipeScaling';
import { RefreshCcw, Info, Search, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface RecipeScalerProps {
  originalServings: number;
  parsedIngredients: ParsedIngredient[];
  onScaleChange: (newServings: number) => void;
  originalIngredients: string[];
}

export const RecipeScaler = ({ originalServings, parsedIngredients, onScaleChange, originalIngredients }: RecipeScalerProps) => {
  const [servings, setServings] = useState(originalServings);
  const [substituteInfo, setSubstituteInfo] = useState<{ [ing: string]: string }>({});
  const [loadingSub, setLoadingSub] = useState<string | null>(null);
  
  const [solverInput, setSolverInput] = useState("");
  const [isSolving, setIsSolving] = useState(false);
  const [solverExpl, setSolverExpl] = useState<string | null>(null);

  useEffect(() => {
    onScaleChange(servings);
  }, [servings, onScaleChange]);

  const handleSuggest = async (name: string) => {
    if (substituteInfo[name]) {
      // Toggle off
      const next = { ...substituteInfo };
      delete next[name];
      setSubstituteInfo(next);
      return;
    }
    
    setLoadingSub(name);
    try {
      const result = await suggestSubstitutions(name);
      setSubstituteInfo(prev => ({ ...prev, [name]: result }));
    } catch (e: any) {
      toast.error(e.message || "Failed to load substitutions");
    } finally {
      setLoadingSub(null);
    }
  };

  const calculateAmount = (amount: number | null, isSpice: boolean) => {
    if (amount === null) return null;
    let factor = servings / originalServings;
    
    // Spices and salt don't scale linearly usually when scaling up significantly
    if (isSpice && factor > 1) {
      factor = 1 + (factor - 1) * 0.75; // 75% scaling for spices above 1x
    }
    
    const newAmount = amount * factor;
    // Rounding to nice numbers
    if (newAmount > 10) return Math.round(newAmount);
    if (newAmount > 1) return Math.round(newAmount * 10) / 10;
    return Math.round(newAmount * 100) / 100;
  };

  const handleSolve = async () => {
    if (!solverInput.trim()) return;
    setIsSolving(true);
    setSolverExpl(null);
    try {
      const { newServings, explanation } = await solveForInventory(solverInput, originalIngredients, originalServings);
      setServings(Math.max(1, Math.round(newServings)));
      setSolverExpl(explanation);
      toast.success("Servings updated based on inventory!");
    } catch (e: any) {
      toast.error(e.message || "Failed to solve");
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <div className="bg-surface-container-low p-6 rounded-3xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-lg mb-1 flex items-center gap-2">
            Portionen anpassen
          </h3>
          <p className="text-sm text-on-surface-variant">
            Passe das Rezept intelligent für deine Bedürfnisse an.
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-outline-variant/20 shadow-sm">
          <button 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface hover:bg-surface-container-high transition-colors text-primary"
            onClick={() => setServings(s => Math.max(1, s - 1))}
          >
            <Minus size={18} />
          </button>
          <div className="w-16 text-center font-bold text-xl">
            {servings}
          </div>
          <button 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
            onClick={() => setServings(s => s + 1)}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-outline-variant/10 shadow-sm">
        <div className="flex space-x-2">
          <input 
            type="text" 
            placeholder="z.B. Ich habe nur 2 Eier" 
            className="flex-1 px-4 py-2 bg-surface-container-low rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary/20"
            value={solverInput}
            onChange={e => setSolverInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSolve()}
          />
          <Button variant="primary" onClick={handleSolve} disabled={isSolving || !solverInput.trim()}>
            {isSolving ? <RefreshCcw className="animate-spin w-4 h-4" /> : 'Lösen'}
          </Button>
        </div>
        {solverExpl && (
          <div className="mt-3 text-sm text-primary bg-primary/5 p-3 rounded-xl border border-primary/10">
            {solverExpl}
          </div>
        )}
      </div>

      <ul className="space-y-3">
        {parsedIngredients.map((ing, i) => {
          const scaledAmount = calculateAmount(ing.amount, ing.isSpiceOrCondiment);
          const hasScaled = scaledAmount !== ing.amount;
          
          return (
            <li key={i} className="flex flex-col gap-2">
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full opacity-50" />
                  <span className="text-on-surface">
                    {scaledAmount !== null ? (
                      <span className="font-bold text-primary mr-1 bg-primary/5 px-2 py-0.5 rounded-md">
                        {scaledAmount} {ing.unit}
                      </span>
                    ) : ''}
                    <span className={scaledAmount === null ? '' : 'ml-1'}>{ing.name}</span>
                  </span>
                  
                  {ing.isSpiceOrCondiment && hasScaled && scaledAmount !== null && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1" title="Gewürze skalieren nicht immer linear. Bitte abschmecken!">
                      <Info size={10} /> Vorsichtig
                    </span>
                  )}
                </div>
                
                <button 
                  onClick={() => handleSuggest(ing.name)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-on-surface-variant hover:text-primary flex items-center gap-1 bg-surface-container-high px-2 py-1 rounded-lg"
                  title="Alternative finden"
                >
                  {loadingSub === ing.name ? <RefreshCcw size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
                  <span className="hidden sm:inline">Ersatz</span>
                </button>
              </div>

              {substituteInfo[ing.name] && (
                <div className="ml-5 p-3 bg-[#FFF8E1] rounded-xl text-sm border border-[#FFE082] text-amber-900 relative">
                  <div className="font-medium flex items-center gap-1 mb-1">
                    <Search size={14} className="text-amber-600" />
                    Ersatz für {ing.name}
                  </div>
                  <div className="text-amber-800/80 leading-relaxed whitespace-pre-wrap">{substituteInfo[ing.name]}</div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
