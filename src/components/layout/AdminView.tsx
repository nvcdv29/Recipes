import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  ShieldCheck, 
  Users, 
  Plus, 
  Trash2, 
  UserPlus 
} from 'lucide-react';
import { 
  onSnapshot, 
  doc, 
  collection, 
  setDoc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '../../firebase';
import { 
  Settings, 
  AllowedUser, 
  UserProfile, 
  OperationType 
} from '../../types';
import { handleFirestoreError } from '../../services/firestore';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

interface AdminViewProps {
  onBack: () => void;
}

export const AdminView = ({ onBack }: AdminViewProps) => {
  const [settings, setSettings] = useState<Settings>({
    allowGoogleLogin: false,
    allowEmailLogin: true,
    restrictToWhitelist: true,
    allowRegistration: true,
    allowMagicLink: true
  });
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) setSettings({
        allowGoogleLogin: false,
        allowEmailLogin: true,
        restrictToWhitelist: true,
        allowRegistration: true,
        allowMagicLink: true,
        ...doc.data()
      } as Settings);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });

    const unsubAllowedUsers = onSnapshot(collection(db, 'allowedUsers'), (snap) => {
      setAllowedUsers(snap.docs.map(d => d.data()) as any);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'allowedUsers');
    });

    const unsubAllUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setAllUsers(snap.docs.map(d => d.data() as UserProfile));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => { unsubSettings(); unsubAllowedUsers(); unsubAllUsers(); };
  }, []);

  const toggleSetting = async (key: keyof Settings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    try {
      await setDoc(doc(db, 'settings', 'global'), newSettings);
      toast.success("Einstellungen aktualisiert");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/global');
    }
  };

  const addAllowedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    try {
      await setDoc(doc(db, 'allowedUsers', newEmail), {
        email: newEmail,
        addedAt: new Date().toISOString()
      });
      setNewEmail('');
      toast.success("Benutzer hinzugefügt");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `allowedUsers/${newEmail}`);
    }
  };

  const removeAllowedUser = async (email: string) => {
    try {
      await deleteDoc(doc(db, 'allowedUsers', email));
      toast.success("Benutzer entfernt");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `allowedUsers/${email}`);
    }
  };

  const toggleUserRole = async (user: UserProfile) => {
    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      await updateDoc(doc(db, 'users', user.uid), { role: newRole });
      toast.success(`Rolle für ${user.displayName || user.email} geändert`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const deleteUser = async (user: UserProfile) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid));
      toast.success("Benutzerprofil gelöscht");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-12 pb-24"
    >
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-4xl font-serif font-bold text-primary">Admin-Bereich</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Settings */}
        <div className="bg-white dark:bg-surface-container-low rounded-[2.5rem] p-8 shadow-xl border border-outline-variant/10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-xl font-serif font-bold">Login-Einstellungen</h3>
          </div>
          
          <div className="space-y-6">
            {[
              { key: 'allowGoogleLogin', label: 'Google Login erlauben', desc: 'Nutzer können sich mit Google anmelden.' },
              { key: 'allowEmailLogin', label: 'E-Mail Login erlauben', desc: 'Nutzer können E-Mail & Passwort nutzen.' },
              { key: 'allowRegistration', label: 'Registrierung erlauben', desc: 'Neue Nutzer können Konten erstellen.' },
              { key: 'allowMagicLink', label: 'Magic Link erlauben', desc: 'Nutzer können sich per E-Mail-Link anmelden.' },
              { key: 'restrictToWhitelist', label: 'Whitelist erzwingen', desc: 'Nur Nutzer auf der Liste haben Zugriff.' }
            ].map((s: any) => (
              <div key={s.key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{s.label}</p>
                  <p className="text-xs text-on-surface-variant/60">{s.desc}</p>
                </div>
                <button
                  onClick={() => toggleSetting(s.key)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    settings[s.key as keyof Settings] ? "bg-primary" : "bg-outline-variant"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                    settings[s.key as keyof Settings] ? "left-7" : "left-1"
                  )} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Whitelist */}
        <div className="bg-white dark:bg-surface-container-low rounded-[2.5rem] p-8 shadow-xl border border-outline-variant/10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Users size={24} />
            </div>
            <h3 className="text-xl font-serif font-bold">Whitelist</h3>
          </div>

          <form onSubmit={addAllowedUser} className="flex gap-2 mb-6">
            <input 
              type="email" 
              placeholder="E-Mail hinzufügen..."
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className="flex-1 px-4 py-2 bg-surface-container-low rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
            />
            <Button type="submit" className="px-4 py-2" icon={Plus}>Hinzufügen</Button>
          </form>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
            {allowedUsers.map(u => (
              <div key={u.email} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl group">
                <span className="text-sm font-medium">{u.email}</span>
                <button 
                  onClick={() => removeAllowedUser(u.email)}
                  className="p-1.5 text-on-surface-variant/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {allowedUsers.length === 0 && !loading && (
              <p className="text-center py-8 text-sm text-on-surface-variant/40 italic">Keine Nutzer auf der Whitelist</p>
            )}
          </div>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-white dark:bg-surface-container-low rounded-[2.5rem] p-8 shadow-xl border border-outline-variant/10 mt-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <UserPlus size={24} />
          </div>
          <h3 className="text-xl font-serif font-bold">Nutzerverwaltung</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/20 text-sm text-on-surface-variant/60">
                <th className="pb-4 font-medium">Name</th>
                <th className="pb-4 font-medium">E-Mail</th>
                <th className="pb-4 font-medium">Rolle</th>
                <th className="pb-4 font-medium text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map(u => (
                <tr key={u.uid} className="border-b border-outline-variant/10 last:border-0">
                  <td className="py-4 font-medium">{u.displayName || '-'}</td>
                  <td className="py-4 text-on-surface-variant">{u.email}</td>
                  <td className="py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                      u.role === 'admin' ? "bg-primary/10 text-primary" : "bg-surface-container-high text-on-surface-variant"
                    )}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => toggleUserRole(u)}
                        className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title={u.role === 'admin' ? "Zum Nutzer machen" : "Zum Admin machen"}
                      >
                        <ShieldCheck size={18} />
                      </button>
                      <button 
                        onClick={() => deleteUser(u)}
                        className="p-2 text-on-surface-variant hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Benutzer löschen"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {allUsers.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-sm text-on-surface-variant/40 italic">
                    Keine registrierten Nutzer
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
