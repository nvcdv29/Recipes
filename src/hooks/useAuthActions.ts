import { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendSignInLinkToEmail 
} from 'firebase/auth';
import { auth } from '../firebase';
import { toast } from 'sonner';
import { Settings } from '../types';

export function useAuthActions(settings: Settings) {
  const handleLogin = async (email?: string, password?: string) => {
    try {
      if (email && password) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Willkommen zurück!");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("Login fehlgeschlagen: " + (error.code === 'auth/user-not-found' ? 'Benutzer nicht gefunden' : error.message));
    }
  };

  const handleForgotPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("E-Mail zum Zurücksetzen des Passworts wurde gesendet!");
    } catch (error: any) {
      toast.error("Fehler: " + error.message);
    }
  };

  const handleMagicLink = async (email: string) => {
    if (!settings.allowMagicLink) {
      toast.error("Magic Link ist derzeit deaktiviert.");
      return;
    }
    const actionCodeSettings = {
      url: window.location.href,
      handleCodeInApp: true,
    };
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      toast.success("Magic Link wurde an deine E-Mail gesendet!");
    } catch (error: any) {
      toast.error("Fehler: " + error.message);
    }
  };

  return { handleLogin, handleForgotPassword, handleMagicLink };
}
