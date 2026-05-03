import { BookOpen } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
}

export const EmptyState = ({ title, description }: EmptyStateProps) => {
  return (
    <div className="text-center py-24">
      <BookOpen size={64} className="mx-auto text-outline-variant mb-4 opacity-20" />
      <h3 className="text-xl font-medium text-on-surface-variant">{title}</h3>
      <p className="text-on-surface-variant/60 mt-2">{description}</p>
    </div>
  );
};
