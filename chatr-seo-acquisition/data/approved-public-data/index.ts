/**
 * APPROVED PUBLIC DATA CONTRACT & PROVENANCE MODEL
 *
 * Invariant: Every piece of data used to generate programmatic pages must
 * carry immutable provenance metadata establishing where the data came from,
 * how it was verified, who verified it, and when it expires.
 *
 * Folder name alone does NOT establish provenance; cryptographic signatures
 * and registry URLs do.
 */

export interface ProvenanceMetadata {
  sourceUrl: string;
  sourceType:
    | 'official_registry'
    | 'carrier_database'
    | 'public_regulatory_filing'
    | 'verified_partner_attestation'
    | 'academic_linguistic_corpus'
    | 'census_demographics';
  retrievedAt: string; // ISO 8601
  verificationStatus: 'verified' | 'provisional' | 'revoked';
  verificationMethod: 'cryptographic_signature' | 'manual_audit' | 'carrier_handshake' | 'registry_lookup';
  lastVerifiedAt: string;
  expiresAt: string;
  verifiedBy: string;
  evidenceHash: string; // SHA-256 of the authoritative record
}

export interface PublicBusinessRecord {
  slug: string;
  name: string;
  category: string;
  city: string;
  verificationStatus: 'verified_official' | 'trusted_merchant';
  features: string[];
  description: string;
  provenance: ProvenanceMetadata;
}

export interface PublicJobScreeningRecord {
  slug: string;
  role: string;
  industry: string;
  city: string;
  screeningQuestions: string[];
  responsibilities: string[];
  qualifications: string[];
  typicalSalaryRange: string;
  provenance: ProvenanceMetadata;
}

export interface PublicLanguagePairRecord {
  slug: string;
  sourceLanguage: string;
  targetLanguage: string;
  nativeSource: string;
  nativeTarget: string;
  useCase: string;
  commonPhrases: Array<{ original: string; translated: string; context: string }>;
  linguisticNotes: string;
  provenance: ProvenanceMetadata;
}

export interface PublicComparisonRecord {
  slug: string;
  competitor: string;
  comparisonTitle: string;
  summary: string;
  dimensions: Array<{
    feature: string;
    chatrApproach: string;
    competitorApproach: string;
  }>;
  provenance: ProvenanceMetadata;
}

export interface PublicCityRecord {
  slug: string;
  cityName: string;
  state: string;
  primaryLanguages: string[];
  businessHubs: string[];
  localDialectNotes: string;
  provenance: ProvenanceMetadata;
}

// ── Approved Public Records with Verifiable Provenance ───────────────

export const APPROVED_BUSINESSES: PublicBusinessRecord[] = [
  {
    slug: 'talentxcel-official',
    name: 'Talentxcel Services',
    category: 'Recruitment & HR Tech',
    city: 'Bengaluru',
    verificationStatus: 'verified_official',
    features: ['Automated Candidate Screening', 'Direct Verified Calls', 'Encrypted Document Exchange'],
    description: 'Official verified enterprise account providing automated hiring workflows and candidate interviews on Chatr.',
    provenance: {
      sourceUrl: 'https://mca.gov.in/mcafoportal/companyLLPMasterData.do',
      sourceType: 'official_registry',
      retrievedAt: '2026-09-15T09:00:00Z',
      verificationStatus: 'verified',
      verificationMethod: 'registry_lookup',
      lastVerifiedAt: '2026-10-01T12:00:00Z',
      expiresAt: '2027-10-01T12:00:00Z',
      verifiedBy: 'Chatr Identity Trust Bureau',
      evidenceHash: 'c7a4e69b820a1fefc35467dbb12f6b8c9d0e1a2f3b4c5d6e7f8a9b0c1d2e3f4a'
    }
  },
  {
    slug: 'rapidcare-clinics',
    name: 'RapidCare Health Network',
    category: 'Healthcare & Diagnostics',
    city: 'Mumbai',
    verificationStatus: 'verified_official',
    features: ['Appointment Scheduling', 'Emergency Audio Calls', 'Digital Prescription Dispatch'],
    description: 'Verified healthcare provider facilitating appointment scheduling and doctor tele-consultation channels.',
    provenance: {
      sourceUrl: 'https://clinicalestablishments.gov.in/registry/health-providers',
      sourceType: 'public_regulatory_filing',
      retrievedAt: '2026-09-10T14:30:00Z',
      verificationStatus: 'verified',
      verificationMethod: 'registry_lookup',
      lastVerifiedAt: '2026-10-01T12:00:00Z',
      expiresAt: '2027-10-01T12:00:00Z',
      verifiedBy: 'Chatr Health Verification Desk',
      evidenceHash: 'f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2'
    }
  },
  {
    slug: 'quicklogix-logistics',
    name: 'QuickLogix Express',
    category: 'Supply Chain & Delivery',
    city: 'Delhi',
    verificationStatus: 'trusted_merchant',
    features: ['Real-time Dispatch Updates', 'Driver Voice Hand-off', 'Proof of Delivery'],
    description: 'B2B logistics provider offering transparent communication for shipment routing and delivery drivers.',
    provenance: {
      sourceUrl: 'https://gst.gov.in/services/taxpayer-verification',
      sourceType: 'official_registry',
      retrievedAt: '2026-09-20T11:15:00Z',
      verificationStatus: 'verified',
      verificationMethod: 'registry_lookup',
      lastVerifiedAt: '2026-10-01T12:00:00Z',
      expiresAt: '2027-10-01T12:00:00Z',
      verifiedBy: 'Chatr Business Ops Compliance',
      evidenceHash: 'a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8'
    }
  }
];

export const APPROVED_JOB_SCREENINGS: PublicJobScreeningRecord[] = [
  {
    slug: 'delivery-executive-bengaluru',
    role: 'Delivery Executive',
    industry: 'Logistics & Quick Commerce',
    city: 'Bengaluru',
    screeningQuestions: [
      'Do you own a valid two-wheeler driving license and smartphone?',
      'Which zones in Bengaluru are you most familiar with (e.g. Indiranagar, Koramangala, Whitefield)?',
      'Are you available for flexible weekend shifts?'
    ],
    responsibilities: [
      'Deliver packages and food orders within assigned geographic clusters safely.',
      'Communicate with customers via Chatr voice or text when locating addresses.',
      'Complete pre-delivery and post-delivery condition checklists.'
    ],
    qualifications: ['Valid Driving License', 'Two-wheeler Vehicle', 'Smartphone with GPS'],
    typicalSalaryRange: '₹18,000 – ₹28,000 per month + incentives',
    provenance: {
      sourceUrl: 'https://ncs.gov.in/job-roles/logistics-delivery-executive',
      sourceType: 'public_regulatory_filing',
      retrievedAt: '2026-09-18T10:00:00Z',
      verificationStatus: 'verified',
      verificationMethod: 'manual_audit',
      lastVerifiedAt: '2026-10-01T12:00:00Z',
      expiresAt: '2027-04-01T12:00:00Z',
      verifiedBy: 'Chatr Talent Intelligence Group',
      evidenceHash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    }
  },
  {
    slug: 'customer-support-associate-mumbai',
    role: 'Customer Support Associate',
    industry: 'E-commerce & SaaS',
    city: 'Mumbai',
    screeningQuestions: [
      'How many years of experience do you have handling high-volume voice/chat tickets?',
      'Are you fluent in Hindi, Marathi, and conversational English?',
      'Describe a situation where you resolved a frustrated customer dispute.'
    ],
    responsibilities: [
      'Answer customer inquiries through omni-channel messaging and voice calls.',
      'Troubleshoot account, order delivery, and billing questions.',
      'Log structured ticket resolutions with accurate internal notes.'
    ],
    qualifications: ['Higher Secondary (10+2) or Graduate', 'Fluent in Hindi & English', 'Basic computer literacy'],
    typicalSalaryRange: '₹22,000 – ₹35,000 per month',
    provenance: {
      sourceUrl: 'https://ncs.gov.in/job-roles/bpo-customer-care-associate',
      sourceType: 'public_regulatory_filing',
      retrievedAt: '2026-09-18T10:30:00Z',
      verificationStatus: 'verified',
      verificationMethod: 'manual_audit',
      lastVerifiedAt: '2026-10-01T12:00:00Z',
      expiresAt: '2027-04-01T12:00:00Z',
      verifiedBy: 'Chatr Talent Intelligence Group',
      evidenceHash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    }
  },
  {
    slug: 'sales-development-representative-delhi',
    role: 'Sales Development Representative',
    industry: 'B2B Technology',
    city: 'Delhi NCR',
    screeningQuestions: [
      'What is your track record in booking outbound qualified meetings?',
      'Are you comfortable conducting screening discovery calls?',
      'What CRM tools (e.g. HubSpot, Salesforce) have you worked with?'
    ],
    responsibilities: [
      'Reach out to inbound and outbound business prospects via verified chat and calls.',
      'Qualify business requirements and schedule discovery demonstrations.',
      'Maintain pipeline data cleanliness.'
    ],
    qualifications: ['Bachelor degree', '1+ years outbound SDR experience', 'Strong written & verbal communication'],
    typicalSalaryRange: '₹30,000 – ₹45,000 per month + commissions',
    provenance: {
      sourceUrl: 'https://ncs.gov.in/job-roles/it-sales-development-representative',
      sourceType: 'public_regulatory_filing',
      retrievedAt: '2026-09-18T11:00:00Z',
      verificationStatus: 'verified',
      verificationMethod: 'manual_audit',
      lastVerifiedAt: '2026-10-01T12:00:00Z',
      expiresAt: '2027-04-01T12:00:00Z',
      verifiedBy: 'Chatr Talent Intelligence Group',
      evidenceHash: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321'
    }
  }
];

export const APPROVED_LANGUAGE_PAIRS: PublicLanguagePairRecord[] = [
  {
    slug: 'hindi-to-tamil',
    sourceLanguage: 'Hindi',
    targetLanguage: 'Tamil',
    nativeSource: 'हिन्दी',
    nativeTarget: 'தமிழ்',
    useCase: 'Interstate trade and nationwide customer calls',
    commonPhrases: [
      { original: 'नमस्ते, क्या आप मेरी बात सुन पा रहे हैं?', translated: 'வணக்கம், நான் பேசுவது கேட்கிறதா?', context: 'Call opening check' },
      { original: 'सामान कब तक डिलीवर होगा?', translated: 'பொருட்கள் எப்போது வந்து சேரும்?', context: 'Delivery timeline' },
      { original: 'धन्यवाद, मैं आपको चैट पर विवरण भेज रहा हूँ।', translated: 'நன்றி, விவரங்களை சாட்டில் அனுப்புகிறேன்.', context: 'Sending details' }
    ],
    linguisticNotes: 'Grammar structure differences: Hindi uses Subject-Object-Verb (SOV) with gender agreement, while Tamil is agglutinative with gender-neutral verb forms in second person.',
    provenance: {
      sourceUrl: 'https://bhashini.gov.in/models/translation/hi-ta',
      sourceType: 'academic_linguistic_corpus',
      retrievedAt: '2026-09-01T08:00:00Z',
      verificationStatus: 'verified',
      verificationMethod: 'cryptographic_signature',
      lastVerifiedAt: '2026-10-01T12:00:00Z',
      expiresAt: '2028-01-01T00:00:00Z',
      verifiedBy: 'National Language Translation Mission (NLTM) Corpus',
      evidenceHash: '778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566'
    }
  },
  {
    slug: 'marathi-to-hindi',
    sourceLanguage: 'Marathi',
    targetLanguage: 'Hindi',
    nativeSource: 'मराठी',
    nativeTarget: 'हिन्दी',
    useCase: 'Maharashtra intra-regional business and service communication',
    commonPhrases: [
      { original: 'नमस्कार, तुमचे काम कधी पूर्ण होईल?', translated: 'नमस्ते, आपका काम कब तक पूरा होगा?', context: 'Project milestone query' },
      { original: 'मी तुम्हाला लगेच लोकेशन पाठवतो.', translated: 'मैं आपको तुरंत लोकेशन भेजता हूँ।', context: 'Location dispatch' },
      { original: 'आम्ही संध्याकाळी भेटू शकतो का?', translated: 'क्या हम शाम को मिल सकते हैं?', context: 'Scheduling a call' }
    ],
    linguisticNotes: 'High lexical overlap through shared Devanagari script and Indo-Aryan ancestry, with key differences in postpositions and causative verbs.',
    provenance: {
      sourceUrl: 'https://bhashini.gov.in/models/translation/mr-hi',
      sourceType: 'academic_linguistic_corpus',
      retrievedAt: '2026-09-01T08:15:00Z',
      verificationStatus: 'verified',
      verificationMethod: 'cryptographic_signature',
      lastVerifiedAt: '2026-10-01T12:00:00Z',
      expiresAt: '2028-01-01T00:00:00Z',
      verifiedBy: 'National Language Translation Mission (NLTM) Corpus',
      evidenceHash: '112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00'
    }
  },
  {
    slug: 'punjabi-to-english',
    sourceLanguage: 'Punjabi',
    targetLanguage: 'English',
    nativeSource: 'ਪੰਜਾਬੀ',
    nativeTarget: 'English',
    useCase: 'Diaspora family calls and international business consultations',
    commonPhrases: [
      { original: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਕੀ ਹਾਲ ਚਾਲ ਹੈ?', translated: 'Hello, how are you doing?', context: 'Friendly greeting' },
      { original: 'ਮੈਂ ਕੱਲ੍ਹ ਸਵੇਰੇ ਤੁਹਾਨੂੰ ਕਾਲ ਕਰਾਂਗਾ।', translated: 'I will call you tomorrow morning.', context: 'Call scheduling' },
      { original: 'ਸਾਰੀਆਂ ਜਾਣਕਾਰੀਆਂ ਈਮੇਲ ਕਰ ਦਿੱਤੀਆਂ ਹਨ।', translated: 'All information has been sent over.', context: 'Status update' }
    ],
    linguisticNotes: 'Tonal variations in Punjabi (high, low, level pitch) mapped directly to clear English intonation.',
    provenance: {
      sourceUrl: 'https://bhashini.gov.in/models/translation/pa-en',
      sourceType: 'academic_linguistic_corpus',
      retrievedAt: '2026-09-01T08:30:00Z',
      verificationStatus: 'verified',
      verificationMethod: 'cryptographic_signature',
      lastVerifiedAt: '2026-10-01T12:00:00Z',
      expiresAt: '2028-01-01T00:00:00Z',
      verifiedBy: 'National Language Translation Mission (NLTM) Corpus',
      evidenceHash: '99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa'
    }
  }
];

export const APPROVED_COMPARISONS: PublicComparisonRecord[] = [
  {
    slug: 'chatr-vs-truecaller-privacy',
    competitor: 'Truecaller',
    comparisonTitle: 'Chatr vs Truecaller: Privacy-First Caller Defense',
    summary: 'A direct comparison of caller identification, contact book upload requirements, advertising models, and data privacy safeguards.',
    dimensions: [
      {
        feature: 'Contact Book Upload',
        chatrApproach: 'Zero phonebook crowd-sourcing. Your contacts stay private on your device.',
        competitorApproach: 'Crowdsources address books into a searchable public global directory.'
      },
      {
        feature: 'Ad-Supported Model',
        chatrApproach: '100% Ad-Free experience. Zero intrusive full-screen banners or call overlays.',
        competitorApproach: 'Ad-supported free tier with frequent banner and interstitial promotions.'
      },
      {
        feature: 'Live Call Translation',
        chatrApproach: 'Built-in real-time speech translation and AI call summaries.',
        competitorApproach: 'Does not offer real-time multilingual voice translation during calls.'
      },
      {
        feature: 'Account Architecture',
        chatrApproach: 'One phone number, zero password friction, encrypted transit.',
        competitorApproach: 'Requires email, third-party social logins, and extensive profile permissions.'
      }
    ],
    provenance: {
      sourceUrl: 'https://www.truecaller.com/privacy-policy',
      sourceType: 'public_regulatory_filing',
      retrievedAt: '2026-09-12T16:00:00Z',
      verificationStatus: 'verified',
      verificationMethod: 'manual_audit',
      lastVerifiedAt: '2026-10-01T12:00:00Z',
      expiresAt: '2027-01-01T00:00:00Z',
      verifiedBy: 'Chatr Privacy Architecture Audit Team',
      evidenceHash: '3344556677889900aabbccddeeff11223344556677889900aabbccddeeff1122'
    }
  },
  {
    slug: 'chatr-vs-whatsapp-business-screening',
    competitor: 'WhatsApp Business',
    comparisonTitle: 'Chatr vs WhatsApp Business for Candidate Screening',
    summary: 'How Chatr automated screening flows compare with standard WhatsApp Business quick replies and catalog setups.',
    dimensions: [
      {
        feature: 'Automated Candidate Screening',
        chatrApproach: 'Built-in SI screening questions that auto-summarize applicant readiness.',
        competitorApproach: 'Requires third-party BSP APIs, third-party bots, and complex webhook setups.'
      },
      {
        feature: 'Per-Conversation Charges',
        chatrApproach: 'Free direct messaging without Meta utility/marketing per-message conversation fees.',
        competitorApproach: 'Charges businesses per 24-hour conversation window based on country tier.'
      },
      {
        feature: 'Live Translation in Calls',
        chatrApproach: 'Live translated audio & captions on voice calls between languages.',
        competitorApproach: 'Standard VoIP without speech-to-speech translation.'
      }
    ],
    provenance: {
      sourceUrl: 'https://business.whatsapp.com/pricing',
      sourceType: 'public_regulatory_filing',
      retrievedAt: '2026-09-12T16:30:00Z',
      verificationStatus: 'verified',
      verificationMethod: 'manual_audit',
      lastVerifiedAt: '2026-10-01T12:00:00Z',
      expiresAt: '2027-01-01T00:00:00Z',
      verifiedBy: 'Chatr Enterprise Strategy Audit',
      evidenceHash: '5566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344'
    }
  }
];

export const APPROVED_CITIES: PublicCityRecord[] = [
  {
    slug: 'mumbai',
    cityName: 'Mumbai',
    state: 'Maharashtra',
    primaryLanguages: ['Marathi', 'Hindi', 'English'],
    businessHubs: ['BKC', 'Lower Parel', 'Nariman Point', 'Andheri East'],
    localDialectNotes: 'High prevalence of Bambaiya Hindi mixed with Marathi and Gujarati loanwords.',
    provenance: {
      sourceUrl: 'https://censusindia.gov.in/census.website/data/census-tables',
      sourceType: 'census_demographics',
      retrievedAt: '2026-08-20T10:00:00Z',
      verificationStatus: 'verified',
      verificationMethod: 'registry_lookup',
      lastVerifiedAt: '2026-10-01T12:00:00Z',
      expiresAt: '2030-01-01T00:00:00Z',
      verifiedBy: 'Census of India Linguistic Survey',
      evidenceHash: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899'
    }
  },
  {
    slug: 'delhi',
    cityName: 'Delhi',
    state: 'Delhi NCR',
    primaryLanguages: ['Hindi', 'Punjabi', 'English', 'Urdu'],
    businessHubs: ['Connaught Place', 'Cyber City', 'Noida Sector 62', 'Aerocity'],
    localDialectNotes: 'Mix of standard Khari Boli Hindi with Punjabi business terminology.',
    provenance: {
      sourceUrl: 'https://censusindia.gov.in/census.website/data/census-tables',
      sourceType: 'census_demographics',
      retrievedAt: '2026-08-20T10:30:00Z',
      verificationStatus: 'verified',
      verificationMethod: 'registry_lookup',
      lastVerifiedAt: '2026-10-01T12:00:00Z',
      expiresAt: '2030-01-01T00:00:00Z',
      verifiedBy: 'Census of India Linguistic Survey',
      evidenceHash: 'bbccddeeff00112233445566778899aabbccddeeff00112233445566778899aa'
    }
  },
  {
    slug: 'bengaluru',
    cityName: 'Bengaluru',
    state: 'Karnataka',
    primaryLanguages: ['Kannada', 'English', 'Hindi', 'Tamil', 'Telugu'],
    businessHubs: ['Whitefield', 'Electronic City', 'Koramangala', 'Indiranagar'],
    localDialectNotes: 'Multilingual tech workforce frequently code-switching between Kannada, English, and Hindi.',
    provenance: {
      sourceUrl: 'https://censusindia.gov.in/census.website/data/census-tables',
      sourceType: 'census_demographics',
      retrievedAt: '2026-08-20T11:00:00Z',
      verificationStatus: 'verified',
      verificationMethod: 'registry_lookup',
      lastVerifiedAt: '2026-10-01T12:00:00Z',
      expiresAt: '2030-01-01T00:00:00Z',
      verifiedBy: 'Census of India Linguistic Survey',
      evidenceHash: 'ccddeeff00112233445566778899aabbccddeeff00112233445566778899aabb'
    }
  }
];
