import React from 'react';
import { AssetStatus } from '../../types';

interface StatusBadgeProps {
  status: AssetStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getBadgeClass = (s: string) => {
    switch (s) {
      case 'DRAFT':
        return 'badge-draft';
      case 'REGISTERED':
        return 'badge-registered';
      case 'PENDING_VERIFICATION':
        return 'badge-warn';
      case 'VERIFIED':
        return 'badge-verified';
      case 'APPROVED':
        return 'badge-approved';
      case 'TOKENIZED':
        return 'badge-tokenized';
      case 'REJECTED':
        return 'badge-danger';
      case 'UP':
      case 'healthy':
      case 'READY':
        return 'badge-verified';
      case 'unconfigured':
      case 'NOT_READY':
        return 'badge-warn';
      case 'disconnected':
      case 'OFFLINE':
      case 'DOWN':
        return 'badge-danger';
      default:
        return 'badge-draft';
    }
  };

  return (
    <span className={`badge ${getBadgeClass(status)}`}>
      <span className="status-dot" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor' }} />
      {status.replace(/_/g, ' ')}
    </span>
  );
};
