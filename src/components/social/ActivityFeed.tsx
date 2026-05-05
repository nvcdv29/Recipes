import React, { useEffect, useState } from 'react';
import { useSocialFeatures } from '../../hooks/useSocialFeatures';
import { collection, getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Recipe, UserProfile } from '../../types';
import { Link } from 'react-router-dom';

export function ActivityFeed() {
  const { activities } = useSocialFeatures();
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [recipes, setRecipes] = useState<Record<string, Recipe>>({});

  useEffect(() => {
    // Fetch unique users and recipes involved in activities
    const fetchMetadata = async () => {
      const userIds = new Set<string>();
      const recipeIds = new Set<string>();
      
      activities.forEach(log => {
        userIds.add(log.userId);
        if (log.targetId) recipeIds.add(log.targetId);
      });

      const loadedUsers: Record<string, UserProfile> = {};
      for (const uid of userIds) {
        if (!users[uid]) {
          const uDoc = await getDoc(doc(db, 'users', uid));
          if (uDoc.exists()) {
            loadedUsers[uid] = uDoc.data() as UserProfile;
          }
        }
      }
      if (Object.keys(loadedUsers).length > 0) {
        setUsers(prev => ({ ...prev, ...loadedUsers }));
      }

      const loadedRecipes: Record<string, Recipe> = {};
      for (const rid of recipeIds) {
        if (!recipes[rid]) {
          const rDoc = await getDoc(doc(db, 'recipes', rid));
          if (rDoc.exists()) {
            loadedRecipes[rid] = rDoc.data() as Recipe;
          }
        }
      }
      if (Object.keys(loadedRecipes).length > 0) {
        setRecipes(prev => ({ ...prev, ...loadedRecipes }));
      }
    };

    if (activities.length > 0) {
      fetchMetadata();
    }
  }, [activities]);

  const renderActivityText = (activity: any) => {
    const userName = users[activity.userId]?.displayName || 'Ein Benutzer';
    const recipeName = recipes[activity.targetId]?.title || activity.targetName || 'ein Rezept';
    
    const recipeLink = <Link to={`/recipes/${activity.targetId}`} className="font-semibold text-green-600 hover:underline">{recipeName}</Link>;

    switch (activity.type) {
      case 'recipe_added':
        return <span><span className="font-medium">{userName}</span> hat {recipeLink} hinzugefügt.</span>;
      case 'cooking_log':
        return <span><span className="font-medium">{userName}</span> hat {recipeLink} gekocht!</span>;
      case 'comment':
        return <span><span className="font-medium">{userName}</span> hat {recipeLink} kommentiert.</span>;
      case 'reaction':
        return <span><span className="font-medium">{userName}</span> hat mit {activity.metadata?.emoji} auf {recipeLink} reagiert.</span>;
      case 'recommendation':
        return <span><span className="font-medium">{userName}</span> empfiehlt {recipeLink}.</span>;
      default:
        return <span><span className="font-medium">{userName}</span> hat mit {recipeLink} interagiert.</span>;
    }
  };

  if (activities.length === 0) {
    return (
      <div className="bg-white dark:bg-surface-container-low p-6 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 text-center text-gray-500">
        Noch keine Aktivitäten vorhanden.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-surface-container-low rounded-xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-surface-container-high">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Familien-Aktivitäten</h3>
      </div>
      <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
        {activities.map(activity => (
          <div key={activity.id} className="p-4 hover:bg-gray-50 dark:bg-surface-container-high transition-colors flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
              {users[activity.userId]?.photoURL ? (
                <img src={users[activity.userId].photoURL} alt="" className="dark:brightness-90 transition-all w-full h-full rounded-full" />
              ) : (
                <span className="font-bold text-sm">{(users[activity.userId]?.displayName || '?')[0]}</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-gray-800 dark:text-gray-200 text-sm">{renderActivityText(activity)}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(activity.createdAt).toLocaleString(undefined, {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
