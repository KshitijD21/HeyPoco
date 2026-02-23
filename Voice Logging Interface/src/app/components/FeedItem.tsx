import React from 'react';
import { LogEntry } from '../services/mockAI';
import { format } from 'date-fns';
import { DollarSign, Calendar, StickyNote, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'EXPENSE': return <DollarSign size={14} />;
    case 'COMMITMENT': return <CheckCircle size={14} />;
    case 'EVENT': return <Calendar size={14} />;
    default: return <StickyNote size={14} />;
  }
};

const getCategoryStyles = (category: string) => {
  switch (category) {
    case 'EXPENSE': return 'bg-[var(--color-expense)]/10 text-[var(--color-expense)] border-[var(--color-expense)]/20';
    case 'COMMITMENT': return 'bg-[var(--color-commitment)]/10 text-[var(--color-commitment)] border-[var(--color-commitment)]/20';
    case 'EVENT': return 'bg-[var(--color-event)]/10 text-[var(--color-event)] border-[var(--color-event)]/20';
    default: return 'bg-[var(--color-note)]/10 text-[var(--color-note)] border-[var(--color-note)]/20';
  }
};

const getCategoryText = (category: string) => {
  switch (category) {
    case 'EXPENSE': return 'text-[var(--color-expense)]';
    case 'COMMITMENT': return 'text-[var(--color-commitment)]';
    case 'EVENT': return 'text-[var(--color-event)]';
    default: return 'text-[var(--color-note)]';
  }
}

export const FeedItem: React.FC<{ log: LogEntry }> = ({ log }) => {
  return (
    <div className="flex gap-4 py-5 border-b border-border/40 last:border-0 group hover:bg-black/[0.02] transition-colors px-2 -mx-2 rounded-lg">
      <div className="flex flex-col items-center gap-1 min-w-[3rem] pt-1">
        <span className="text-xs font-medium text-muted-foreground font-mono">{format(log.timestamp, 'HH:mm')}</span>
      </div>
      
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
            <div className={clsx("p-1.5 rounded-md border", getCategoryStyles(log.category))}>
                {getCategoryIcon(log.category)}
            </div>
            <span className={clsx("text-[10px] font-bold tracking-widest uppercase", getCategoryText(log.category))}>
                {log.category}
            </span>
        </div>
        
        <p className="text-base text-foreground font-light leading-relaxed">
            {log.originalText}
        </p>
        
        {log.category === 'EXPENSE' && log.details.amount && (
            <div className="text-lg font-medium text-foreground tracking-tight mt-1">
                ${log.details.amount.toFixed(2)}
            </div>
        )}
      </div>
    </div>
  );
};
