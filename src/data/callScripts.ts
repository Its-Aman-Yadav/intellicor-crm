import { CallScriptConfig } from '@/types/crm';
export type { CallScriptConfig };

export const DEFAULT_CALL_SCRIPT_CONFIG: CallScriptConfig = {
  openingScript:
    "Hello Sir/Ma'am, [Rep Name] this side from Intellicor Technologies. Actually hum local businesses ki online visibility aur customer enquiries improve karne mein help karte hain mainly website, Google Business Profile and social media ke through. Main aapka business online check kar raha tha, aur mujhe 2-3 areas notice hue jahan thoda improvement karke aapki online presence better ho sakti hai. Aapke paas 2 minutes hain? Main quickly bata deta hoon.",

  stages: [
    {
      id: 'stage-1',
      stageName: 'Opening',
      description: 'Introduce Intellicor Technologies and the clear reason for calling.',
      suggestedPrompt:
        'Deliver opening line clearly with confident tone. Mention 2-minute permission.',
    },
    {
      id: 'stage-2',
      stageName: 'Observation',
      description: 'Mention 1-2 specific online-presence observations regarding their business.',
      suggestedPrompt:
        'Point out missing/slow website, incomplete GBP listing, or outdated Instagram.',
    },
    {
      id: 'stage-3',
      stageName: 'Questions',
      description: 'Ask about current customer acquisition sources and online presence management.',
      suggestedPrompt:
        'Ask who manages digital marketing now and whether walk-ins/calls come from Google.',
    },
    {
      id: 'stage-4',
      stageName: 'Positioning',
      description: 'Explain how Intellicor can improve their local visibility and high-intent customer inquiries.',
      suggestedPrompt:
        'Explain how local SEO, GBP optimization, and mobile-first website capture customers before competitors do.',
    },
    {
      id: 'stage-5',
      stageName: 'Next Step',
      description: 'Offer customized WhatsApp demo/audit and schedule a short discussion callback.',
      suggestedPrompt:
        'Confirm WhatsApp number: "Main aapko ek quick 2-min video audit WhatsApp karta hoon."',
    },
  ],

  objections: [
    {
      id: 'obj-1',
      objection: 'Website already hai',
      reply:
        'Perfect Sir, website hona actually good hai. Hum existing website ko improve karne, Google visibility aur social media presence ko stronger banane mein bhi help karte hain. Main ek quick audit karke bata sakta hoon ki improvement ki scope hai ya nahi.',
      category: 'Website',
    },
    {
      id: 'obj-2',
      objection: 'Already someone is doing marketing',
      reply:
        "That's completely fine Sir. Main aapko replace karne ke liye call nahi kar raha. Agar aap comfortable hain toh no issue. Main bas second opinion ke form mein quick audit share kar sakta hoon.",
      category: 'Agency',
    },
    {
      id: 'obj-3',
      objection: 'Not interested',
      reply:
        'No problem Sir, completely understand. Main bas apna work WhatsApp kar deta hoon. Future mein requirement ho toh aap directly contact kar sakte hain.',
      category: 'Dismissal',
    },
    {
      id: 'obj-4',
      objection: 'WhatsApp pe bhej do',
      reply:
        'Sure Sir. Main relevant demo bhejta hoon. Aap ek baar check kar lena. Main kal ek short follow-up kar lunga.',
      category: 'Action',
    },
    {
      id: 'obj-5',
      objection: 'Kitna charge karte ho',
      reply:
        'Sir, packages 8,000 se start hote hain. Exact price requirement par depend karta hai. Aapko basic website chahiye ya website ke saath Google + social media bhi manage karna hai?',
      category: 'Pricing',
    },
    {
      id: 'obj-6',
      objection: 'Abhi budget nahi hai',
      reply:
        'Understood Sir. Aapka budget approximately kis range mein planned hai? Main uske according suitable option suggest kar dunga.',
      category: 'Budget',
    },
    {
      id: 'obj-7',
      objection: 'Baad mein call karna',
      reply:
        'Sure Sir. Kaunsa day/time convenient rahega? Main usi time call karunga.',
      category: 'Timing',
    },
    {
      id: 'obj-8',
      objection: 'Bahut expensive hai',
      reply:
        'Samajh sakta hoon Sir. Requirement ke according package decide karte hain. Agar complete setup ki zarurat nahi hai toh Starter se start kar sakte hain. Pehle actual requirement dekh lete hain, phir exact quotation share karunga.',
      category: 'Pricing',
    },
  ],

  counterQuestions: [
    'Currently aapko customers mostly kahan se milte hain?',
    'Aapki website se enquiries aati hain?',
    'Google profile ko currently koi manage karta hai?',
    'Aapka main growth target kya hai?',
    'Agar suitable solution mil jaye, aap approximately kab start karna chahenge?',
  ],

  qualificationPrompts: [
    {
      id: 'qual-1',
      question: 'Currently aapko customers mostly kahan se milte hain?',
      mapsTo: 'notes',
      headerPrefix: '[Acquisition Channel]: ',
      hint: 'Customer sources: Word of mouth, walk-ins, Google, Instagram',
    },
    {
      id: 'qual-2',
      question: 'Website/Google/social media ko kaun manage karta hai?',
      mapsTo: 'notes',
      headerPrefix: '[Current Provider/Gap]: ',
      hint: 'Internal staff, freelance friend, no one, or inactive agency',
    },
    {
      id: 'qual-3',
      question: 'Website se enquiries milti hain?',
      mapsTo: 'requirement',
      headerPrefix: '[Lead-Gen Issue]: ',
      hint: 'Zero leads, broken mobile UI, outdated phone number, slow load',
    },
    {
      id: 'qual-4',
      question: 'Main issue kya hai - visibility, enquiries, branding, ya consistency?',
      mapsTo: 'requirement',
      headerPrefix: '[Primary Pain Point]: ',
      hint: 'Low ranking on Google Maps, no calls, irregular posting',
    },
    {
      id: 'qual-5',
      question: 'Aap approximately kab start karna chahenge?',
      mapsTo: 'requirement',
      headerPrefix: '[Buying Timeline]: ',
      hint: 'Immediate (this week), next month, or exploratory only',
    },
  ],
};

// Specialized scripts for top categories: Airbnb, Hotels, and Manufacturing
export const AIRBNB_CALL_SCRIPT_CONFIG: CallScriptConfig = {
  openingScript:
    "Hello Sir/Ma'am, [Rep Name] this side from Intellicor. Main aapki property / villa listing dekh raha tha. Actually hum Airbnb hosts aur vacation rental owners ki direct bookings increase karne mein help karte hain bina OTA ke 15-20% commission diye. Hum aapka direct booking website + Google Maps business setup karte hain taaki guests directly aapko WhatsApp ya call karein. Quick 2 minutes honge?",

  stages: [
    {
      id: 'abnb-s1',
      stageName: 'Opening & Hook',
      description: 'Hook the host on saving 15-20% OTA commission and getting direct repeat bookings.',
      suggestedPrompt: 'Highlight that repeat guests and direct inquiries give 100% margin directly to the host.',
    },
    {
      id: 'abnb-s2',
      stageName: 'Current Pain Point',
      description: 'Ask how much they rely on Airbnb/MakeMyTrip vs direct WhatsApp/phone calls.',
      suggestedPrompt: 'Ask: "Abhi aapki bookings mostly Airbnb se aati hain ya direct repeat guests bhi hain?"',
    },
    {
      id: 'abnb-s3',
      stageName: 'Solution Offer',
      description: 'Explain Google Maps ranking + sleek photo gallery website + instant WhatsApp booking button.',
      suggestedPrompt: 'Explain how guests search "Villa in [City]" on Google and can book directly with them.',
    },
    {
      id: 'abnb-s4',
      stageName: 'Next Step (WhatsApp)',
      description: 'Offer to send a 2-minute sample demo of our villa booking system on WhatsApp.',
      suggestedPrompt: 'Confirm their WhatsApp number to send photos & live demo link.',
    },
  ],

  objections: [
    {
      id: 'abnb-o1',
      objection: 'Airbnb se already pura fill rehta hai',
      reply:
        'Bahut badhiya Sir! Lekin Airbnb har booking pe commission deduct karta hai. Direct website se repeat guests bina kisi cut ke seedha aapke account mein pay karenge, which increases your net profit immediately.',
      category: 'Commission',
    },
    {
      id: 'abnb-o2',
      objection: 'Website manage karne ka time nahi hai',
      reply:
        'Sir, complete technical setup, photo updates aur Google profile management humari team handle karti hai. Aapko sirf guest se WhatsApp pe coordinate karna hai.',
      category: 'Management',
    },
    {
      id: 'abnb-o3',
      objection: 'Kitna charge karte ho?',
      reply:
        'Sir, villa & homestay setup humara ₹8,000 se start hota hai with instant WhatsApp booking widget & Google listing. 1-2 direct bookings mein hi poora cost recover ho jata hai.',
      category: 'Pricing',
    },
    {
      id: 'abnb-o4',
      objection: 'WhatsApp pe sample bhej do',
      reply:
        'Bilkul Sir! Issi number pe WhatsApp chal raha hai? Main abhi live luxury villa demo link share kar raha hoon.',
      category: 'Action',
    },
  ],

  counterQuestions: [
    'Aapki bookings mostly Airbnb se aati hain ya direct referrals bhi aate hain?',
    'Aapka property Google Maps par verified hai ya sirf Airbnb par listed hai?',
    'Repeat guests aapse directly contact karte hain ya phir wapas app se book karte hain?',
  ],

  qualificationPrompts: [
    {
      id: 'abnb-q1',
      question: 'Property type aur location kya hai?',
      mapsTo: 'requirement',
      headerPrefix: '[Property Type]: ',
      hint: 'Independent Villa, 2BHK Apartment, Farmhouse, Boutique Stay',
    },
    {
      id: 'abnb-q2',
      question: 'Current direct booking channel kya hai?',
      mapsTo: 'notes',
      headerPrefix: '[Direct Booking Ratio]: ',
      hint: '90% Airbnb, only 10% direct, wants to scale direct bookings',
    },
  ],
};

export const HOTELS_CALL_SCRIPT_CONFIG: CallScriptConfig = {
  openingScript:
    "Hello Sir/Ma'am, [Rep Name] this side from Intellicor Technologies. Main aapke hotel / resort ka online presence review kar raha tha. Actually hum hotels ki direct corporate & room bookings badhane mein help karte hain through modern Google Maps ranking, fast mobile website, aur direct booking enquiry engine. Kya main 2 minutes mein bata sakta hoon kaise aap OTAs ki 18-22% high commission bacha sakte hain?",

  stages: [
    {
      id: 'htl-s1',
      stageName: 'Opening Hook',
      description: 'Address OTA high commission rates and lack of hotel brand ownership.',
      suggestedPrompt: 'Pitch high OTA commissions (MakeMyTrip, Agoda, Booking.com) vs direct customer retention.',
    },
    {
      id: 'htl-s2',
      stageName: 'Google 3-Pack Presence',
      description: 'Review their Google Business ranking for "hotel near [area]" and room photo quality.',
      suggestedPrompt: 'Point out missing direct call-to-action or outdated room tariffs.',
    },
    {
      id: 'htl-s3',
      stageName: 'Solution Offer',
      description: 'Showcase direct room tariff engine, banquet/event enquiry form, and WhatsApp desk.',
      suggestedPrompt: 'Explain how corporate and family event inquiries will directly land on their sales desk.',
    },
    {
      id: 'htl-s4',
      stageName: 'Demo Audit Share',
      description: 'Send quick competitor audit and hotel booking demo on WhatsApp.',
      suggestedPrompt: 'Ask for manager/owner WhatsApp number.',
    },
  ],

  objections: [
    {
      id: 'htl-o1',
      objection: 'MMT / Goibibo se kaafi bookings aati hain',
      reply:
        'Bilkul Sir, OTAs achhe hain visibility ke liye. Lekin jab guest hotel ka naam Google pe search karta hai, agar aapki direct website pe best rate milega toh guest seedha aapse book karega without paying 20% commission.',
      category: 'OTAs',
    },
    {
      id: 'htl-o2',
      objection: 'Already ek website hai',
      reply:
        'Great Sir! Hum mostly check karte hain ki mobile view fast hai ya nahi, aur Google Maps pe call buttons properly tracked hain ya nahi. Main ek free performance audit share kar sakta hoon.',
      category: 'Website',
    },
    {
      id: 'htl-o3',
      objection: 'Owner / GM abhi nahi hain',
      reply:
        'No issue Sir. Unka direct WhatsApp number mil sakta hai? Main ek short presentation aur quotation unke WhatsApp pe bhej deta hoon, phir unse coordinate karunga.',
      category: 'Gatekeeper',
    },
  ],

  counterQuestions: [
    'Aapke paas banquet / conference hall ki bhi bookings aati hain?',
    'Google Maps pe weekly kitni direct calls receive hoti hain?',
    'Aapka hotel software (PMS) kaunsa use hota hai?',
  ],

  qualificationPrompts: [
    {
      id: 'htl-q1',
      question: 'Total rooms aur amenities kya hain?',
      mapsTo: 'requirement',
      headerPrefix: '[Room Count & Tier]: ',
      hint: '25 rooms, banquet hall, rooftop restaurant, 3-star property',
    },
  ],
};

export const MANUFACTURING_CALL_SCRIPT_CONFIG: CallScriptConfig = {
  openingScript:
    "Namaste Sir, [Rep Name] this side from Intellicor Technologies. Hum B2B manufacturing aur industrial companies ke saath work karte hain unki digital catalogue aur high-ticket buyer inquiries scale karne ke liye. Main aapki company ka profile check kar raha tha, aur humne dekha ki buyers online search karte time aapki website ya products easily find nahi kar pa rahe. Kya main 2 minutes mein share kar sakta hoon?",

  stages: [
    {
      id: 'mfg-s1',
      stageName: 'B2B Sourcing Hook',
      description: 'Explain that procurement heads and purchase managers search Google before issuing RFQs.',
      suggestedPrompt: 'Mention OEM trust, technical capability showcase, and export inquiry readiness.',
    },
    {
      id: 'mfg-s2',
      stageName: 'Digital Catalog Gap',
      description: 'Point out missing PDF specs, product dimensions, or lack of fast RFQ request button.',
      suggestedPrompt: 'Ask if buyers ask for catalog on WhatsApp and how they currently showcase machinery/parts.',
    },
    {
      id: 'mfg-s3',
      stageName: 'Solution Offer',
      description: 'High-converting industrial website with downloadable product specs and WhatsApp RFQ button.',
      suggestedPrompt: 'Explain how professional B2B presence builds instant buyer trust for big contracts.',
    },
  ],

  objections: [
    {
      id: 'mfg-o1',
      objection: 'Humara kaam sirf referral aur tender pe chalta hai',
      reply:
        'Bilkul Sir, B2B mein reputation sabse important hai. Lekin jab koi new buyer ya foreign client aapko check karta hai, pehla impression aapki website hoti hai. Professional presence aapki credibility aur deal size dono badha deti hai.',
      category: 'Referrals',
    },
    {
      id: 'mfg-o2',
      objection: 'IndiaMART pe already listed hain',
      reply:
        'IndiaMART par aapke saath 20 competitors bhi dikhte hain jo price fight karte hain. Aapki apni branded website aapko direct exclusive inquiries deti hai jahan koi price war nahi hoti.',
      category: 'Directories',
    },
    {
      id: 'mfg-o3',
      objection: 'Aap sample work WhatsApp kar do',
      reply:
        'Sure Sir. Humne recently manufacturing aur industrial clients ke jo B2B portals banaye hain, unke live links aur brochures main issi number par WhatsApp kar deta hoon.',
      category: 'Action',
    },
  ],

  counterQuestions: [
    'Aapke major products kaunse hain aur target market domestic hai ya export?',
    'Currently purchase managers aapse kaise connect karte hain?',
  ],

  qualificationPrompts: [
    {
      id: 'mfg-q1',
      question: 'Manufacturing domain aur key product range?',
      mapsTo: 'requirement',
      headerPrefix: '[Manufacturing Category]: ',
      hint: 'CNC machining, plastic injection moulding, sheet metal, chemical tools',
    },
  ],
};

/**
 * Returns the best script configuration for a specific Category / Group
 */
export function getScriptForCategory(categoryName?: string): CallScriptConfig {
  if (!categoryName) return DEFAULT_CALL_SCRIPT_CONFIG;
  const lower = categoryName.toLowerCase().trim();

  if (lower.includes('airbnb') || lower.includes('homestay') || lower.includes('villa') || lower.includes('vacation')) {
    return AIRBNB_CALL_SCRIPT_CONFIG;
  }
  if (lower.includes('hotel') || lower.includes('resort') || lower.includes('motel') || lower.includes('hospitality')) {
    return HOTELS_CALL_SCRIPT_CONFIG;
  }
  if (
    lower.includes('manufactur') ||
    lower.includes('industrial') ||
    lower.includes('factory') ||
    lower.includes('engineering') ||
    lower.includes('cnc') ||
    lower.includes('tooling')
  ) {
    return MANUFACTURING_CALL_SCRIPT_CONFIG;
  }

  return DEFAULT_CALL_SCRIPT_CONFIG;
}

