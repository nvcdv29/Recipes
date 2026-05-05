import { useEffect, useState } from 'react';
import { useAuthStore as useAuth } from '../stores/authStore';
import { useSocialFeatures } from './useSocialFeatures';

export function useNotifications() {
  const { user } = useAuth();
  const { activities } = useSocialFeatures();
  const [lastActivityId, setLastActivityId] = useState<string | null>(null);

  useEffect(() => {
    // Request permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!user || activities.length === 0) return;

    // Get the most recent activity
    const latestActivity = activities[0]; // Already ordered by desc
    
    // Don't notify if it's the exact same activity we already processed on load
    if (!lastActivityId) {
      setLastActivityId(latestActivity.id || null);
      return;
    }

    if (latestActivity.id !== lastActivityId) {
      setLastActivityId(latestActivity.id || null);

      if (latestActivity.userId !== user.uid) {
        // Simple notification logic
        if ('Notification' in window && Notification.permission === 'granted') {
          let title = 'Neue Familien-Aktivität';
          let body = 'Ein Familienmitglied hat etwas gepostet.';

          switch (latestActivity.type) {
            case 'comment':
              title = 'Neuer Kommentar';
              body = `Jemand hat "${latestActivity.targetName || 'ein Rezept'}" kommentiert.`;
              break;
            case 'recipe_added':
              title = 'Neues Rezept';
              body = `Jemand hat das Rezept "${latestActivity.targetName}" hinzugefügt.`;
              break;
            case 'reaction':
              title = 'Neue Reaktion';
              body = `Jemand hat auf ein Rezept reagiert.`;
              break;
            case 'cooking_log':
              title = 'Jemand kocht!';
              body = `Jemand hat ein Rezept gekocht.`;
              break;
          }

          new Notification(title, {
            body,
            icon: '/icon.svg' // fallback icon
          });
        }
      }
    }
  }, [activities, lastActivityId, user]);
}
