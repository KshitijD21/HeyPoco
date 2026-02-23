import React from 'react';
import { Link } from 'react-router';
import { useLog } from '../context/LogContext';
import { ArrowLeft, CheckCircle, Calendar, Sun, Clock } from 'lucide-react';
import { isToday, isYesterday } from 'date-fns';

export const Snapshot = () => {
  const { logs } = useLog();

  const openCommitments = logs.filter(l => l.category === 'COMMITMENT'); 
  const todayEvents = logs.filter(l => l.category === 'EVENT' && isToday(l.timestamp));
  const yesterdayLogs = logs.filter(l => isYesterday(l.timestamp));
  
  const yesterdaySummary = yesterdayLogs.length > 0 
    ? `You logged ${yesterdayLogs.length} items yesterday, mostly ${
        yesterdayLogs.some(l => l.category === 'EXPENSE') ? 'expenses' : 'notes'
      }.` 
    : "No activity recorded yesterday.";

  return (
    <div className="flex flex-col h-full bg-background relative text-foreground">
       {/* Header */}
       <div className="flex items-center justify-between p-6 border-b border-border/30 sticky top-0 bg-background/95 backdrop-blur z-10">
          <Link to="/" className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors hover:scale-105 active:scale-95">
             <ArrowLeft size={24} strokeWidth={1.5} />
          </Link>
          <div className="flex flex-col items-center">
             <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">Snapshot</span>
             <h1 className="text-lg font-light tracking-tight">Morning Briefing</h1>
          </div>
          <div className="w-8" />
       </div>

       <div className="flex-1 overflow-y-auto p-6 space-y-10">
          
          {/* Commitments Section */}
          <section>
             <h2 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-6 flex items-center gap-2">
                <CheckCircle size={14} className="text-[var(--color-commitment)]" />
                Open Commitments
             </h2>
             {openCommitments.length === 0 ? (
                <div className="p-6 border border-dashed border-border rounded-xl text-center">
                    <p className="text-sm text-muted-foreground italic font-light">No open commitments.</p>
                </div>
             ) : (
                <div className="space-y-4">
                   {openCommitments.map(c => (
                      <div key={c.id} className="flex gap-4 items-start group">
                         <div className="mt-1 text-[var(--color-commitment)] opacity-70 group-hover:opacity-100 transition-opacity">
                            <div className="w-4 h-4 border border-current rounded-full" />
                         </div>
                         <p className="text-base text-foreground font-light leading-relaxed group-hover:text-foreground/80 transition-colors cursor-pointer border-b border-transparent group-hover:border-border pb-1">
                            {c.originalText}
                         </p>
                      </div>
                   ))}
                </div>
             )}
          </section>

          {/* Today's Events */}
          <section>
             <h2 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Calendar size={14} className="text-[var(--color-event)]" />
                Today's Agenda
             </h2>
             {todayEvents.length === 0 ? (
                <div className="p-6 border border-dashed border-border rounded-xl text-center">
                    <p className="text-sm text-muted-foreground italic font-light">Nothing scheduled yet.</p>
                </div>
             ) : (
                <div className="space-y-4">
                   {todayEvents.map(e => (
                      <div key={e.id} className="flex gap-4 items-start pl-1 border-l-2 border-[var(--color-event)]/30">
                         <div className="pl-3">
                            <p className="text-base text-foreground font-light leading-relaxed">{e.originalText}</p>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </section>

          {/* Yesterday Summary */}
          <section className="bg-muted/30 p-6 rounded-2xl border border-border/50">
             <h2 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Clock size={14} />
                Yesterday
             </h2>
             <p className="text-lg text-foreground/80 font-serif italic leading-relaxed">
                "{yesterdaySummary}"
             </p>
          </section>

       </div>
    </div>
  );
};
