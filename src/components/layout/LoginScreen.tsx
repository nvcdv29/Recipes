import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  ChefHat, 
  Mail, 
  Lock, 
  UserPlus, 
  User as UserIcon,
  Loader2
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { Button } from '../ui/Button';

interface LoginScreenProps {
  onLogin: (email?: string, password?: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  onMagicLink: (email: string) => Promise<void>;
  settings: any;
  isBlocked: boolean;
  onReset: () => void;
}

export const LoginScreen = ({ 
  onLogin, 
  onForgotPassword, 
  onMagicLink, 
  settings, 
  isBlocked, 
  onReset 
}: LoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (showForgotPassword) {
        await onForgotPassword(email);
        setShowForgotPassword(false);
      } else if (isRegister) {
        if (!settings.allowRegistration) {
          toast.error("Registrierung ist derzeit deaktiviert.");
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success("Konto erstellt!");
      } else {
        await onLogin(email, password);
      }
    } catch (error: any) {
      toast.error(error.message || "Aktion fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
        <Toaster position="top-center" richColors />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-surface-container-low p-12 rounded-[2.5rem] shadow-2xl border border-red-100"
        >
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-8">
            <ShieldAlert size={40} />
          </div>
          <h1 className="text-3xl font-serif font-bold text-red-600 mb-4">Zugriff verweigert</h1>
          <p className="text-on-surface-variant mb-10 leading-relaxed">
            Deine E-Mail-Adresse ist nicht auf der Whitelist. Bitte kontaktiere den Administrator (Noah), um Zugriff zu erhalten.
          </p>
          <Button onClick={onReset} variant="secondary" className="w-full">Zurück zum Login</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
      <Toaster position="top-center" richColors />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white dark:bg-surface-container-low p-12 rounded-[2.5rem] shadow-2xl shadow-primary/5 border border-outline-variant/10"
      >
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto mb-8">
          <ChefHat size={40} />
        </div>
        <h1 className="text-4xl font-serif font-bold text-primary mb-4">Heirloom</h1>
        <p className="text-on-surface-variant mb-10 leading-relaxed">
          {showForgotPassword ? 'Passwort zurücksetzen' : 'Deine private Familiensammlung für Rezepte und Erinnerungen.'}
        </p>

        <div className="space-y-4">
          {settings.allowGoogleLogin && !showForgotPassword && (
            <Button onClick={() => onLogin()} className="w-full py-4 text-lg" icon={UserIcon}>
              Mit Google anmelden
            </Button>
          )}

          {settings.allowGoogleLogin && settings.allowEmailLogin && !showForgotPassword && (
            <div className="flex items-center gap-4 my-6">
              <div className="h-px flex-1 bg-outline-variant/20" />
              <span className="text-xs font-bold text-on-surface-variant/40 uppercase tracking-widest">Oder</span>
              <div className="h-px flex-1 bg-outline-variant/20" />
            </div>
          )}

          {settings.allowEmailLogin && (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 ml-4">E-Mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={18} />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="deine@email.de"
                  />
                </div>
              </div>
              
              {!showForgotPassword && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 ml-4">Passwort</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={18} />
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full py-4 text-lg" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : (showForgotPassword ? <Mail /> : (isRegister ? <UserPlus /> : <Lock />))}
                {showForgotPassword ? 'Link senden' : (isRegister ? 'Konto erstellen' : 'Anmelden')}
              </Button>

              {!showForgotPassword && (
                <div className="flex flex-col gap-2 mt-4">
                  {settings.allowMagicLink && (
                    <button 
                      type="button"
                      onClick={() => {
                        if (!email.trim()) {
                          toast.error("Bitte gib zuerst deine E-Mail-Adresse ein.");
                          return;
                        }
                        onMagicLink(email);
                      }}
                      className="text-sm text-primary font-medium hover:underline flex items-center justify-center gap-2"
                    >
                      <Mail size={14} /> Magic Link senden
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-on-surface-variant/60 hover:underline"
                  >
                    Passwort vergessen?
                  </button>
                  {settings.allowRegistration && (
                    <button 
                      type="button"
                      onClick={() => setIsRegister(!isRegister)}
                      className="text-sm text-primary font-medium hover:underline mt-2"
                    >
                      {isRegister ? 'Bereits ein Konto? Anmelden' : 'Noch kein Konto? Registrieren'}
                    </button>
                  )}
                </div>
              )}

              {showForgotPassword && (
                <button 
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full text-sm text-primary font-medium hover:underline mt-4"
                >
                  Zurück zum Login
                </button>
              )}
            </form>
          )}
        </div>

        <p className="mt-8 text-xs text-on-surface-variant/40 uppercase tracking-widest font-semibold">
          {settings.restrictToWhitelist ? 'Nur für autorisierte Mitglieder' : 'Willkommen in der Familie'}
        </p>
      </motion.div>
    </div>
  );
};
