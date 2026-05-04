import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Home } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-9xl font-bold text-primary opacity-20">404</h1>
      <h2 className="text-3xl font-serif font-bold text-on-surface mt-4">Seite nicht gefunden</h2>
      <p className="text-on-surface-variant mt-4 max-w-md">
        Die gesuchte Seite existiert nicht oder wurde verschoben.
      </p>
      <div className="mt-8">
        <Link to="/">
          <Button icon={Home}>Zurück zur Startseite</Button>
        </Link>
      </div>
    </div>
  );
};
