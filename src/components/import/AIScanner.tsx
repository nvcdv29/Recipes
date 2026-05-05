import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Camera, 
  Loader2, 
  AlertTriangle, 
  Image as ImageIcon 
} from 'lucide-react';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import { importRecipeFromUrl } from '../../services/geminiService';
import { processImagesBatch } from '../../services/ParallelImportProcessor';
import { Button } from '../ui/Button';
import { BulkImportOverview } from './BulkImportOverview';

interface AIScannerProps {
  onCancel: () => void;
  onScanComplete: (data: any, isBulk?: boolean) => void;
  initialUrl?: string;
}

export const AIScanner = ({ onCancel, onScanComplete, initialUrl }: AIScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState(initialUrl || '');
  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkRecipes, setBulkRecipes] = useState<any[]>([]);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (initialUrl) {
      handleUrlImport(initialUrl);
    }
  }, [initialUrl]);

  const generateSourceName = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      const parts = hostname.replace('www.', '').split('.');
      if (parts.length > 0) {
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
    } catch (e) {
      // Ignore
    }
    return url;
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsScanning(true);
    setPreview(null);
    setScanProgress({ current: 0, total: files.length });
    
    try {
      const base64Images = await Promise.all(files.map(async (file) => {
        try {
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 0.15,
            maxWidthOrHeight: 800,
            useWebWorker: true
          });
          return new Promise<{data: string, mimeType: string}>((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              resolve({ data: event.target?.result as string, mimeType: compressedFile.type });
            };
            reader.readAsDataURL(compressedFile);
          });
        } catch (err) {
          console.error("Scanner compression failed:", err);
          return new Promise<{data: string, mimeType: string}>((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              resolve({ data: event.target?.result as string, mimeType: file.type });
            };
            reader.readAsDataURL(file);
          });
        }
      }));

      if (base64Images.length === 1) {
        setPreview(base64Images[0].data);
      }

      const recipes = await processImagesBatch(base64Images, (current, total) => {
        setScanProgress({ current, total });
      });

      const processedRecipes = recipes.map((r: any) => ({
        ...r,
        images: r.imageIndices ? r.imageIndices.map((i: number) => base64Images[i]?.data).filter(Boolean) : (base64Images.length === 1 ? [base64Images[0].data] : []),
        sourceName: sourceName || (sourceUrl ? generateSourceName(sourceUrl) : ''),
        sourceUrl: sourceUrl
      }));

      if (processedRecipes.length === 1) {
        const data = processedRecipes[0];
        if (data.isRecipe === false) {
          setPendingData(data);
          setShowWarning(true);
          setIsScanning(false);
        } else {
          onScanComplete(data);
          toast.success("Rezept erfolgreich gescannt!");
        }
      } else if (processedRecipes.length > 1) {
        setBulkRecipes(processedRecipes);
        setBulkMode(true);
        setIsScanning(false);
      } else {
        toast.error("Keine Rezepte in den Bildern gefunden.");
        setIsScanning(false);
      }
    } catch (error) {
      toast.error("Scan fehlgeschlagen. Bitte versuche es erneut.");
      setIsScanning(false);
    }
  };

  const handleUrlImport = async (urlToImport = urlInput) => {
    if (!urlToImport.trim()) return;
    
    setIsScanning(true);
    setPreview(null);
    
    const urls = urlToImport.split('\n').map(u => u.trim()).filter(u => u);
    
    try {
      if (urls.length === 1) {
        const data = await importRecipeFromUrl(urls[0]);
        const recipeData = {
          ...data,
          sourceName: sourceName || generateSourceName(urls[0]),
          sourceUrl: sourceUrl || urls[0]
        };
        
        if (data.isRecipe === false) {
          setPendingData(recipeData);
          setShowWarning(true);
          setIsScanning(false);
        } else {
          onScanComplete(recipeData);
          toast.success("Rezept erfolgreich importiert!");
        }
      } else {
        const results = await Promise.allSettled(urls.map(u => importRecipeFromUrl(u)));
        const successfulRecipes = results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.isRecipe !== false)
          .map((r, i) => ({
            ...r.value,
            sourceName: sourceName || generateSourceName(urls[i]),
            sourceUrl: sourceUrl || urls[i]
          }));

        if (successfulRecipes.length > 0) {
          setBulkRecipes(successfulRecipes);
          setBulkMode(true);
        } else {
          toast.error("Keine gültigen Rezepte in den URLs gefunden.");
        }
        setIsScanning(false);
      }
    } catch (error) {
      toast.error("Import fehlgeschlagen. Bitte überprüfe die URL(s).");
      setIsScanning(false);
    }
  };

  if (bulkMode) {
    return (
      <BulkImportOverview 
        recipes={bulkRecipes} 
        onCancel={() => setBulkMode(false)}
        onSaveAll={(recipesToSave: any[]) => {
          onScanComplete(recipesToSave, true);
        }}
      />
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto text-center"
    >
      <AnimatePresence>
        {showWarning && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-surface-container-low rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-outline-variant/10"
            >
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-6">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-2xl font-serif font-bold mb-4">Kein Rezept erkannt</h3>
              <p className="text-on-surface-variant mb-8 leading-relaxed">
                Es scheint, als ob der Inhalt kein Rezept enthält. Ein automatischer Import wurde daher nicht empfohlen. 
                Möchtest du trotzdem fortfahren und die Daten manuell bearbeiten? Es könnte ein Erkennungsfehler der KI sein.
              </p>
              <div className="flex flex-col gap-3">
                <Button onClick={() => onScanComplete(pendingData)} className="w-full">
                  Bist du dir sicher? Fortfahren
                </Button>
                <Button variant="secondary" onClick={() => { setShowWarning(false); setPendingData(null); }} className="w-full">
                  Abbrechen
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-surface-container-low rounded-[3rem] p-12 shadow-2xl border border-outline-variant/10">
        <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary mx-auto mb-8">
          <Camera size={48} />
        </div>
        <h2 className="text-3xl font-serif font-bold text-primary mb-4">KI Rezept-Scanner</h2>
        <p className="text-on-surface-variant mb-10 leading-relaxed">
          Fotografiere ein Rezept, lade Bilder hoch oder füge Links von Rezept-Websites (z.B. Chefkoch) oder YouTube-Videos ein. Bulk-Import wird unterstützt!
        </p>

        {isScanning ? (
          <div className="space-y-6 py-8">
            {preview ? (
              <div className="relative w-48 h-48 mx-auto rounded-2xl overflow-hidden shadow-lg">
                <img src={preview} className="dark:brightness-90 transition-all w-full h-full object-cover blur-sm" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <Loader2 className="animate-spin text-white" size={48} />
                </div>
                <motion.div 
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-1 bg-white dark:bg-surface-container-low shadow-[0_0_15px_rgba(255,255,255,0.8)] z-10"
                />
              </div>
            ) : (
              <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={48} />
              </div>
            )}
            <div className="text-center">
              <p className="text-primary font-medium animate-pulse mb-2">Analysiere Rezept(e)...</p>
              {scanProgress.total > 0 && (
                <p className="text-sm text-on-surface-variant">
                  Verarbeite Bild {scanProgress.current} von {scanProgress.total}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8 text-left">
            <div className="p-6 bg-surface-container-low rounded-2xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/50">Quelle (Optional)</h3>
              <p className="text-xs text-on-surface-variant/70">Wird für alle importierten Rezepte übernommen.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="Name (z.B. Omas Kochbuch, Chefkoch)"
                  className="w-full px-4 py-3 bg-white dark:bg-surface-container-low rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all border border-outline-variant/10"
                />
                <input 
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="URL (z.B. https://chefkoch.de)"
                  className="w-full px-4 py-3 bg-white dark:bg-surface-container-low rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all border border-outline-variant/10"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/50">Aus Bild(ern) / Foto(s)</h3>
              <label className="block">
                <span className="sr-only">Bilder auswählen</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  multiple
                  onChange={handleFiles}
                  className="block w-full text-sm text-on-surface-variant
                    file:mr-4 file:py-3 file:px-8
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-white
                    hover:file:bg-primary/90 cursor-pointer"
                />
              </label>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-surface-container-low text-on-surface-variant/50 font-medium">ODER</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/50">Aus Web-Link(s)</h3>
              <div className="flex flex-col gap-2">
                <textarea 
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://www.chefkoch.de/...&#10;Ein Link pro Zeile für Bulk-Import"
                  className="w-full px-4 py-3 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[100px] resize-y"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      e.preventDefault();
                      handleUrlImport();
                    }
                  }}
                />
                <Button onClick={() => handleUrlImport()} disabled={!urlInput.trim()}>
                  Importieren
                </Button>
              </div>
            </div>

            <Button variant="secondary" onClick={onCancel} className="w-full mt-8">
              Abbrechen
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
