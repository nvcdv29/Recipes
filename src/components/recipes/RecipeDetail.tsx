import { useState, useEffect } from 'react';
import { 
  query, 
  collection, 
  where, 
  onSnapshot, 
  getDocs, 
  updateDoc, 
  doc, 
  addDoc 
} from 'firebase/firestore';
import { 
  ChevronLeft, 
  Printer, 
  Share2, 
  Mail, 
  Edit3, 
  Trash2, 
  BookOpen, 
  Clock, 
  Users, 
  BarChart, 
  User as UserIcon,
  Play,
  BookmarkPlus,
  Heart,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { db } from '../../firebase';
import { Recipe, Rating, OperationType } from '../../types';
import { handleFirestoreError } from '../../services/firestore';
import { RatingStars } from './RatingStars';
import { Button } from '../ui/Button';
import { useAuthStore as useAuth } from '../../stores/authStore';
import { CollectionSelectorModal } from '../collections/CollectionSelectorModal';
import { VersionHistory } from './VersionHistory';
import { VariantManager } from './VariantManager';
import { cn } from '../../lib/utils';
import { CommentSection } from './CommentSection';
import { CookingLogCard } from './CookingLogCard';
import { useSocialFeatures } from '../../hooks/useSocialFeatures';
import { RecipeScaler } from './RecipeScaler';
import { ParsedIngredient, parseIngredients, adjustCookingTips } from '../../services/recipeScaling';

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCook: () => void;
  currentUser: any;
}

export const RecipeDetail = ({ recipe: initialRecipe, onBack, onEdit, onDelete, onCook, currentUser }: RecipeDetailProps) => {
  const { userProfile, toggleFavorite } = useAuth();
  const [recipe, setRecipe] = useState(initialRecipe);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [pdfIncludeImage, setPdfIncludeImage] = useState(false);
  const [pdfIncludeRating, setPdfIncludeRating] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  
  const [showSmartScale, setShowSmartScale] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRecipeIngredients, setParsedRecipeIngredients] = useState<ParsedIngredient[]>([]);
  const [scaledServings, setScaledServings] = useState(initialRecipe.servings);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [isAdjustingTips, setIsAdjustingTips] = useState(false);
  const [adjustedDuration, setAdjustedDuration] = useState("");
  const [scalingTips, setScalingTips] = useState<string[]>([]);

  const { reactions, toggleReaction } = useSocialFeatures(recipe.id);

  const isFavorite = userProfile?.favorites?.includes(recipe.id || '') || false;

  const handleSmartScale = async () => {
    if (parsedRecipeIngredients.length > 0) {
      setShowSmartScale(true);
      return;
    }
    setIsParsing(true);
    try {
      const parsed = await parseIngredients(recipe.ingredients);
      setParsedRecipeIngredients(parsed);
      setShowSmartScale(true);
    } catch (e: any) {
      toast.error(e.message || "Fehler beim Laden der Zutaten");
    } finally {
      setIsParsing(false);
    }
  };

  const handleAdjustTips = async () => {
    setIsAdjustingTips(true);
    try {
      const { newDuration, tips } = await adjustCookingTips(
        recipe.servings, 
        scaledServings, 
        recipe.title, 
        recipe.instructions
      );
      setAdjustedDuration(newDuration);
      setScalingTips(tips);
      setTipsOpen(true);
    } catch (e: any) {
      toast.error(e.message || "Fehler");
    } finally {
      setIsAdjustingTips(false);
    }
  };

  useEffect(() => {
    setRecipe(initialRecipe); // Update if parent changes
  }, [initialRecipe]);

  useEffect(() => {
    if (currentUser && recipe.id) {
      const q = query(
        collection(db, 'ratings'),
        where('recipeId', '==', recipe.id),
        where('userId', '==', currentUser.uid)
      );
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          setUserRating(snap.docs[0].data().score);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'ratings');
      });
      return unsub;
    }
  }, [currentUser, recipe.id]);

  const handleRate = async (score: number) => {
    if (!currentUser || !recipe.id) return;

    try {
      const q = query(
        collection(db, 'ratings'),
        where('recipeId', '==', recipe.id),
        where('userId', '==', currentUser.uid)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        await updateDoc(doc(db, 'ratings', snap.docs[0].id), { score, createdAt: new Date().toISOString() });
      } else {
        await addDoc(collection(db, 'ratings'), {
          recipeId: recipe.id,
          userId: currentUser.uid,
          score,
          createdAt: new Date().toISOString()
        });
      }

      // Recalculate average
      const allRatingsSnap = await getDocs(query(collection(db, 'ratings'), where('recipeId', '==', recipe.id)));
      const allRatings = allRatingsSnap.docs.map(d => d.data() as Rating);
      const count = allRatings.length;
      const average = allRatings.reduce((acc, curr) => acc + curr.score, 0) / count;

      await updateDoc(doc(db, 'recipes', recipe.id), {
        averageRating: average,
        ratingCount: count
      });

      toast.success("Bewertung gespeichert!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'ratings');
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    let y = 20;
    
    // Title
    doc.setFontSize(24);
    doc.text(recipe.title, 20, y);
    y += 10;
    
    // Meta
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Von ${recipe.authorName} • ${recipe.duration} • ${recipe.difficulty} • ${recipe.servings} Portionen`, 20, y);
    y += 15;

    // Image (Optional)
    if (pdfIncludeImage && recipe.images?.[0]) {
      try {
        const imgData = recipe.images[0];
        if (imgData.startsWith('data:image')) {
          const formatMatch = imgData.match(/data:image\/([a-zA-Z0-9]+);base64,/);
          const format = formatMatch ? formatMatch[1].toUpperCase() : 'JPEG';
          doc.addImage(imgData, format, 20, y, 170, 100);
          y += 110;
        }
      } catch (e) {
        console.error("Could not add image to PDF", e);
      }
    }

    // Rating (Optional)
    if (pdfIncludeRating && recipe.averageRating) {
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Bewertung: ${recipe.averageRating.toFixed(1)} / 5 (${recipe.ratingCount} Stimmen)`, 20, y);
      y += 10;
    }

    // Ingredients
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("Zutaten", 20, y);
    y += 10;
    doc.setFontSize(12);
    recipe.ingredients.forEach((ing: string) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`• ${ing}`, 25, y);
      y += 7;
    });
    y += 5;

    // Instructions
    doc.setFontSize(16);
    doc.text("Zubereitung", 20, y);
    y += 10;
    doc.setFontSize(12);
    
    recipe.instructions.forEach((inst: string, i: number) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${inst}`, 170);
      lines.forEach((line: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, 25, y);
        y += 7;
      });
      y += 3;
    });

    if (recipe.notes) {
      y += 5;
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(16);
      doc.text("Notizen", 20, y);
      y += 10;
      doc.setFontSize(12);
      const lines = doc.splitTextToSize(recipe.notes, 170);
      lines.forEach((line: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, 25, y);
        y += 7;
      });
    }

    doc.save(`${recipe.title}.pdf`);
    setShowPdfOptions(false);
  };

  const shareRecipe = () => {
    if (navigator.share) {
      navigator.share({
        title: recipe.title,
        text: `Schau dir dieses Rezept an: ${recipe.title}`,
        url: window.location.href
      });
    } else {
      toast.info("Link kopiert!");
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Rezept: ${recipe.title}`);
    const body = encodeURIComponent(
      `Schau dir dieses Rezept an: ${recipe.title}\n\n` +
      `Dauer: ${recipe.duration}\n` +
      `Schwierigkeit: ${recipe.difficulty}\n` +
      `Portionen: ${recipe.servings}\n\n` +
      `Zutaten:\n${recipe.ingredients.map((ing: string) => `• ${ing}`).join('\n')}\n\n` +
      `Zubereitung:\n${recipe.instructions.map((inst: string, i: number) => `${i + 1}. ${inst}`).join('\n')}\n\n` +
      (recipe.notes ? `Notizen:\n${recipe.notes}\n\n` : '') +
      `Link: ${window.location.href}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8 print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-medium">
          <ChevronLeft size={20} />
          <span>Zurück zur Übersicht</span>
        </button>
        <div className="flex gap-2 relative">
          {recipe.id && (
            <VariantManager recipe={recipe} currentUser={currentUser} onVariantSelected={setRecipe} />
          )}
          
          <button onClick={onCook} className="p-3 bg-primary text-white hover:bg-primary/90 rounded-full transition-colors flex items-center gap-2 px-5 font-medium mr-2" title="Kochen starten">
            <Play size={20} className="fill-white" />
            <span className="hidden sm:inline">Kochen</span>
          </button>
          <button onClick={() => setShowPdfOptions(!showPdfOptions)} className="p-3 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant" title="Drucken / PDF">
            <Printer size={20} />
          </button>
          
          {recipe.id && (
             <VersionHistory recipe={recipe} />
          )}

          <button 
            onClick={() => recipe.id && toggleFavorite(recipe.id)} 
            className="p-3 hover:bg-surface-container-high rounded-full transition-colors" 
            title="Zu Favoriten"
          >
            <Heart size={20} className={cn("transition-colors", isFavorite ? "fill-[#FF4B4B] text-[#FF4B4B]" : "text-on-surface-variant")} />
          </button>
          
          <button 
            onClick={() => setShowCollectionModal(true)} 
            className="p-3 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant" 
            title="Zu Sammlung hinzufügen"
          >
            <BookmarkPlus size={20} />
          </button>

          {showPdfOptions && (
            <div className="absolute top-14 right-12 w-64 bg-white dark:bg-surface-container-low rounded-2xl shadow-xl border border-outline-variant/10 p-4 z-50">
              <h4 className="font-bold mb-4">PDF Export</h4>
              <label className="flex items-center gap-3 mb-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={pdfIncludeImage} 
                  onChange={e => setPdfIncludeImage(e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm">Mit Bild exportieren</span>
              </label>
              <label className="flex items-center gap-3 mb-6 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={pdfIncludeRating} 
                  onChange={e => setPdfIncludeRating(e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm">Mit Bewertung exportieren</span>
              </label>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowPdfOptions(false)} className="flex-1 py-2 text-sm">Abbrechen</Button>
                <Button onClick={exportPDF} className="flex-1 py-2 text-sm">Exportieren</Button>
              </div>
            </div>
          )}

          <button onClick={shareRecipe} className="p-3 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant" title="Teilen">
            <Share2 size={20} />
          </button>
          <button onClick={shareViaEmail} className="p-3 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant" title="Per E-Mail teilen">
            <Mail size={20} />
          </button>
          {(currentUser?.uid === recipe.authorId) && (
            <>
              <button onClick={onEdit} className="p-3 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant" title="Bearbeiten">
                <Edit3 size={20} />
              </button>
              <button onClick={onDelete} className="p-3 hover:bg-red-50 rounded-full transition-colors text-red-500" title="Löschen">
                <Trash2 size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      <div id="recipe-content" className="bg-white dark:bg-surface-container-low rounded-[3rem] overflow-hidden shadow-xl border border-outline-variant/5 print:shadow-none print:border-none print:rounded-none">
        <div className="aspect-[21/9] w-full relative">
          <img 
            src={recipe.images[0] || `https://picsum.photos/seed/${recipe.title}/1200/600`} 
            alt={recipe.title}
            className="dark:brightness-90 transition-all w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-10 left-10 right-10">
            <div className="flex flex-wrap gap-2 mb-4">
              {recipe.categories.map(c => (
                <span key={c} className="px-4 py-1.5 bg-white dark:bg-surface-container-low/20 backdrop-blur-md rounded-full text-xs font-bold text-white uppercase tracking-widest border border-white/20">
                  {c}
                </span>
              ))}
              {recipe.dietary?.map(d => (
                <span key={d} className="px-4 py-1.5 bg-primary/80 backdrop-blur-md rounded-full text-xs font-bold text-white uppercase tracking-widest border border-primary/20">
                  {d}
                </span>
              ))}
            </div>
            <h1 className="text-5xl font-serif font-bold text-white tracking-tight mb-2">{recipe.title}</h1>
            {(recipe.sourceName || recipe.sourceUrl) && (
              <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                <BookOpen size={16} />
                {recipe.sourceUrl ? (
                  <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline transition-colors">
                    {recipe.sourceName || recipe.sourceUrl}
                  </a>
                ) : (
                  <span>{recipe.sourceName}</span>
                )}
              </div>
            )}
            {recipe.averageRating && (
              <div className="mt-4">
                <RatingStars rating={recipe.averageRating} count={recipe.ratingCount} size={20} />
              </div>
            )}
          </div>
        </div>

        <div className="p-10 lg:p-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 p-8 bg-surface-container-low rounded-[2rem]">
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/40">Deine Bewertung</h4>
              <RatingStars 
                rating={userRating || 0} 
                interactive={true} 
                onRate={handleRate} 
                size={24} 
              />
            </div>
            <div className="h-px md:w-px md:h-12 bg-outline-variant/20" />
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="flex flex-col items-center text-center gap-2">
                <Clock className="text-primary" size={24} />
                <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/40">Dauer</span>
                <span className="font-serif font-bold text-lg">{recipe.duration}</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <Users className="text-primary" size={24} />
                <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/40">Portionen</span>
                <span className="font-serif font-bold text-lg">{recipe.servings}</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <BarChart className="text-primary" size={24} />
                <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/40">Schwierigkeit</span>
                <span className="font-serif font-bold text-lg capitalize">{recipe.difficulty}</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <UserIcon className="text-primary" size={24} />
                <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/40">Von</span>
                <span className="font-serif font-bold text-lg">{recipe.authorName}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-4">
              <h2 className="text-2xl font-serif font-bold mb-8 flex items-center gap-3">
                Zutaten
                <div className="h-px flex-1 bg-outline-variant/20" />
                {!showSmartScale && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSmartScale} 
                    disabled={isParsing}
                  >
                    {isParsing ? <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" /> : "Portionen & Ersatz"}
                  </Button>
                )}
              </h2>
              {showSmartScale && parsedRecipeIngredients.length > 0 ? (
                <RecipeScaler 
                  originalServings={recipe.servings}
                  originalIngredients={recipe.ingredients}
                  parsedIngredients={parsedRecipeIngredients}
                  onScaleChange={setScaledServings}
                />
              ) : (
                <ul className="space-y-4">
                  {recipe.ingredients.map((ing: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 group cursor-pointer">
                      <div className="mt-1.5 w-4 h-4 rounded-full border-2 border-primary/20 group-hover:border-primary transition-colors flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="text-on-surface-variant leading-relaxed">{ing}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-serif font-bold flex items-center gap-3 w-full">
                  Zubereitung
                  <div className="h-px flex-1 bg-outline-variant/20" />
                </h2>
                {scaledServings !== recipe.servings && !tipsOpen && (
                  <Button variant="outline" size="sm" onClick={handleAdjustTips} disabled={isAdjustingTips} className="shrink-0 ml-4">
                    {isAdjustingTips ? <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" /> : "Zubereitung anpassen?"}
                  </Button>
                )}
              </div>
              
              {tipsOpen && (
                <div className="mb-8 p-6 bg-amber-50 rounded-2xl border border-amber-200">
                  <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                    <Info size={18} /> Anpassungen für {scaledServings} Portionen
                  </h4>
                  {adjustedDuration && (
                    <p className="text-amber-800 mb-2"><strong>Neue Dauer:</strong> {adjustedDuration}</p>
                  )}
                  <ul className="space-y-1 list-disc list-inside text-amber-800 text-sm">
                    {scalingTips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-10">
                {recipe.instructions.map((step: string, i: number) => (
                  <div key={i} className="flex gap-6">
                    <span className="text-4xl font-serif font-bold text-primary/10 select-none">
                      {(i + 1).toString().padStart(2, '0')}
                    </span>
                    <p className="text-lg text-on-surface-variant leading-relaxed pt-1">
                      {step}
                    </p>
                  </div>
                ))}
              </div>

              {recipe.notes && (
                <div className="mt-16 p-8 bg-primary/5 rounded-[2rem] border border-primary/10">
                  <h3 className="text-lg font-serif font-bold text-primary mb-4 flex items-center gap-2">
                    <BookOpen size={20} />
                    Notizen & Tipps
                  </h3>
                  <div className="prose prose-primary max-w-none text-on-surface-variant">
                    <ReactMarkdown>{recipe.notes}</ReactMarkdown>
                  </div>
                </div>
              )}

              {recipe.tags && recipe.tags.length > 0 && (
                <div className="mt-12 flex flex-wrap gap-2">
                  {recipe.tags.map((tag: string) => (
                    <span key={tag} className="px-4 py-2 bg-surface-container-low rounded-full text-sm font-medium text-on-surface-variant border border-outline-variant/10">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              
              <div className="mt-8 flex gap-2">
                {['❤️', '🔥', '👍', '😋', '😍'].map(emoji => {
                  const hasReacted = reactions.some(r => r.emoji === emoji && r.userId === currentUser?.uid);
                  const count = reactions.filter(r => r.emoji === emoji).length;
                  
                  return (
                    <button
                      key={emoji}
                      onClick={() => toggleReaction(emoji)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-lg shadow-sm border transition-all active:scale-95",
                        hasReacted ? "bg-primary/20 border-primary shadow-inner" : "bg-white border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:bg-surface-container-high"
                      )}
                    >
                      {emoji} {count > 0 && <span className="text-sm font-medium text-gray-700 ml-1">{count}</span>}
                    </button>
                  );
                })}
              </div>
              
              <hr className="my-12 border-gray-200 dark:border-white/10" />
              
              {recipe.id && <CookingLogCard recipeId={recipe.id} />}
              {recipe.id && <CommentSection recipeId={recipe.id} />}
              
            </div>
          </div>
        </div>
      </div>
      
      {showCollectionModal && recipe.id && (
        <CollectionSelectorModal 
          recipeId={recipe.id}
          onClose={() => setShowCollectionModal(false)}
        />
      )}
    </motion.div>
  );
};
