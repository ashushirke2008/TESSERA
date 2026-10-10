import React from 'react';
import { LucideIcon, Info } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  stageNotice?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  stageNotice,
  actionText,
  onAction,
}) => {
  return (
    <div className="empty-state">
      <div className="empty-icon-wrap">
        <Icon size={28} />
      </div>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-description">{description}</p>
      {stageNotice && (
        <div className="stage-badge-notice">
          <Info size={14} />
          <span>{stageNotice}</span>
        </div>
      )}
      {actionText && onAction && (
        <button className="btn btn-primary" onClick={onAction} style={{ marginTop: '1.25rem' }}>
          {actionText}
        </button>
      )}
    </div>
  );
};
