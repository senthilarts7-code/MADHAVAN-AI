import { WorkspaceToolMode } from './utils/aiLogic';

export interface ToolMetadata {
  id: WorkspaceToolMode;
  labelEn: string;
  labelTa: string;
  descEn: string;
  descTa: string;
  placeholderEn: string;
  placeholderTa: string;
  samplePromptsEn: string[];
  samplePromptsTa: string[];
}

export const WORKSPACE_TOOLS: ToolMetadata[] = [
  {
    id: 'chat',
    labelEn: 'General Chat',
    labelTa: 'பொது AI',
    descEn: 'Fast reasoning, explanations, brainstorming, and bilingual English & Tamil communication.',
    descTa: 'வேகமான சிந்தனை, விளக்கங்கள் மற்றும் தமிழ்-ஆங்கில இருமொழி உரையாடல்.',
    placeholderEn: 'Ask MADHAVAN AI anything in English or தமிழ்...',
    placeholderTa: 'மாதவன் AI-யிடம் தமிழ் அல்லது ஆங்கிலத்தில் எதை வேண்டுமானாலும் கேளுங்கள்...',
    samplePromptsEn: [
      'Explain quantum computing in simple terms with a real-world analogy and a short Tamil summary.',
      'Calculate (1450 * 1.18) + sqrt(256) and explain the GST breakdown.',
      'Compare microservices vs modular monoliths for a high-growth fintech startup.',
      'Write a 5-step engineering onboarding checklist in English and தமிழ்.',
    ],
    samplePromptsTa: [
      'செயற்கை நுண்ணறிவு (AI) எதிர்காலக் கல்வியை எவ்வாறு மாற்றும் என்பதைத் தமிழில் விளக்கவும்.',
      'திருக்குறளின் மேலாண்மைத் தத்துவங்களை இன்றைய நிறுவனங்களுக்கு ஏற்ப விளக்குக.',
      'பயனுள்ள நேர மேலாண்மைக்கான 5 முக்கிய வழிமுறைகளைப் பட்டியலிடுக.',
      'இன்றைய மென்பொருள் துறையில் கிளவுட் கம்ப்யூட்டிங்கின் முக்கியத்துவத்தை விளக்குக.',
    ],
  },
  {
    id: 'coding',
    labelEn: 'Coding Studio',
    labelTa: 'நிரலாக்கம்',
    descEn: 'Architecture, code generation, debugging, refactoring, and complexity analysis.',
    descTa: 'மென்பொருள் கட்டமைப்பு, குறியீடு உருவாக்கம், பிழைத்திருத்தம் மற்றும் மேம்பாடு.',
    placeholderEn: 'Paste code to refactor/debug or describe a system to build...',
    placeholderTa: 'குறியீட்டைப் பதிவிட்டு பிழைத்திருத்தவும் அல்லது புதிய நிரலை உருவாக்கக் கேட்கவும்...',
    samplePromptsEn: [
      'Write a TypeScript token-bucket rate limiter with unit tests and O(1) time complexity.',
      'Explain how React 19 concurrent rendering prevents UI blocking during heavy state updates.',
      'Write a Python binary search tree iterator and analyze its space complexity.',
      'Design a resilient PostgreSQL schema for multi-tenant SaaS subscription metering.',
    ],
    samplePromptsTa: [
      'பைத்தானில் (Python) பைனரி தேடல் (Binary Search) நிரலை எழுதி தமிழில் விளக்கவும்.',
      'REST API மற்றும் GraphQL இடையே உள்ள வேறுபாடுகளை உதாரணத்துடன் விளக்குக.',
    ],
  },
  {
    id: 'vision',
    labelEn: 'Vision AI',
    labelTa: 'பட ஆய்வு',
    descEn: 'Attach diagrams, charts, or photos to extract text and analyze visual structure.',
    descTa: 'படங்கள், வரைபடங்கள் அல்லது அட்டவணைகளைப் பதிவேற்றி விளக்கம் பெறுங்கள்.',
    placeholderEn: 'Attach an image and ask a question about its contents, text, or layout...',
    placeholderTa: 'படத்தை இணைத்து அதிலுள்ள விவரங்கள் பற்றிக் கேளுங்கள்...',
    samplePromptsEn: [
      'Analyze the attached architecture diagram and summarize data flow bottlenecks.',
      'Read all visible text from the attached image and format it as a structured table.',
    ],
    samplePromptsTa: [
      'இணைக்கப்பட்டுள்ள படத்திலுள்ள தகவல்களைத் தமிழில் சுருக்கமாக விளக்கவும்.',
    ],
  },
  {
    id: 'document',
    labelEn: 'Documents',
    labelTa: 'ஆவணங்கள்',
    descEn: 'Upload or paste documents (.txt, .md, .csv, .json) for grounded Q&A and extraction.',
    descTa: 'ஆவணங்களைப் பதிவேற்றிச் சுருக்கம் மற்றும் ஆதாரபூர்வமான பதில்களைப் பெறுங்கள்.',
    placeholderEn: 'Ask a question grounded strictly in your uploaded document...',
    placeholderTa: 'பதிவேற்றப்பட்ட ஆவணத்தின் அடிப்படையில் கேள்விகளைக் கேளுங்கள்...',
    samplePromptsEn: [
      'Provide an executive summary of the uploaded document with key action items and section references.',
      'Extract all dates, obligations, and numerical metrics into a Markdown table.',
    ],
    samplePromptsTa: [
      'இந்த ஆவணத்தின் முக்கியக் கருத்துக்களைத் தமிழில் பட்டியலிடவும்.',
    ],
  },
  {
    id: 'image_gen',
    labelEn: 'Image Studio',
    labelTa: 'பட உருவாக்கம்',
    descEn: 'Generate visual concepts with configurable aspect ratios via Gemini Image models.',
    descTa: 'உரைக் குறிப்புகள் மூலம் புதிய படங்களை உருவாக்குங்கள்.',
    placeholderEn: 'Describe the image you want to generate or discuss visual direction...',
    placeholderTa: 'நீங்கள் உருவாக்க விரும்பும் படத்தை விவரிக்கவும்...',
    samplePromptsEn: [
      'Minimalist architectural pavilion in Chennai at sunrise, clean white concrete, warm sunlight.',
      'Isometric technical illustration of a next-generation neural processing chip on white studio surface.',
    ],
    samplePromptsTa: [
      'தஞ்சாவூர் பெரிய கோவிலின் காலை நேரக் கலைநயமிக்கக் காட்சி.',
    ],
  },
  {
    id: 'voice',
    labelEn: 'Voice AI',
    labelTa: 'குரல் AI',
    descEn: 'Hands-free speech recognition and natural Text-to-Speech in English and Tamil.',
    descTa: 'தமிழ் மற்றும் ஆங்கிலத்தில் குரல் வழி உரையாடல் மற்றும் ஒலி வெளியீடு.',
    placeholderEn: 'Tap the microphone to speak or type for spoken audio response...',
    placeholderTa: 'மைக்ரோஃபோனை அழுத்திப் பேசவும் அல்லது தட்டச்சு செய்யவும்...',
    samplePromptsEn: [
      'Give me a 30-second spoken morning briefing on software engineering productivity.',
      'Greet me warmly in Tamil and English and explain how voice mode works.',
    ],
    samplePromptsTa: [
      'வணக்கம்! இன்று ஒரு உற்சாகமான நாளாக அமைய வாழ்த்துச் செய்தியைக் கூறவும்.',
    ],
  },
  {
    id: 'research',
    labelEn: 'Web Research',
    labelTa: 'ஆராய்ச்சி',
    descEn: 'Synthesize verified findings with Google Search grounding and source links.',
    descTa: 'ஆதாரங்களுடன் கூடிய இணைய ஆராய்ச்சி மற்றும் தகவல் தொகுப்பு.',
    placeholderEn: 'Enter a research topic to synthesize sourced facts vs inference...',
    placeholderTa: 'ஆராய்ச்சித் தலைப்பை உள்ளிட்டு ஆதாரபூர்வமான தகவல்களைப் பெறுங்கள்...',
    samplePromptsEn: [
      'Research recent advancements in solid-state EV batteries and separate sourced facts from projections.',
      'Analyze India digital public infrastructure (UPI, ONDC) adoption milestones with verifiable citations.',
    ],
    samplePromptsTa: [
      'இந்திய விண்வெளி ஆராய்ச்சி நிறுவனத்தின் (ISRO) சமீபத்திய சாதனைகளை ஆதாரங்களுடன் தொகுக்கவும்.',
    ],
  },
  {
    id: 'study',
    labelEn: 'Study & Math',
    labelTa: 'கல்வி & கணிதம்',
    descEn: 'Step-by-step math, physics, chemistry, Tamil summaries, and interactive quizzes.',
    descTa: 'கணிதம், அறிவியல் படிப்படியான விளக்கங்கள் மற்றும் பயிற்சி வினாக்கள்.',
    placeholderEn: 'Enter a math problem, science topic, or exam concept to master...',
    placeholderTa: 'கணிதம் அல்லது அறிவியல் பாடத் தலைப்பை உள்ளிட்டுத் தெளிவான விளக்கம் பெறுங்கள்...',
    samplePromptsEn: [
      'Solve the quadratic equation 2x^2 - 7x + 3 = 0 step by step and generate 2 practice problems.',
      'Explain Newton’s laws of motion with everyday examples, Tamil key terms, and a 3-question quiz.',
    ],
    samplePromptsTa: [
      'ஒளிச்சேர்க்கை (Photosynthesis) நடைபெறும் விதத்தை எளிய தமிழில் படிப்படியாக விளக்கி 3 வினாக்கள் தருக.',
    ],
  },
  {
    id: 'writing',
    labelEn: 'Writing Studio',
    labelTa: 'எழுத்து கூடம்',
    descEn: 'Draft essays, executive emails, reports, scripts, and English ↔ Tamil translations.',
    descTa: 'கட்டுரைகள், மின்னஞ்சல்கள், அறிக்கைகள் மற்றும் மொழிபெயர்ப்பு.',
    placeholderEn: 'Describe what you want to write, edit, or translate...',
    placeholderTa: 'எழுத அல்லது மொழிபெயர்க்க வேண்டிய பகுதியை உள்ளிடவும்...',
    samplePromptsEn: [
      'Draft a crisp executive product launch email for MADHAVAN AI with a Tamil translation below it.',
      'Rewrite this paragraph to sound more authoritative and concise for an enterprise whitepaper.',
    ],
    samplePromptsTa: [
      'ஒரு மென்பொருள் நிறுவனத்தின் புதிய தயாரிப்பு அறிமுகத்திற்குத் தொழில்முறை மின்னஞ்சல் ஒன்றைத் தமிழில் எழுதவும்.',
    ],
  },
  {
    id: 'data',
    labelEn: 'Data & Sheets',
    labelTa: 'தரவுப் பட்டியல்',
    descEn: 'Parse CSV tables, compute deterministic column statistics, and render charts.',
    descTa: 'அட்டவணைத் தரவுகளைப் பகுப்பாய்வு செய்து வரைபடங்களை உருவாக்குங்கள்.',
    placeholderEn: 'Ask about the loaded dataset, trends, anomalies, or calculations...',
    placeholderTa: 'அட்டவணைத் தரவுகளின் போக்குகள் மற்றும் கணக்கீடுகள் பற்றிக் கேளுங்கள்...',
    samplePromptsEn: [
      'Analyze the loaded regional revenue dataset, rank top cities, and recommend Q4 budget allocation.',
      'Compute year-over-year margin sensitivity based on the loaded spreadsheet columns.',
    ],
    samplePromptsTa: [
      'கொடுக்கப்பட்டுள்ள வருவாய் அட்டவணையைப் பகுப்பாய்வு செய்து முக்கிய முடிவுகளைத் தமிழில் கூறவும்.',
    ],
  },
];

export const UI_STRINGS = {
  en: {
    brandTagline: 'Intelligence without limits.',
    newChat: 'New Chat',
    searchPlaceholder: 'Search conversations...',
    pinnedChats: 'Pinned',
    recentChats: 'Recent Conversations',
    archivedChats: 'Archived',
    workspaceTools: 'Workspace Tools',
    memoryVault: 'Memory & Privacy',
    subscriptionPlan: 'Plans & Quotas',
    adminConsole: 'Observability & Admin',
    signInGoogle: 'Sign in with Google',
    signOut: 'Sign out',
    guestMode: 'Guest Workspace',
    send: 'Send',
    stopGenerating: 'Stop generating',
    attachFile: 'Attach image, document, or CSV',
    voiceInput: 'Voice input',
    regenerate: 'Regenerate',
    copyText: 'Copy response',
    saveAnswer: 'Save answer',
    savedAnswers: 'Saved Answers',
    editMessage: 'Edit & Resend',
    emptyChatTitle: 'How can MADHAVAN AI help you today?',
    emptyChatSubtitle:
      'High-speed multimodal reasoning, coding studio, document intelligence, and seamless English & Tamil communication.',
  },
  ta: {
    brandTagline: 'எல்லையற்ற நுண்ணறிவு.',
    newChat: 'புதிய உரையாடல்',
    searchPlaceholder: 'உரையாடல்களைத் தேடு...',
    pinnedChats: 'பின் செய்யப்பட்டவை',
    recentChats: 'சமீபத்திய உரையாடல்கள்',
    archivedChats: 'காப்பகம்',
    workspaceTools: 'பணித்தளக் கருவிகள்',
    memoryVault: 'நினைவகம் & தனியுரிமை',
    subscriptionPlan: 'திட்டங்கள் & வரம்புகள்',
    adminConsole: 'நிர்வாகக் கட்டுப்பாடு',
    signInGoogle: 'Google மூலம் உள்நுழைக',
    signOut: 'வெளியேறு',
    guestMode: 'விருந்தினர் முறை',
    send: 'அனுப்பு',
    stopGenerating: 'நிறுத்து',
    attachFile: 'படம் அல்லது ஆவணத்தை இணைக்கவும்',
    voiceInput: 'குரல் உள்ளீடு',
    regenerate: 'மீண்டும் உருவாக்கு',
    copyText: 'நகலெடு',
    saveAnswer: 'பதிலைச் சேமி',
    savedAnswers: 'சேமித்த பதில்கள்',
    editMessage: 'திருத்தி அனுப்பு',
    emptyChatTitle: 'மாதவன் AI இன்று உங்களுக்கு எப்படி உதவலாம்?',
    emptyChatSubtitle:
      'வேகமான சிந்தனை, நிரலாக்கம், ஆவணப் பகுப்பாய்வு மற்றும் தமிழ்-ஆங்கில இருமொழி நுண்ணறிவுத் தளம்.',
  },
};
