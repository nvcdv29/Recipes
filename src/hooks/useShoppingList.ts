import { useState, useCallback, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { ShoppingList, OperationType } from '../types';
import { handleFirestoreError } from '../services/firestore';
import { useAuthStore as useAuth } from '../stores/authStore';
import { toast } from 'sonner';

export function useShoppingList() {
  const { user } = useAuth();
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setShoppingLists([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'shoppingLists'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lists = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as ShoppingList[];
        setShoppingLists(lists);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'shoppingLists');
      }
    );

    return () => unsubscribe();
  }, [user]);

  const createList = useCallback(async (list: Omit<ShoppingList, 'id' | 'createdAt'>) => {
    try {
      const data = {
        ...list,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'shoppingLists'), data);
      toast.success('Einkaufsliste erstellt');
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shoppingLists');
      return null;
    }
  }, []);

  const updateList = useCallback(async (id: string, data: Partial<ShoppingList>) => {
    try {
      await updateDoc(doc(db, 'shoppingLists', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `shoppingLists/${id}`);
    }
  }, []);

  const deleteList = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'shoppingLists', id));
      toast.success('Einkaufsliste gelöscht');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `shoppingLists/${id}`);
    }
  }, []);

  return {
    shoppingLists,
    loading,
    createList,
    updateList,
    deleteList
  };
}
