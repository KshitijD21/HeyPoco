import { format } from 'date-fns';

export type LogCategory = 'EXPENSE' | 'COMMITMENT' | 'EVENT' | 'NOTE';

export interface LogEntry {
  id: string;
  originalText: string;
  timestamp: number;
  category: LogCategory;
  details: {
    amount?: number;
    person?: string;
    date?: string; // ISO date string for future events
    duration?: string;
    merchant?: string;
    summary?: string;
  };
}

const EXPENSE_KEYWORDS = ['spent', 'paid', 'cost', 'bought', '$', 'dollars', 'euros'];
const COMMITMENT_KEYWORDS = ['will', 'going to', 'promise', 'remind me', 'plan to', 'need to'];
const EVENT_KEYWORDS = ['met', 'saw', 'meeting', 'went to', 'visited', 'attended'];

export const processLog = async (text: string): Promise<LogEntry> => {
  // Simulate AI delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  const lowerText = text.toLowerCase();
  let category: LogCategory = 'NOTE';
  const details: LogEntry['details'] = {};

  // Detect Category
  if (EXPENSE_KEYWORDS.some(k => lowerText.includes(k))) {
    category = 'EXPENSE';
    // extremely basic extraction
    const amountMatch = text.match(/(\d+(?:\.\d{1,2})?)/);
    if (amountMatch) {
      details.amount = parseFloat(amountMatch[0]);
    }
  } else if (COMMITMENT_KEYWORDS.some(k => lowerText.includes(k))) {
    category = 'COMMITMENT';
  } else if (EVENT_KEYWORDS.some(k => lowerText.includes(k))) {
    category = 'EVENT';
  }

  // Generate a summary (naive)
  details.summary = text.length > 50 ? text.substring(0, 47) + '...' : text;

  return {
    id: crypto.randomUUID(),
    originalText: text,
    timestamp: Date.now(),
    category,
    details,
  };
};

export const generateResponse = (entry: LogEntry): string => {
  switch (entry.category) {
    case 'EXPENSE':
      return `Got it. Logged $${entry.details.amount || 'amount'} for that.`;
    case 'COMMITMENT':
      return `Okay, I've noted that commitment.`;
    case 'EVENT':
      return `Sounds good. I've added that to your timeline.`;
    default:
      return `Saved.`;
  }
};
