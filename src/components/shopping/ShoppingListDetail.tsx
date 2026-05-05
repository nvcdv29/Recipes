import { ShoppingList } from '../../types';
import { useShoppingList } from '../../hooks/useShoppingList';
import { Button } from '../ui/Button';
import { ChevronLeft, Share2, FileDown, CheckCircle2, Circle } from 'lucide-react';
import { exportShoppingListToPDF, shareShoppingList } from '../../services/shoppingListExport';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface Props {
  list: ShoppingList;
  onBack: () => void;
}

export const ShoppingListDetail = ({ list, onBack }: Props) => {
  const { updateList } = useShoppingList();

  const toggleItem = async (index: number) => {
    if (!list.id) return;
    
    const newItems = [...list.items];
    newItems[index] = {
      ...newItems[index],
      checked: !newItems[index].checked
    };
    
    // Optimistic update pattern - update locally if we had local state, but we rely on context
    // So we just push update to backend and it bubbles back via snapshot
    await updateList(list.id, { items: newItems });
  };

  const handleShare = async () => {
    const res = await shareShoppingList(list);
    if (res === 'copied') toast.success('In Zwischenablage kopiert');
  };

  const grouped: Record<string, typeof list.items & { originalIndices: number[] }> = {};
  
  list.items.forEach((item, originalIndex) => {
    if (!grouped[item.category]) {
      grouped[item.category] = [] as any;
      grouped[item.category].originalIndices = [];
    }
    grouped[item.category].push(item);
    grouped[item.category].originalIndices.push(originalIndex);
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant -ml-2"
          >
            <ChevronLeft size={28} />
          </button>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-on-surface line-clamp-1">{list.name}</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleShare} icon={Share2}>Teilen</Button>
          <Button variant="outline" onClick={() => exportShoppingListToPDF(list)} icon={FileDown}>PDF</Button>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-container-low rounded-3xl p-6 md:p-8 shadow-sm border border-outline-variant/10 space-y-8">
        {Object.keys(grouped).length === 0 && (
          <p className="text-center text-on-surface-variant py-8">Diese Liste ist leer.</p>
        )}
        
        {Object.entries(grouped).map(([category, itemsData], idx) => {
          const allChecked = itemsData.every(i => i.checked);
          return (
            <div key={idx} className={cn("transition-opacity", allChecked && "opacity-60")}>
              <h3 className="font-bold text-lg text-primary mb-4 border-b border-outline-variant/20 pb-2">
                {category}
              </h3>
              <ul className="space-y-3">
                {itemsData.map((item, localIdx) => {
                  const originalIndex = itemsData.originalIndices[localIdx];
                  return (
                    <li 
                      key={originalIndex}
                      onClick={() => toggleItem(originalIndex)}
                      className="flex items-center gap-4 p-2 -mx-2 hover:bg-surface-container-low rounded-xl cursor-pointer transition-colors group"
                    >
                      <button className="shrink-0 text-on-surface-variant transition-colors group-hover:text-primary">
                        {item.checked ? 
                          <CheckCircle2 size={24} className="text-[#4CAF50]" /> : 
                          <Circle size={24} />
                        }
                      </button>
                      <span className={cn(
                        "text-base md:text-lg transition-all",
                        item.checked ? "text-on-surface-variant line-through" : "text-on-surface"
                      )}>
                        {item.quantity && <span className="font-bold border-r border-outline-variant/30 pr-3 mr-3 inline-block min-w-[3rem]">{item.quantity}</span>}
                        {item.ingredient}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};
