import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Comment, CookingLog, Activity, Reaction, Recommendation, OperationType } from '../types';
import { handleFirestoreError } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';

export function useSocialFeatures(recipeId?: string) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [cookingLogs, setCookingLogs] = useState<CookingLog[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    if (!recipeId) return;

    const qComments = query(collection(db, 'comments'), where('recipeId', '==', recipeId), orderBy('createdAt', 'asc'));
    const unsubComments = onSnapshot(qComments, (snapshot) => {
      setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'comments'));

    const qLogs = query(collection(db, 'cookingLogs'), where('recipeId', '==', recipeId), orderBy('createdAt', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setCookingLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CookingLog)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'cookingLogs'));

    const qReactions = query(collection(db, 'reactions'), where('recipeId', '==', recipeId));
    const unsubReactions = onSnapshot(qReactions, (snapshot) => {
      setReactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Reaction)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'reactions'));

    return () => {
      unsubComments();
      unsubLogs();
      unsubReactions();
    };
  }, [recipeId]);

  useEffect(() => {
    if (!user) return;
    
    // Global activity feed
    const qActivities = query(collection(db, 'activities'), orderBy('createdAt', 'desc'));
    const unsubActivities = onSnapshot(qActivities, (snapshot) => {
      setActivities(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'activities'));

    return () => unsubActivities();
  }, [user]);

  const addComment = async (text: string, mentions: string[] = []) => {
    if (!user || !recipeId) return;
    try {
      await addDoc(collection(db, 'comments'), {
        recipeId,
        userId: user.uid,
        text,
        mentions,
        createdAt: new Date().toISOString()
      });
      
      await addDoc(collection(db, 'activities'), {
        userId: user.uid,
        type: 'comment',
        targetId: recipeId,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'comments');
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'comments');
    }
  };

  const toggleReaction = async (emoji: string) => {
    if (!user || !recipeId) return;
    try {
      const existing = reactions.find(r => r.userId === user.uid && r.emoji === emoji);
      if (existing && existing.id) {
        await deleteDoc(doc(db, 'reactions', existing.id));
      } else {
        await addDoc(collection(db, 'reactions'), {
          recipeId,
          userId: user.uid,
          emoji,
          createdAt: new Date().toISOString()
        });
        
        await addDoc(collection(db, 'activities'), {
          userId: user.uid,
          type: 'reaction',
          targetId: recipeId,
          metadata: { emoji },
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'reactions');
    }
  };

  const addCookingLog = async (logData: Omit<CookingLog, 'id' | 'recipeId' | 'userId' | 'createdAt'>) => {
    if (!user || !recipeId) return;
    try {
      await addDoc(collection(db, 'cookingLogs'), {
        recipeId,
        userId: user.uid,
        ...logData,
        createdAt: new Date().toISOString()
      });
      
      await addDoc(collection(db, 'activities'), {
        userId: user.uid,
        type: 'cooking_log',
        targetId: recipeId,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'cookingLogs');
    }
  };

  return {
    comments,
    cookingLogs,
    reactions,
    activities,
    addComment,
    deleteComment,
    toggleReaction,
    addCookingLog
  };
}
