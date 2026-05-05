import { useState, useRef } from 'react';
import { Search, Sparkles, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { useRecipeStore as useRecipes } from '../../stores/recipeStore';
import { Recipe } from '../../types';
import { Button } from '../ui/Button';
import { toast } from 'sonner';

export const SmartSearchBar = ({ onResults }: { onResults: (results: { recipes: Recipe[], reasoning: string, filter?: any } | null) => void }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { recipes } = useRecipes();

  const handleSearch = async () => {
    if (!query.trim()) {
      onResults(null);
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/recipes/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          context: {
            season: new Date().getMonth() > 2 && new Date().getMonth() < 8 ? 'Summer' : 'Winter'
          },
          recipes // Pass active recipes to calculate similarity on the backend
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Gemini API key is missing. Please configure it in the Secrets panel and restart the application.");
        }
        throw new Error(data.error || "Failed to perform smart search");
      }
      
      onResults({
        recipes: data.recipes,
        reasoning: data.reasoning,
        filter: data.structuredFilter
      });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to perform smart search");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64 = event.target?.result as string;
          const response = await fetch('/api/recipes/smart-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              imageBase64: base64,
              recipes
            })
          });
          
          const data = await response.json();
          if (!response.ok) {
            if (response.status === 401) {
              throw new Error("Gemini API key is missing. Please configure it in the Secrets panel and restart the application.");
            }
            throw new Error(data.error || "Failed to process image search");
          }
          
          onResults({
            recipes: data.recipes,
            reasoning: data.reasoning
          });
        } catch (error: any) {
          console.error(error);
          toast.error(error.message);
          setIsLoading(false);
        }
      };
      reader.onerror = () => {
        toast.error("Failed to read image file");
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error(error);
      toast.error("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full relative shadow-sm rounded-2xl bg-surface-container-low p-2">
      <div className="flex items-center gap-2">
        <Sparkles className="text-secondary ml-2" size={20} />
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Natural language search (e.g. 'What can I make with potatoes?')"
          className="flex-1 bg-transparent border-none py-2 px-2 focus:ring-0 outline-none text-on-surface"
        />
        
        {query && !isLoading && (
          <button onClick={() => { setQuery(''); onResults(null); }} className="p-2 text-on-surface-variant hover:text-on-surface">
            <X size={18} />
          </button>
        )}

        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleImageUpload}
        />
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-on-surface-variant hover:text-primary transition-colors"
          title="Search by Image"
        >
          <ImageIcon size={20} />
        </button>

        <Button 
          onClick={handleSearch} 
          disabled={isLoading}
          className="rounded-xl px-4 py-2 bg-secondary text-on-secondary hover:bg-secondary/90 transition-colors h-10"
        >
          {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Ask AI'}
        </Button>
      </div>
    </div>
  );
};
