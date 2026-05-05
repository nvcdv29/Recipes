import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '../firebase';
import { RecipeCollection, OperationType } from '../types';
import { handleFirestoreError } from '../services/firestore';
import { useAuthStore as useAuth } from '../stores/authStore';
import { toast } from 'sonner';

export const useCollections = () => {
  const { user } = useAuth();
  const [collections, setCollections] = useState<RecipeCollection[]>([]);
  const [sharedCollections, setSharedCollections] = useState<RecipeCollection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCollections([]);
      setSharedCollections([]);
      setLoading(false);
      return;
    }

    const qMyCollections = query(
      collection(db, 'collections'),
      where('userId', '==', user.uid)
    );

    const unsubMyCollections = onSnapshot(qMyCollections, (snapshot) => {
      const parsed = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecipeCollection));
      setCollections(parsed);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'collections');
      setLoading(false);
    });

    const qSharedCollections = query(
      collection(db, 'collections'),
      where('isShared', '==', true)
    );

    const unsubSharedCollections = onSnapshot(qSharedCollections, (snapshot) => {
      const parsed = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecipeCollection));
      // Filter out our own collections to avoid duplicates in shared section
      setSharedCollections(parsed.filter(c => c.userId !== user.uid));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'collections (shared)');
    });

    return () => {
      unsubMyCollections();
      unsubSharedCollections();
    };
  }, [user]);

  const addCollection = async (coll: Omit<RecipeCollection, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    try {
      const newCollection: RecipeCollection = {
        ...coll,
        userId: user.uid,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'collections'), newCollection);
      toast.success('Collection erstellt');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'collections');
      toast.error('Fehler beim Erstellen der Collection');
    }
  };

  const updateCollection = async (id: string, updates: Partial<RecipeCollection>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'collections', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `collections/${id}`);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const deleteCollection = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'collections', id));
      toast.success('Collection gelöscht');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `collections/${id}`);
    }
  };

  return { 
    collections, 
    sharedCollections,
    loading, 
    addCollection, 
    updateCollection, 
    deleteCollection 
  };
};
