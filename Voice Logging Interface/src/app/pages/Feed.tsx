import React from 'react';
import { Link } from 'react-router';
import { useLog } from '../context/LogContext';
import { FeedItem } from '../components/FeedItem'; 
import { ArrowLeft, Filter } from 'lucide-react';

export const Feed = () => {
    const { logs } = useLog();

    const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);

    return (
        <div className="flex flex-col h-full bg-background text-foreground relative transition-colors duration-500">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/30 sticky top-0 bg-background/95 backdrop-blur z-10">
                <Link to="/" className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors hover:scale-105 active:scale-95">
                    <ArrowLeft size={24} strokeWidth={1.5} />
                </Link>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">Logbook</span>
                    <h1 className="text-lg font-light tracking-tight">Recent Activity</h1>
                </div>
                <button className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                    <Filter size={20} strokeWidth={1.5} />
                </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-hide">
                {sortedLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 space-y-6">
                        <div className="w-16 h-16 border-2 border-dashed border-muted-foreground/20 rounded-full flex items-center justify-center">
                             <span className="text-2xl opacity-50">?</span>
                        </div>
                        <p className="text-sm font-light tracking-wide">No logs yet. Start speaking!</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1 pb-20">
                        {/* Date Separators could be added here later */}
                        {sortedLogs.map((log) => (
                             <FeedItem key={log.id} log={log} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
