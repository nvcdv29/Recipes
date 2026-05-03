import { AdminView } from '../components/layout/AdminView';
import { useNavigate } from 'react-router-dom';

export const SettingsPage = () => {
  const navigate = useNavigate();
  return <AdminView onBack={() => navigate('/')} />;
};
