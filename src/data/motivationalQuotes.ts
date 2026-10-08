export interface MotivationalQuote {
  id: number;
  quote: string;
  author: string;
  theme: 'Money & Wealth' | 'Daily Consistency' | 'Closing Deals' | 'Pipeline Mastery' | 'Relentless Execution';
}

export const MOTIVATIONAL_QUOTES: MotivationalQuote[] = [
  {
    id: 1,
    quote: "The money you want is in the phone calls you're avoiding. Dial the number, change your reality.",
    author: "Sales Mindset",
    theme: "Money & Wealth",
  },
  {
    id: 2,
    quote: "Consistency is the ultimate competitive advantage. While others stop at the first 'no', champions build empires on follow-ups.",
    author: "Execution Rule",
    theme: "Daily Consistency",
  },
  {
    id: 3,
    quote: "Every objection you overcome is a direct deposit into your future bank account.",
    author: "Closer's Law",
    theme: "Closing Deals",
  },
  {
    id: 4,
    quote: "The pipeline you build today determines the freedom and cash flow you enjoy tomorrow.",
    author: "Revenue Principle",
    theme: "Pipeline Mastery",
  },
  {
    id: 5,
    quote: "Discipline is choosing between what you want now and what you want most: financial independence.",
    author: "Wealth Creed",
    theme: "Relentless Execution",
  },
  {
    id: 6,
    quote: "Success in sales isn't luck; it's doing the high-leverage reps every single day without fail.",
    author: "Daily Standard",
    theme: "Daily Consistency",
  },
  {
    id: 7,
    quote: "Revenue solves all known business problems. Pick up the receiver and create revenue.",
    author: "Founder Truth",
    theme: "Money & Wealth",
  },
  {
    id: 8,
    quote: "The wealthy don't rely on motivation; they rely on daily quotas and relentless execution.",
    author: "Apex Closer",
    theme: "Relentless Execution",
  },
  {
    id: 9,
    quote: "Every dial is an investment. Every conversation is market intelligence. Every closed deal is compounding equity.",
    author: "Capital Code",
    theme: "Pipeline Mastery",
  },
  {
    id: 10,
    quote: "You don't get paid for the hours you sit at your desk; you get paid for the value and certainty you deliver.",
    author: "Value First",
    theme: "Closing Deals",
  },
  {
    id: 11,
    quote: "Consistency turns amateurs into top earners. Show up every day like your next million depends on it.",
    author: "Daily Standard",
    theme: "Daily Consistency",
  },
  {
    id: 12,
    quote: "A closed mouth doesn't get fed, and an idle phone doesn't print cash. Make the next dial count.",
    author: "Hunter's Creed",
    theme: "Money & Wealth",
  },
  {
    id: 13,
    quote: "The fortune is always in the follow-up. 80% of high-ticket deals close between the 5th and 12th contact.",
    author: "Sales Cadence",
    theme: "Daily Consistency",
  },
  {
    id: 14,
    quote: "Treat every lead with the urgency of a six-figure contract. Professionalism attracts capital.",
    author: "Dealmaker Axiom",
    theme: "Closing Deals",
  },
  {
    id: 15,
    quote: "Cold calling is the fastest way to turn zero dollars into a profitable business. Master the phone, command your wealth.",
    author: "Direct Pipeline",
    theme: "Money & Wealth",
  },
  {
    id: 16,
    quote: "Stop counting the calls you have left. Start counting the opportunities you're about to unlock.",
    author: "Momentum Rule",
    theme: "Relentless Execution",
  },
  {
    id: 17,
    quote: "The greatest risk is hesitation. Certainty closes deals; doubts kill commissions.",
    author: "Closer's Law",
    theme: "Closing Deals",
  },
  {
    id: 18,
    quote: "Your daily habits are either buying your financial freedom or funding your future regrets.",
    author: "Wealth Creed",
    theme: "Daily Consistency",
  },
  {
    id: 19,
    quote: "Money loves speed and rewards relentless follow-through. Be the rep who never drops the ball.",
    author: "Velocity Principle",
    theme: "Money & Wealth",
  },
  {
    id: 20,
    quote: "Nobody remembers the deals you almost closed. They remember the contracts signed and wire transfers confirmed.",
    author: "Executive Truth",
    theme: "Closing Deals",
  },
  {
    id: 21,
    quote: "Consistency isn't doing big things occasionally; it's doing small, high-yield actions every single day.",
    author: "Daily Standard",
    theme: "Daily Consistency",
  },
  {
    id: 22,
    quote: "When you master sales, you never worry about money again. You become your own economy.",
    author: "Sovereign Closer",
    theme: "Money & Wealth",
  },
  {
    id: 23,
    quote: "The difference between average reps and top 1% earners is 20 more calls and zero excuses before leaving the desk.",
    author: "Apex Closer",
    theme: "Relentless Execution",
  },
  {
    id: 24,
    quote: "Every prospect who says 'no' just brought you one step closer to the client who says 'yes, where do I sign?'",
    author: "Pipeline Law",
    theme: "Pipeline Mastery",
  },
  {
    id: 25,
    quote: "Money flows to value and confidence. Sound confident, solve real problems, and lead the conversation.",
    author: "Dealmaker Axiom",
    theme: "Money & Wealth",
  },
  {
    id: 26,
    quote: "A full calendar and an empty hesitation make a wealthy sales rep.",
    author: "Hunter's Creed",
    theme: "Pipeline Mastery",
  },
  {
    id: 27,
    quote: "Do not negotiate with your daily targets. Set the goal, hit the numbers, claim the reward.",
    author: "Discipline Standard",
    theme: "Daily Consistency",
  },
  {
    id: 28,
    quote: "Champions dial when they feel great, and they dial when they don't feel like it. That is the definition of a pro.",
    author: "Apex Closer",
    theme: "Daily Consistency",
  },
  {
    id: 29,
    quote: "Your commission check is a direct reflection of how many problems you solved this week.",
    author: "Value First",
    theme: "Money & Wealth",
  },
  {
    id: 30,
    quote: "Sales is the only profession where you can give yourself a raise every single day with one great conversation.",
    author: "Wealth Creed",
    theme: "Money & Wealth",
  },
  {
    id: 31,
    quote: "The market doesn't pay for effort; it pays for closed transactions. Focus ruthlessly on outcomes.",
    author: "Executive Truth",
    theme: "Closing Deals",
  },
  {
    id: 32,
    quote: "Small daily disciplines repeated consistently lead to exponential financial breakthroughs.",
    author: "Compound Law",
    theme: "Daily Consistency",
  },
  {
    id: 33,
    quote: "You are one phone call away from the biggest contract of your quarter. Dial with conviction.",
    author: "Hunter's Creed",
    theme: "Pipeline Mastery",
  },
  {
    id: 34,
    quote: "Energy flows where attention goes. Focus on generating revenue, and revenue will compound.",
    author: "Capital Code",
    theme: "Money & Wealth",
  },
  {
    id: 35,
    quote: "The best sales script in the world is useless in the hands of someone who doesn't pick up the receiver.",
    author: "Execution Rule",
    theme: "Relentless Execution",
  },
  {
    id: 36,
    quote: "Embrace the grind of today so you can command the terms and pricing of tomorrow.",
    author: "Founder Truth",
    theme: "Money & Wealth",
  },
  {
    id: 37,
    quote: "Rejection is just data. Every objection refined makes your closing pitch sharper and more profitable.",
    author: "Closer's Law",
    theme: "Closing Deals",
  },
  {
    id: 38,
    quote: "Consistency beats talent every single time talent forgets to make the follow-up calls.",
    author: "Daily Standard",
    theme: "Daily Consistency",
  },
  {
    id: 39,
    quote: "Money is attracted to clarity, preparation, and follow-through. Be prepared for every conversation.",
    author: "Capital Code",
    theme: "Money & Wealth",
  },
  {
    id: 40,
    quote: "Don't wish it were easier; wish you were better prepared. Master your scripts and own the call.",
    author: "Dealmaker Axiom",
    theme: "Relentless Execution",
  },
  {
    id: 41,
    quote: "The price of regret is far higher than the temporary discomfort of cold calling.",
    author: "Discipline Standard",
    theme: "Daily Consistency",
  },
  {
    id: 42,
    quote: "Top earners don't wait for ideal conditions. They create momentum by dialing now.",
    author: "Apex Closer",
    theme: "Relentless Execution",
  },
  {
    id: 43,
    quote: "Your pipeline is your financial lifeline. Guard it with daily prospecting and ruthless follow-up.",
    author: "Pipeline Law",
    theme: "Pipeline Mastery",
  },
  {
    id: 44,
    quote: "The deal of a lifetime happens only when you are in the arena making the dials.",
    author: "Hunter's Creed",
    theme: "Closing Deals",
  },
  {
    id: 45,
    quote: "Build a reputation as the most responsive, disciplined closer in your entire industry.",
    author: "Executive Truth",
    theme: "Daily Consistency",
  },
  {
    id: 46,
    quote: "Cash flow is king, but daily consistency is the queen that protects the kingdom.",
    author: "Wealth Creed",
    theme: "Money & Wealth",
  },
  {
    id: 47,
    quote: "Every time you pick up the phone, you are voting for the financial future of your dreams.",
    author: "Vision & Execution",
    theme: "Money & Wealth",
  },
  {
    id: 48,
    quote: "Work so consistently and relentlessly that your competitors think you have an unfair advantage.",
    author: "Apex Closer",
    theme: "Daily Consistency",
  },
  {
    id: 49,
    quote: "Prospect with pride, pitch with conviction, close with clarity, and bank the revenue.",
    author: "Closer's Law",
    theme: "Closing Deals",
  },
  {
    id: 50,
    quote: "Today's effort is tomorrow's bank balance. Never leave a single dollar on the table.",
    author: "Capital Code",
    theme: "Money & Wealth",
  },
];

export interface TimeSlotInfo {
  slot: 0 | 1 | 2;
  label: string;
  icon: string;
  greeting: string;
  timeRange: string;
}

/**
 * Returns time slot details based on local time of day:
 * Slot 0: 05:00 - 11:59 (Morning Mindset)
 * Slot 1: 12:00 - 16:59 (Afternoon Grind)
 * Slot 2: 17:00 - 04:59 (Evening Closer)
 */
export function getTimeSlotInfo(): TimeSlotInfo {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return {
      slot: 0,
      label: 'Morning Mindset',
      icon: '☀️',
      greeting: 'Good Morning',
      timeRange: '5 AM – 12 PM',
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      slot: 1,
      label: 'Afternoon Grind',
      icon: '⚡',
      greeting: 'Good Afternoon',
      timeRange: '12 PM – 5 PM',
    };
  } else {
    return {
      slot: 2,
      label: 'Evening Closer',
      icon: '🌙',
      greeting: 'Good Evening',
      timeRange: '5 PM – 5 AM',
    };
  }
}

/**
 * Dynamically picks a motivational quote that changes 3 times a day.
 * Includes a manual offset so user can cycle to the next quote on demand.
 */
export function getDailyMotivationalQuote(customOffset: number = 0): {
  quote: MotivationalQuote;
  slotInfo: TimeSlotInfo;
  quoteNumber: number;
} {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const slotInfo = getTimeSlotInfo();

  // Rotates 3 times per day through the 50 quotes
  const totalIndex = Math.abs((dayOfYear * 3 + slotInfo.slot + customOffset) % MOTIVATIONAL_QUOTES.length);
  const quote = MOTIVATIONAL_QUOTES[totalIndex];

  return {
    quote,
    slotInfo,
    quoteNumber: totalIndex + 1,
  };
}
