import { useAuthStore } from '../stores/authStore';

/**
 * Returns true when the current user has the 'viewer' role.
 * Viewers can read recipes but cannot create, edit, or delete anything.
 */
export const useIsViewer = (): boolean => {
  const userProfile = useAuthStore(state => state.userProfile);
  return userProfile?.role === 'viewer';
};
