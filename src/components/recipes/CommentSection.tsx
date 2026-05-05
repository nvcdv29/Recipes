import React, { useState, useEffect, useRef } from 'react';
import { useSocialFeatures } from '../../hooks/useSocialFeatures';
import { Button } from '../ui/Button';
import { useAuthStore as useAuth } from '../../stores/authStore';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserProfile } from '../../types';

interface CommentSectionProps {
  recipeId: string;
}

export function CommentSection({ recipeId }: CommentSectionProps) {
  const { comments, addComment, deleteComment } = useSocialFeatures(recipeId);
  const { userProfile, user } = useAuth();
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Fetch all users for @ mentions (in a real app, you might want to fetch this more efficiently)
    getDocs(collection(db, 'users')).then(snapshot => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    });
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);

    // Simple mention detection
    const match = value.match(/@(\w*)$/);
    if (match) {
      setShowMentionSuggestions(true);
      setMentionFilter(match[1]);
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const handleMentionSelect = (selectedUser: UserProfile) => {
    const newText = text.replace(/@\w*$/, `@${selectedUser.displayName} `);
    setText(newText);
    if (!mentions.includes(selectedUser.uid)) {
      setMentions([...mentions, selectedUser.uid]);
    }
    setShowMentionSuggestions(false);
    inputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    await addComment(text, mentions);
    setText('');
    setMentions([]);
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Kommentare ({comments.length})</h3>
      
      <div className="space-y-4 mb-6">
        {comments.map(comment => {
          const author = users.find(u => u.uid === comment.userId);
          return (
            <div key={comment.id} className="bg-white dark:bg-surface-container-low p-4 rounded-lg shadow-sm border border-gray-100 dark:border-white/10">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-gray-900 dark:text-white">{author?.displayName || 'Benutzer'}</span>
                <span className="text-sm text-gray-500">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{comment.text}</p>
              {(user?.uid === comment.userId || userProfile?.role === 'admin') && (
                <button 
                  onClick={() => comment.id && deleteComment(comment.id)}
                  className="text-red-500 text-xs mt-2 hover:underline"
                >
                  Löschen
                </button>
              )}
            </div>
          )
        })}
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleInput}
          placeholder="Schreibe einen Kommentar... (Gebrauche @ für Erwähnungen)"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[100px]"
        />
        
        {showMentionSuggestions && users.length > 0 && (
          <div className="absolute bottom-full left-0 z-10 w-64 bg-white dark:bg-surface-container-low rounded-md shadow-lg border border-gray-200 dark:border-white/10 mb-1 max-h-48 overflow-y-auto">
            {users
              .filter(u => u.displayName?.toLowerCase().includes(mentionFilter.toLowerCase()))
              .map(u => (
                <button
                  key={u.uid}
                  type="button"
                  onClick={() => handleMentionSelect(u)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:bg-surface-container-high text-sm focus:bg-gray-100"
                >
                  {u.displayName}
                </button>
              ))}
          </div>
        )}
        
        <div className="flex justify-end mt-2">
          <Button type="submit" disabled={!text.trim()}>
            Kommentieren
          </Button>
        </div>
      </form>
    </div>
  );
}
