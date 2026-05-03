import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  X, 
  Trash2, 
  Plus, 
  Check, 
  Loader2, 
  Image as ImageIcon 
} from 'lucide-react';
import { 
  updateDoc, 
  doc, 
  collection, 
  addDoc 
} from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '../../firebase';
import { Recipe, Difficulty, OperationType } from '../../types';
import { handleFirestoreError } from '../../services/firestore';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

interface RecipeFormProps {
  recipe?: Recipe | null;
  onCancel: () => void;
  onSave: (data?: any) => void;
  user: any;
  isBulkEdit?: boolean;
}

export const RecipeForm = ({ recipe: initialRecipe, onCancel, onSave, user, isBulkEdit }: RecipeFormProps) => {
  const location = useLocation();
  const scanData = location.state?.recipeData;
  
  const [formData, setFormData] = useState<Partial<Recipe>>({
    title: '',
    duration: '',
    servings: 4,
    difficulty: 'mittel',
    categories: [],
    dietary: [],
    tags: [],
    ingredients: [''],
    instructions: [''],
    notes: '',
    sourceName: '',
    sourceUrl: '',
    images: [],
    isPublic: true,
    ...(initialRecipe || scanData || {})
  });
  const [isSaving, setIsSaving] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), imageUrlInput.trim()]
      }));
      setImageUrlInput('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Image Compression
      const { default: imageCompression } = await import('browser-image-compression');
      const imagesToCompress = (formData.images || []).slice(0, 3);
      const compressedImages = await Promise.all(imagesToCompress.map(async (img) => {
        if (img && img.startsWith('data:image')) {
          try {
            const response = await fetch(img);
            const blob = await response.blob();
            const compressedFile = await imageCompression(blob as File, {
              maxSizeMB: 0.3,
              maxWidthOrHeight: 1600,
              useWebWorker: true
            });
            return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(compressedFile);
            });
          } catch (err) {
            console.error("Compression failed:", err);
            return img;
          }
        }
        return img;
      }));

      const data: any = {
        ...formData,
        images: compressedImages,
        authorId: user.uid,
        authorName: user.displayName || 'Family Member',
        createdAt: initialRecipe?.createdAt || new Date().toISOString(),
        ingredients: (formData.ingredients || []).filter((i: string) => i && i.trim() !== ''),
        instructions: (formData.instructions || []).filter((i: string) => i && i.trim() !== ''),
      };

      if (!data.title) data.title = 'Neues Rezept';
      if (data.ingredients.length === 0) data.ingredients = ['Zutat fehlt'];
      if (data.instructions.length === 0) data.instructions = ['Schritt fehlt'];
      
      if (typeof data.servings !== 'number') {
        data.servings = parseInt(data.servings as any) || 4;
      }
      
      const validDifficulties = ['einfach', 'mittel', 'schwer'];
      if (!validDifficulties.includes(data.difficulty as string)) {
        data.difficulty = 'mittel';
      }

      Object.keys(data).forEach(key => {
        if (data[key as keyof typeof data] == null) {
          delete data[key as keyof typeof data];
        }
      });

      if (data.duration != null) data.duration = String(data.duration).substring(0, 49);
      if (data.notes != null) data.notes = String(data.notes).substring(0, 9999);
      if (data.authorName != null) data.authorName = String(data.authorName).substring(0, 99);
      
      if (!Array.isArray(data.categories)) data.categories = [];
      if (!Array.isArray(data.dietary)) data.dietary = [];
      if (!Array.isArray(data.tags)) data.tags = [];
      
      delete data.id;

      if (isBulkEdit) {
        onSave(data);
        return;
      }

      if (initialRecipe?.id) {
        await updateDoc(doc(db, 'recipes', initialRecipe.id), data);
        toast.success("Rezept aktualisiert!");
      } else {
        await addDoc(collection(db, 'recipes'), data);
        toast.success("Rezept gespeichert!");
      }
      onSave();
    } catch (error) {
      handleFirestoreError(error, initialRecipe?.id ? OperationType.UPDATE : OperationType.CREATE, initialRecipe?.id ? `recipes/${initialRecipe.id}` : 'recipes');
    } finally {
      setIsSaving(false);
    }
  };

  const addField = (field: 'ingredients' | 'instructions' | 'tags' | 'categories' | 'dietary') => {
    setFormData({ ...formData, [field]: [...(formData[field] || []), ''] });
  };

  const updateField = (field: 'ingredients' | 'instructions' | 'tags' | 'categories' | 'dietary', index: number, value: string) => {
    const list = [...(formData[field] || [])];
    list[index] = value;
    setFormData({ ...formData, [field]: list });
  };

  const removeField = (field: 'ingredients' | 'instructions' | 'tags' | 'categories' | 'dietary', index: number) => {
    const list = [...(formData[field] || [])];
    list.splice(index, 1);
    setFormData({ ...formData, [field]: list });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    Promise.all(files.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file as Blob);
      });
    })).then(base64Images => {
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...base64Images]
      }));
    }).catch(err => {
      console.error("Image read failed", err);
      toast.error("Fehler beim Lesen der Bilder.");
    });
  };

  const removeImage = (index: number) => {
    const newImages = [...(formData.images || [])];
    newImages.splice(index, 1);
    setFormData({ ...formData, images: newImages });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto bg-white rounded-[3rem] p-10 lg:p-16 shadow-2xl border border-outline-variant/10"
    >
      <div className="flex items-center justify-between mb-12">
        <h2 className="text-4xl font-serif font-bold text-primary">
          {initialRecipe ? 'Rezept bearbeiten' : 'Neues Rezept'}
        </h2>
        <button onClick={onCancel} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 ml-4">Titel</label>
            <input 
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-6 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              placeholder="z.B. Omas Apfelkuchen"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 ml-4">Dauer</label>
              <input 
                value={formData.duration}
                onChange={e => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-6 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="30 Min"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 ml-4">Portionen</label>
              <input 
                type="number"
                value={formData.servings}
                onChange={e => setFormData({ ...formData, servings: parseInt(e.target.value) })}
                className="w-full px-6 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 ml-4">Schwierigkeit</label>
              <select
                value={formData.difficulty}
                onChange={e => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                className="w-full px-6 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none"
              >
                <option value="einfach">Einfach</option>
                <option value="mittel">Mittel</option>
                <option value="schwer">Schwer</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 ml-4">Quelle (Name)</label>
              <input 
                value={formData.sourceName || ''}
                onChange={e => setFormData({ ...formData, sourceName: e.target.value })}
                className="w-full px-6 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="z.B. Omas Kochbuch, Chefkoch"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 ml-4">Quelle (URL)</label>
              <input 
                type="url"
                value={formData.sourceUrl || ''}
                onChange={e => setFormData({ ...formData, sourceUrl: e.target.value })}
                className="w-full px-6 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold flex items-center gap-3">
            Bilder
            <div className="h-px flex-1 bg-outline-variant/20" />
          </h3>
          
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4">
              {formData.images?.map((img, i) => (
                <div key={i} className="relative w-32 h-32 rounded-2xl overflow-hidden group border border-outline-variant/10">
                  <img src={img} alt={`Bild ${i + 1}`} className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={24} />
                  </button>
                </div>
              ))}
              <label className="w-32 h-32 rounded-2xl border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-on-surface-variant/50 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                <ImageIcon size={32} className="mb-2" />
                <span className="text-xs font-medium text-center px-2">Vom Computer<br/>wählen</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
              </label>
            </div>
            
            <div className="flex items-center gap-3 max-w-md">
              <input 
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="Oder Bild-URL einfügen..."
                className="flex-1 px-4 py-2 bg-surface-container-low rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddImageUrl();
                  }
                }}
              />
              <button 
                type="button"
                onClick={handleAddImageUrl}
                className="px-4 py-2 bg-primary/10 text-primary font-medium rounded-xl hover:bg-primary/20 transition-colors text-sm whitespace-nowrap"
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold flex items-center gap-3">
            Kategorien (z.B. Hauptspeise, Snack)
            <div className="h-px flex-1 bg-outline-variant/20" />
          </h3>
          <div className="flex flex-wrap gap-3">
            {formData.categories?.map((cat, i) => (
              <div key={i} className="flex items-center bg-surface-container-low rounded-full pl-4 pr-1 py-1 border border-outline-variant/10">
                <input 
                  value={cat}
                  onChange={e => updateField('categories', i, e.target.value)}
                  className="bg-transparent outline-none w-28 text-sm font-medium"
                  placeholder="Kategorie..."
                />
                <button 
                  type="button"
                  onClick={() => removeField('categories', i)}
                  className="p-1.5 text-on-surface-variant/40 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button 
              type="button"
              onClick={() => addField('categories')}
              className="flex items-center gap-2 text-primary font-medium px-4 py-2 hover:bg-primary/5 rounded-full transition-colors border border-primary/20"
            >
              <Plus size={16} /> Kategorie hinzufügen
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold flex items-center gap-3">
            Ernährungsart (z.B. Vegan, Glutenfrei)
            <div className="h-px flex-1 bg-outline-variant/20" />
          </h3>
          <div className="flex flex-wrap gap-3">
            {formData.dietary?.map((diet, i) => (
              <div key={i} className="flex items-center bg-surface-container-low rounded-full pl-4 pr-1 py-1 border border-outline-variant/10">
                <input 
                  value={diet}
                  onChange={e => updateField('dietary', i, e.target.value)}
                  className="bg-transparent outline-none w-28 text-sm font-medium"
                  placeholder="Ernährungsart..."
                />
                <button 
                  type="button"
                  onClick={() => removeField('dietary', i)}
                  className="p-1.5 text-on-surface-variant/40 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button 
              type="button"
              onClick={() => addField('dietary')}
              className="flex items-center gap-2 text-primary font-medium px-4 py-2 hover:bg-primary/5 rounded-full transition-colors border border-primary/20"
            >
              <Plus size={16} /> Ernährungsart hinzufügen
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold flex items-center gap-3">
            Weitere Tags
            <div className="h-px flex-1 bg-outline-variant/20" />
          </h3>
          <div className="flex flex-wrap gap-3">
            {formData.tags?.map((tag, i) => (
              <div key={i} className="flex items-center bg-surface-container-low rounded-full pl-4 pr-1 py-1 border border-outline-variant/10">
                <input 
                  value={tag}
                  onChange={e => updateField('tags', i, e.target.value)}
                  className="bg-transparent outline-none w-24 text-sm font-medium"
                  placeholder="Tag..."
                />
                <button 
                  type="button"
                  onClick={() => removeField('tags', i)}
                  className="p-1.5 text-on-surface-variant/40 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button 
              type="button"
              onClick={() => addField('tags')}
              className="flex items-center gap-2 text-primary font-medium px-4 py-2 hover:bg-primary/5 rounded-full transition-colors border border-primary/20"
            >
              <Plus size={16} /> Tag hinzufügen
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold flex items-center gap-3">
            Zutaten
            <div className="h-px flex-1 bg-outline-variant/20" />
          </h3>
          <div className="space-y-3">
            {formData.ingredients?.map((ing, i) => (
              <div key={i} className="flex gap-3">
                <input 
                  value={ing}
                  onChange={e => updateField('ingredients', i, e.target.value)}
                  className="flex-1 px-6 py-3 bg-surface-container-low rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Zutat hinzufügen..."
                />
                <button 
                  type="button"
                  onClick={() => removeField('ingredients', i)}
                  className="p-3 text-on-surface-variant/40 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            <button 
              type="button"
              onClick={() => addField('ingredients')}
              className="flex items-center gap-2 text-primary font-medium px-4 py-2 hover:bg-primary/5 rounded-lg transition-colors"
            >
              <Plus size={18} /> Zutat hinzufügen
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold flex items-center gap-3">
            Zubereitung
            <div className="h-px flex-1 bg-outline-variant/20" />
          </h3>
          <div className="space-y-4">
            {formData.instructions?.map((step, i) => (
              <div key={i} className="flex gap-4">
                <span className="text-2xl font-serif font-bold text-primary/10 pt-2">{i+1}</span>
                <textarea 
                  value={step}
                  onChange={e => updateField('instructions', i, e.target.value)}
                  className="flex-1 px-6 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none min-h-[100px]"
                  placeholder="Schritt beschreiben..."
                />
                <button 
                  type="button"
                  onClick={() => removeField('instructions', i)}
                  className="p-3 text-on-surface-variant/40 hover:text-red-500 transition-colors h-fit"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            <button 
              type="button"
              onClick={() => addField('instructions')}
              className="flex items-center gap-2 text-primary font-medium px-4 py-2 hover:bg-primary/5 rounded-lg transition-colors"
            >
              <Plus size={18} /> Schritt hinzufügen
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 ml-4">Notizen (Markdown unterstützt)</label>
          <textarea 
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-6 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none min-h-[150px]"
            placeholder="Tipps, Variationen oder die Geschichte dahinter..."
          />
        </div>

        <div className="flex items-center gap-6 p-6 bg-surface-container-low rounded-3xl">
          <div className="flex-1">
            <h4 className="font-bold text-on-surface">Öffentlich teilen</h4>
            <p className="text-sm text-on-surface-variant">Für alle Familienmitglieder sichtbar machen.</p>
          </div>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
            className={cn(
              "w-14 h-8 rounded-full transition-all relative",
              formData.isPublic ? "bg-primary" : "bg-outline-variant"
            )}
          >
            <div className={cn(
              "absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm",
              formData.isPublic ? "left-7" : "left-1"
            )} />
          </button>
        </div>

        <div className="flex gap-4 pt-8">
          <Button type="submit" className="flex-1 py-4 text-lg" disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : <Check />}
            Rezept speichern
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel} className="px-10">
            Abbrechen
          </Button>
        </div>
      </form>
    </motion.div>
  );
};
