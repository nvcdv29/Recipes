import { useState, useMemo } from 'react';
import { useAuthStore as useAuth } from '../stores/authStore';
import { useRecipeStore as useRecipes } from '../stores/recipeStore';
import { useMealPlans } from '../hooks/useMealPlans';
import { Recipe, MealSlot } from '../types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '../components/ui/Button';
import { Calendar, ChevronLeft, ChevronRight, X, Search, FileText, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { generateShoppingListItems } from '../services/shoppingListService';
import { useShoppingList } from '../hooks/useShoppingList';
import { useNavigate } from 'react-router-dom';

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const MEAL_TYPES = [
  { id: 'breakfast', label: 'Frühstück' },
  { id: 'lunch', label: 'Mittagessen' },
  { id: 'dinner', label: 'Abendessen' }
] as const;

function getISOWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function adjustWeek(isoDate: string, weeks: number) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split('T')[0];
}

export const MealPlanner = () => {
  const { user, settings } = useAuth();
  const { recipes } = useRecipes();
  const { createList } = useShoppingList();
  const navigate = useNavigate();
  
  const [currentWeekStart, setCurrentWeekStart] = useState(getISOWeekStart());
  const { mealPlan, saveMealPlan, loading } = useMealPlans(currentWeekStart);
  
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => 
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.categories?.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [recipes, searchQuery]);

  // Generate current meals state or empty default
  const meals = useMemo(() => mealPlan?.meals || [], [mealPlan]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    const sourceId = source.droppableId;
    const destId = destination.droppableId;

    let newMeals = [...meals];

    if (sourceId === 'recipe-sidebar' && destId.startsWith('slot-')) {
      // Dragging from sidebar to calendar slot
      const [_, day, type] = destId.split('-');
      
      newMeals.push({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7),
        day,
        type: type as any,
        recipeId: draggableId,
        servings: recipes.find(r => r.id === draggableId)?.servings || 2
      });
      
      await saveMealPlan({ weekStart: currentWeekStart, meals: newMeals });
    } 
    else if (sourceId.startsWith('slot-') && destId.startsWith('slot-')) {
      // Moving between slots
      const sourceMealId = draggableId;
      const [_, destDay, destType] = destId.split('-');

      const mealIndex = newMeals.findIndex(m => m.id === sourceMealId);
      if (mealIndex !== -1) {
        newMeals[mealIndex] = {
          ...newMeals[mealIndex],
          day: destDay,
          type: destType as any
        };
        await saveMealPlan({ weekStart: currentWeekStart, meals: newMeals });
      }
    }
  };

  const removeMeal = async (mealId: string) => {
    const newMeals = meals.filter(m => m.id !== mealId);
    await saveMealPlan({ weekStart: currentWeekStart, meals: newMeals });
  };

  const generateShoppingList = async () => {
    if (!user) return;
    if (meals.length === 0) {
      toast.error("Menüplan ist leer");
      return;
    }

    const toGenerate = meals.map(meal => ({
      recipe: recipes.find(r => r.id === meal.recipeId)!,
      targetServings: meal.servings
    })).filter(x => x.recipe);

    if (toGenerate.length === 0) return;

    const items = generateShoppingListItems(toGenerate);
    const startDate = new Date(currentWeekStart).toLocaleDateString('de-DE');
    
    await createList({
      name: `Menüplan ab ${startDate}`,
      userId: user.uid,
      recipes: meals.filter(m => m.recipeId).map(m => ({ recipeId: m.recipeId!, servings: m.servings })),
      items
    });

    navigate('/shopping-lists');
  };

  const generateICS = () => {
    if (meals.length === 0) {
      toast.error("Menüplan ist leer");
      return;
    }
    let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Recipe//MealPlanner//DE\n';
    
    const weekStartObj = new Date(currentWeekStart);
    
    meals.forEach(meal => {
      const recipe = recipes.find(r => r.id === meal.recipeId);
      if (!recipe) return;
      
      const dayIndex = DAYS.indexOf(meal.day);
      const mealDate = new Date(weekStartObj);
      mealDate.setDate(mealDate.getDate() + dayIndex);
      
      if (meal.type === 'breakfast') mealDate.setHours(8, 0, 0);
      else if (meal.type === 'lunch') mealDate.setHours(13, 0, 0);
      else if (meal.type === 'dinner') mealDate.setHours(19, 0, 0);
      
      const toICSDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      const endDate = new Date(mealDate);
      endDate.setHours(endDate.getHours() + 1);
      
      const typeLabel = MEAL_TYPES.find(t => t.id === meal.type)?.label || 'Mahlzeit';
      
      icsContent += 'BEGIN:VEVENT\n';
      icsContent += `DTSTART:${toICSDate(mealDate)}\n`;
      icsContent += `DTEND:${toICSDate(endDate)}\n`;
      icsContent += `SUMMARY:${typeLabel}: ${recipe.title}\n`;
      icsContent += `DESCRIPTION:Portionen: ${meal.servings}\\nZeit: ${recipe.duration}\n`;
      icsContent += 'END:VEVENT\n';
    });
    
    icsContent += 'END:VCALENDAR';
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Menuplan_${currentWeekStart}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Kalender-Export erfolgreich");
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Sidebar for recipes */}
          <div className="w-full lg:w-80 flex flex-col bg-surface-container-low rounded-3xl p-4 border border-outline-variant/20 h-[80vh]">
            <h2 className="text-xl font-bold font-serif mb-4 flex items-center gap-2">
              <Search size={20} className="text-primary" />
              Rezepte finden
            </h2>
            
            <input
              type="text"
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
            />

            <Droppable droppableId="recipe-sidebar" isDropDisabled={true}>
              {(provided) => (
                <div 
                  {...provided.droppableProps} 
                  ref={provided.innerRef}
                  className="flex-1 overflow-y-auto space-y-3 pr-2"
                >
                  {filteredRecipes.map((recipe, index) => (
                    <Draggable key={recipe.id} draggableId={recipe.id!} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`bg-white dark:bg-surface-container-low p-3 rounded-xl border flex items-center gap-3 cursor-grab active:cursor-grabbing
                            ${snapshot.isDragging ? 'shadow-xl border-primary' : 'border-outline-variant/20 hover:border-primary/50'}
                          `}
                        >
                          <img 
                            src={recipe.images[0] || `https://picsum.photos/seed/${recipe.title}/100/100`} 
                            alt="" 
                            className="dark:brightness-90 transition-all w-12 h-12 rounded-lg object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-on-surface truncate">{recipe.title}</h4>
                            <p className="text-xs text-on-surface-variant truncate">{recipe.duration} • {recipe.difficulty}</p>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* Main Calendar Area */}
          <div className="flex-1 bg-white dark:bg-surface-container-low rounded-3xl p-6 border border-outline-variant/20 overflow-x-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setCurrentWeekStart(adjustWeek(currentWeekStart, -1))}
                  className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
                >
                  <ChevronLeft />
                </button>
                <div className="flex items-center gap-2 font-bold text-xl text-on-surface">
                  <Calendar className="text-primary" />
                  Woche ab {new Date(currentWeekStart).toLocaleDateString('de-DE')}
                </div>
                <button 
                  onClick={() => setCurrentWeekStart(adjustWeek(currentWeekStart, 1))}
                  className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
                >
                  <ChevronRight />
                </button>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" icon={FileText} onClick={generateICS}>Als ICS Exportieren</Button>
                {settings.enableShoppingLists !== false && (
                  <Button icon={ShoppingCart} onClick={generateShoppingList}>Einkaufsliste</Button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="animate-pulse space-y-4">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-32 bg-surface-container-low rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="min-w-[800px]">
                <div className="grid grid-cols-8 gap-4 mb-2">
                  <div className="w-24"></div> {/* empty corner */}
                  {DAYS.map(day => (
                    <div key={day} className="text-center font-bold text-on-surface-variant py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  {MEAL_TYPES.map(type => (
                    <div key={type.id} className="grid grid-cols-8 gap-4">
                      <div className="w-24 py-4 text-sm font-medium text-on-surface-variant flex items-center justify-end pr-4 border-r border-outline-variant/20">
                        {type.label}
                      </div>
                      
                      {DAYS.map(day => {
                        const slotId = `slot-${day}-${type.id}`;
                        const slotMeals = meals.filter(m => m.day === day && m.type === type.id);

                        return (
                          <Droppable key={slotId} droppableId={slotId}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`min-h-[100px] border-2 border-dashed rounded-xl p-2 transition-colors
                                  ${snapshot.isDraggingOver ? 'bg-primary/5 border-primary/50' : 'bg-surface-container-low border-outline-variant/20'}
                                `}
                              >
                                {slotMeals.map((meal, index) => {
                                  const recipe = recipes.find(r => r.id === meal.recipeId);
                                  return (
                                    <Draggable key={meal.id} draggableId={meal.id!} index={index}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`bg-white dark:bg-surface-container-low rounded-lg shadow-sm border p-2 mb-2 relative group
                                            ${snapshot.isDragging ? 'shadow-xl border-primary z-50' : 'border-outline-variant/30 hover:border-primary/50'}
                                          `}
                                        >
                                          {recipe ? (
                                            <>
                                              <div className="flex gap-2 mb-1">
                                                <img 
                                                  src={recipe.images[0] || `https://picsum.photos/seed/${recipe.title}/50/50`} 
                                                  className="dark:brightness-90 transition-all w-8 h-8 rounded object-cover shrink-0" 
                                                  alt=""
                                                />
                                                <div className="text-xs font-medium line-clamp-2 leading-tight">
                                                  {recipe.title}
                                                </div>
                                              </div>
                                              <div className="text-[10px] text-on-surface-variant">
                                                {meal.servings} Port.
                                              </div>
                                            </>
                                          ) : (
                                            <div className="text-xs text-red-500 font-medium">Rezept gelöscht</div>
                                          )}
                                          
                                          <button 
                                            onClick={() => removeMeal(meal.id!)}
                                            className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};
