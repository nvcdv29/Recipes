import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  setDoc,
  doc
} from 'firebase/firestore';
import { db } from '../firebase';
import { MealPlan, OperationType } from '../types';
import { handleFirestoreError } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export const useMealPlans = (weekStart: string) => {
  const { user } = useAuth();
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMealPlan(null);
      setLoading(false);
      return;
    }

    const planId = `${user.uid}_${weekStart}`;
    
    // We can just listen to the specific document since we know its ID format
    const unsub = onSnapshot(doc(db, 'mealPlans', planId), (docSnap) => {
      if (docSnap.exists()) {
        setMealPlan({ id: docSnap.id, ...docSnap.data() } as MealPlan);
      } else {
        setMealPlan(null);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `mealPlans/${planId}`);
      setLoading(false);
    });

    return () => unsub();
  }, [user, weekStart]);

  const saveMealPlan = async (plan: Omit<MealPlan, 'id' | 'userId'>) => {
    if (!user) return;
    try {
      const planId = `${user.uid}_${plan.weekStart}`;
      const fullPlan: MealPlan = {
        ...plan,
        userId: user.uid,
      };
      
      await setDoc(doc(db, 'mealPlans', planId), fullPlan);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'mealPlans');
      toast.error('Fehler beim Speichern des Menüplans');
    }
  };

  return { 
    mealPlan,
    loading, 
    saveMealPlan
  };
};
