import React, { createContext, useContext, useState, useEffect } from 'react';
import { LogEntry, processLog } from '../services/mockAI';

interface LogContextType {
  logs: LogEntry[];
  addLog: (text: string) => Promise<LogEntry>;
  clearLogs: () => void;
  isLoading: boolean;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

export const useLog = () => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error('useLog must be used within a LogProvider');
  }
  return context;
};

export const LogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load from local storage
  useEffect(() => {
    const stored = localStorage.getItem('heypoco_logs');
    if (stored) {
      setLogs(JSON.parse(stored));
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('heypoco_logs', JSON.stringify(logs));
  }, [logs]);

  const addLog = async (text: string) => {
    setIsLoading(true);
    try {
      const entry = await processLog(text);
      setLogs(prev => [entry, ...prev]);
      return entry;
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <LogContext.Provider value={{ logs, addLog, clearLogs, isLoading }}>
      {children}
    </LogContext.Provider>
  );
};
