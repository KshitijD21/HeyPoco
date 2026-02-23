import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Send, Settings, Sun, List, Pause, Sparkles } from 'lucide-react';
import { useLog } from '../context/LogContext';

const PRESET_LOGS = [
  "I spent $12 on coffee at Starbucks.",
  "Remind me to call Mom tomorrow at 5pm.",
  "Met Sarah for lunch, we talked about the project.",
  "Paid $50 for dinner, shared with John and Mike.",
  "Going to the gym at 6pm today.",
  "Bought groceries for $85.",
];

export const VoiceInterface: React.FC = () => {
  const { addLog, logs } = useLog();
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [messages, setMessages] = useState<{ id: string; text: string; sender: 'user' | 'ai' }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isListening, processing]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isListening) {
      // Simulate listening duration before auto-cut (for demo purposes)
      timer = setTimeout(() => {
        stopListeningAndProcess();
      }, 3500);
    }
    return () => clearTimeout(timer);
  }, [isListening]);

  const stopListeningAndProcess = () => {
    setIsListening(false);
    const randomText = PRESET_LOGS[Math.floor(Math.random() * PRESET_LOGS.length)];
    
    // Add user message immediately
    const userMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: userMsgId, text: randomText, sender: 'user' }]);
    
    // Then process
    setProcessing(true);
    setTimeout(async () => {
        try {
            const log = await addLog(randomText);
            let responseText = "Saved.";
            if (log.category === 'EXPENSE') responseText = `Got it. $${log.details.amount || 0} tracked.`;
            else if (log.category === 'COMMITMENT') responseText = "Commitment noted.";
            else if (log.category === 'EVENT') responseText = "Event logged.";
            else responseText = "Noted.";
            
            setMessages(prev => [...prev, { id: crypto.randomUUID(), text: responseText, sender: 'ai' }]);
        } catch (e) {
            console.error(e);
        } finally {
            setProcessing(false);
        }
    }, 1200);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: userMsgId, text, sender: 'user' }]);
    setInputText('');
    setProcessing(true);

    try {
      const log = await addLog(text);
      let responseText = "Saved.";
      if (log.category === 'EXPENSE') responseText = `Got it. $${log.details.amount || 0} tracked.`;
      else if (log.category === 'COMMITMENT') responseText = "Commitment noted.";
      else if (log.category === 'EVENT') responseText = "Event logged.";
      
      setTimeout(() => {
        setMessages(prev => [...prev, { id: crypto.randomUUID(), text: responseText, sender: 'ai' }]);
        setProcessing(false);
      }, 800);
      
    } catch (error) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), text: "Sorry, I couldn't save that.", sender: 'ai' }]);
      setProcessing(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListeningAndProcess();
    } else {
      setIsListening(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground relative transition-colors duration-500 overflow-hidden">
      
      {/* Dynamic Background */}
      <div className={`absolute inset-0 pointer-events-none transition-colors duration-1000 ${isListening ? 'bg-primary/5' : 'bg-transparent'}`} />

      {/* Header */}
      <div className="flex justify-between items-center p-6 z-10">
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-xs font-bold tracking-widest uppercase opacity-40">HeyPoco</span>
         </div>
         <div className="flex gap-6 opacity-60">
            <Link to="/feed" className="hover:text-primary hover:scale-110 transition-all"><List size={20} strokeWidth={1.5} /></Link>
            <Link to="/snapshot" className="hover:text-primary hover:scale-110 transition-all"><Sun size={20} strokeWidth={1.5} /></Link>
            <Settings size={20} strokeWidth={1.5} className="cursor-not-allowed opacity-50" />
         </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative z-0">
        
        {/* Chat / History Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8 scrollbar-hide" ref={scrollRef}>
          {messages.length === 0 && !isListening && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 space-y-6">
               <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                  <Sparkles size={24} className="opacity-20" />
               </div>
               <p className="text-lg font-light tracking-tight text-center max-w-[200px]">
                 Speak naturally. <br/> I'll handle the rest.
               </p>
            </div>
          )}

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              {msg.sender === 'ai' && (
                 <span className="text-[9px] font-bold text-muted-foreground/50 mb-2 ml-1 uppercase tracking-widest">Poco</span>
              )}
              <div
                className={`max-w-[85%] px-5 py-4 rounded-2xl text-base leading-relaxed font-light shadow-sm
                ${msg.sender === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-br-sm' 
                  : 'bg-card border border-border/50 text-card-foreground rounded-bl-sm shadow-sm'
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}

          {/* Listening State Visualization */}
          <AnimatePresence>
            {isListening && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center justify-center py-10 space-y-4"
              >
                <div className="flex items-center gap-1.5 h-12">
                   {[1, 2, 3, 4, 5, 4, 3, 2].map((i, index) => (
                     <motion.div
                       key={index}
                       className="w-1.5 bg-primary rounded-full"
                       animate={{ 
                         height: [8, 32, 8],
                         opacity: [0.3, 1, 0.3] 
                       }}
                       transition={{ 
                         repeat: Infinity, 
                         duration: 0.8, 
                         delay: i * 0.1,
                         ease: "easeInOut"
                       }}
                     />
                   ))}
                </div>
                <span className="text-sm font-medium text-muted-foreground tracking-widest uppercase animate-pulse">Listening...</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Processing State */}
          {processing && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="flex flex-col items-start"
            >
               <span className="text-[9px] font-bold text-muted-foreground/50 mb-2 ml-1 uppercase tracking-widest">Poco</span>
               <div className="bg-card border border-border/50 px-6 py-4 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1.5">
                 <motion.div className="w-1.5 h-1.5 bg-foreground/30 rounded-full" animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1 }} />
                 <motion.div className="w-1.5 h-1.5 bg-foreground/30 rounded-full" animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} />
                 <motion.div className="w-1.5 h-1.5 bg-foreground/30 rounded-full" animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} />
               </div>
            </motion.div>
          )}
          
          <div className="h-20" /> {/* Spacer */}
        </div>
      </div>

      {/* Input / Control Area */}
      <div className="p-6 pb-8 bg-gradient-to-t from-background via-background to-transparent z-20">
        <div className="relative flex flex-col items-center gap-6">
          
          {/* Main Mic Button */}
          <div className="relative group">
            {/* Pulse Effect Background */}
            <div className={`absolute inset-0 rounded-full bg-primary/10 blur-xl transition-all duration-1000 ${isListening ? 'scale-150 opacity-100' : 'scale-75 opacity-0'}`} />
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleListening}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 z-10
                ${isListening 
                  ? 'bg-destructive text-white scale-110 rotate-180' 
                  : 'bg-foreground text-background hover:scale-105'
                }
              `}
            >
              <AnimatePresence mode="wait">
                {isListening ? (
                  <motion.div
                    key="stop"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                  >
                     <Pause size={32} fill="currentColor" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="mic"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                     <Mic size={32} strokeWidth={1.5} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {/* Text Input (Subtle) */}
          <div className={`w-full transition-all duration-500 ${isListening ? 'opacity-0 translate-y-10 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
            <div className="relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                placeholder="Or type here..."
                className="w-full pl-5 pr-12 py-4 bg-muted/50 border border-transparent rounded-2xl text-base font-light focus:outline-none focus:bg-background focus:ring-1 focus:ring-primary/20 focus:border-border transition-all placeholder:text-muted-foreground/60 shadow-inner"
                disabled={isListening}
              />
              <button 
                onClick={() => handleSendMessage(inputText)}
                disabled={!inputText.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors"
              >
                <Send size={18} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
