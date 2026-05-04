import React, { useState } from 'react';
import { useSocialFeatures } from '../../hooks/useSocialFeatures';
import { Button } from '../ui/Button';
import { CookingLog } from '../../types';
import { auth } from '../../firebase';

interface CookingLogCardProps {
  recipeId: string;
}

export function CookingLogCard({ recipeId }: CookingLogCardProps) {
  const { cookingLogs, addCookingLog } = useSocialFeatures(recipeId);
  const [showForm, setShowForm] = useState(false);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  // Placeholder for real photo upload functionality
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addCookingLog({
      cookedDate: new Date().toISOString(),
      photos,
      notes
    });
    setNotes('');
    setPhotos([]);
    setShowForm(false);
  };

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Gekocht ({cookingLogs.length})</h3>
        <Button onClick={() => setShowForm(!showForm)} variant="secondary" className="px-3 py-1.5 text-sm">
          {showForm ? 'Abbrechen' : 'Ich habe das gekocht!'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg mb-6 shadow-inner">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notizen / Anpassungen</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              rows={3}
              placeholder="Was hast du verändert? Hat es geschmeckt?"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Foto-URLs (kommagetrennt)</label>
            <input
              type="text"
              value={photos.join(', ')}
              onChange={(e) => setPhotos(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              placeholder="https://..."
            />
          </div>
          <Button type="submit">Speichern</Button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cookingLogs.map(log => (
          <div key={log.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col">
            <span className="text-xs text-gray-500 mb-2">
              Am {new Date(log.cookedDate).toLocaleDateString()}
            </span>
            {log.notes && <p className="text-gray-700 text-sm mb-3 flex-grow">{log.notes}</p>}
            {log.photos && log.photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {log.photos.map((photo, i) => (
                  <img 
                    key={i} 
                    src={photo} 
                    alt="Cooked dish" 
                    className="w-20 h-20 object-cover rounded-md flex-shrink-0" 
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Bild+Fehler'; }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
        {cookingLogs.length === 0 && !showForm && (
          <div className="col-span-full py-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            Noch keine Koch-Logs. Sei der Erste!
          </div>
        )}
      </div>
    </div>
  );
}
