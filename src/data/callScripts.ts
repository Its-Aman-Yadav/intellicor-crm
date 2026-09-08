import { CallScriptConfig } from '@/types/crm';

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
