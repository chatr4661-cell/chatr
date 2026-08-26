/**
 * CHATR — Programmatic SEO route generation.
 *
 * Two scalable URL families are generated from real, verifiable data:
 *
 *   /chatr/<use-case>/<city>          e.g. /chatr/live-call-translation/mumbai
 *   /chatr/translate/<a>-to-<b>       e.g. /chatr/translate/hindi-to-punjabi
 *
 * Truth rules (same as the rest of the SEO engine):
 *  - No fabricated metrics: no user counts, no "1,200 people in Mumbai use…".
 *    The only city facts stated are the city name, its state and the languages
 *    commonly spoken there.
 *  - No fabricated freshness: these routes never emit <lastmod>.
 *  - Every generated page has city/language-specific copy, its own H1, its own
 *    FAQs and its own internal links, so it is not a duplicate of the hub page.
 */

import type { ChangeFreq, PublicRoute } from './seo';

// ── Cities ────────────────────────────────────────────────────────────────
// [slug, name, state, commonly spoken languages]
type CityTuple = [string, string, string, string[]];

const CITY_TUPLES: CityTuple[] = [
  ['mumbai', 'Mumbai', 'Maharashtra', ['Marathi', 'Hindi', 'English']],
  ['delhi', 'Delhi', 'Delhi', ['Hindi', 'Punjabi', 'English']],
  ['bengaluru', 'Bengaluru', 'Karnataka', ['Kannada', 'English', 'Hindi']],
  ['hyderabad', 'Hyderabad', 'Telangana', ['Telugu', 'Urdu', 'Hindi']],
  ['chennai', 'Chennai', 'Tamil Nadu', ['Tamil', 'English']],
  ['kolkata', 'Kolkata', 'West Bengal', ['Bengali', 'Hindi', 'English']],
  ['pune', 'Pune', 'Maharashtra', ['Marathi', 'Hindi', 'English']],
  ['ahmedabad', 'Ahmedabad', 'Gujarat', ['Gujarati', 'Hindi']],
  ['jaipur', 'Jaipur', 'Rajasthan', ['Hindi', 'Rajasthani']],
  ['lucknow', 'Lucknow', 'Uttar Pradesh', ['Hindi', 'Urdu']],
  ['noida', 'Noida', 'Uttar Pradesh', ['Hindi', 'English']],
  ['gurugram', 'Gurugram', 'Haryana', ['Hindi', 'Haryanvi', 'English']],
  ['ghaziabad', 'Ghaziabad', 'Uttar Pradesh', ['Hindi', 'Urdu']],
  ['faridabad', 'Faridabad', 'Haryana', ['Hindi', 'Haryanvi']],
  ['chandigarh', 'Chandigarh', 'Chandigarh', ['Punjabi', 'Hindi', 'English']],
  ['ludhiana', 'Ludhiana', 'Punjab', ['Punjabi', 'Hindi']],
  ['amritsar', 'Amritsar', 'Punjab', ['Punjabi', 'Hindi']],
  ['jalandhar', 'Jalandhar', 'Punjab', ['Punjabi', 'Hindi']],
  ['patiala', 'Patiala', 'Punjab', ['Punjabi', 'Hindi']],
  ['mohali', 'Mohali', 'Punjab', ['Punjabi', 'Hindi']],
  ['bathinda', 'Bathinda', 'Punjab', ['Punjabi', 'Hindi']],
  ['pathankot', 'Pathankot', 'Punjab', ['Punjabi', 'Hindi']],
  ['surat', 'Surat', 'Gujarat', ['Gujarati', 'Hindi']],
  ['vadodara', 'Vadodara', 'Gujarat', ['Gujarati', 'Hindi']],
  ['rajkot', 'Rajkot', 'Gujarat', ['Gujarati', 'Hindi']],
  ['bhavnagar', 'Bhavnagar', 'Gujarat', ['Gujarati', 'Hindi']],
  ['jamnagar', 'Jamnagar', 'Gujarat', ['Gujarati', 'Hindi']],
  ['gandhinagar', 'Gandhinagar', 'Gujarat', ['Gujarati', 'Hindi']],
  ['nagpur', 'Nagpur', 'Maharashtra', ['Marathi', 'Hindi']],
  ['nashik', 'Nashik', 'Maharashtra', ['Marathi', 'Hindi']],
  ['aurangabad', 'Aurangabad', 'Maharashtra', ['Marathi', 'Urdu', 'Hindi']],
  ['thane', 'Thane', 'Maharashtra', ['Marathi', 'Hindi']],
  ['navi-mumbai', 'Navi Mumbai', 'Maharashtra', ['Marathi', 'Hindi', 'English']],
  ['kolhapur', 'Kolhapur', 'Maharashtra', ['Marathi', 'Hindi']],
  ['solapur', 'Solapur', 'Maharashtra', ['Marathi', 'Kannada', 'Hindi']],
  ['amravati', 'Amravati', 'Maharashtra', ['Marathi', 'Hindi']],
  ['mysuru', 'Mysuru', 'Karnataka', ['Kannada', 'English']],
  ['mangaluru', 'Mangaluru', 'Karnataka', ['Kannada', 'Tulu', 'English']],
  ['hubballi', 'Hubballi', 'Karnataka', ['Kannada', 'Hindi']],
  ['belagavi', 'Belagavi', 'Karnataka', ['Kannada', 'Marathi']],
  ['davanagere', 'Davanagere', 'Karnataka', ['Kannada']],
  ['coimbatore', 'Coimbatore', 'Tamil Nadu', ['Tamil', 'English']],
  ['madurai', 'Madurai', 'Tamil Nadu', ['Tamil']],
  ['tiruchirappalli', 'Tiruchirappalli', 'Tamil Nadu', ['Tamil']],
  ['salem', 'Salem', 'Tamil Nadu', ['Tamil']],
  ['tirunelveli', 'Tirunelveli', 'Tamil Nadu', ['Tamil']],
  ['erode', 'Erode', 'Tamil Nadu', ['Tamil']],
  ['vellore', 'Vellore', 'Tamil Nadu', ['Tamil']],
  ['thoothukudi', 'Thoothukudi', 'Tamil Nadu', ['Tamil']],
  ['visakhapatnam', 'Visakhapatnam', 'Andhra Pradesh', ['Telugu', 'Hindi']],
  ['vijayawada', 'Vijayawada', 'Andhra Pradesh', ['Telugu']],
  ['guntur', 'Guntur', 'Andhra Pradesh', ['Telugu']],
  ['nellore', 'Nellore', 'Andhra Pradesh', ['Telugu']],
  ['tirupati', 'Tirupati', 'Andhra Pradesh', ['Telugu']],
  ['kurnool', 'Kurnool', 'Andhra Pradesh', ['Telugu', 'Urdu']],
  ['rajahmundry', 'Rajahmundry', 'Andhra Pradesh', ['Telugu']],
  ['warangal', 'Warangal', 'Telangana', ['Telugu', 'Urdu']],
  ['nizamabad', 'Nizamabad', 'Telangana', ['Telugu', 'Urdu']],
  ['karimnagar', 'Karimnagar', 'Telangana', ['Telugu']],
  ['kochi', 'Kochi', 'Kerala', ['Malayalam', 'English']],
  ['thiruvananthapuram', 'Thiruvananthapuram', 'Kerala', ['Malayalam', 'English']],
  ['kozhikode', 'Kozhikode', 'Kerala', ['Malayalam']],
  ['thrissur', 'Thrissur', 'Kerala', ['Malayalam']],
  ['kollam', 'Kollam', 'Kerala', ['Malayalam']],
  ['kannur', 'Kannur', 'Kerala', ['Malayalam']],
  ['alappuzha', 'Alappuzha', 'Kerala', ['Malayalam']],
  ['bhopal', 'Bhopal', 'Madhya Pradesh', ['Hindi', 'Urdu']],
  ['indore', 'Indore', 'Madhya Pradesh', ['Hindi']],
  ['jabalpur', 'Jabalpur', 'Madhya Pradesh', ['Hindi']],
  ['gwalior', 'Gwalior', 'Madhya Pradesh', ['Hindi']],
  ['ujjain', 'Ujjain', 'Madhya Pradesh', ['Hindi']],
  ['sagar', 'Sagar', 'Madhya Pradesh', ['Hindi']],
  ['patna', 'Patna', 'Bihar', ['Hindi', 'Bhojpuri', 'Urdu']],
  ['gaya', 'Gaya', 'Bihar', ['Hindi', 'Magahi']],
  ['bhagalpur', 'Bhagalpur', 'Bihar', ['Hindi', 'Angika']],
  ['muzaffarpur', 'Muzaffarpur', 'Bihar', ['Hindi', 'Bhojpuri']],
  ['darbhanga', 'Darbhanga', 'Bihar', ['Hindi', 'Maithili']],
  ['ranchi', 'Ranchi', 'Jharkhand', ['Hindi', 'Nagpuri']],
  ['jamshedpur', 'Jamshedpur', 'Jharkhand', ['Hindi', 'Bengali']],
  ['dhanbad', 'Dhanbad', 'Jharkhand', ['Hindi']],
  ['bokaro', 'Bokaro', 'Jharkhand', ['Hindi']],
  ['raipur', 'Raipur', 'Chhattisgarh', ['Hindi', 'Chhattisgarhi']],
  ['bhilai', 'Bhilai', 'Chhattisgarh', ['Hindi', 'Chhattisgarhi']],
  ['bilaspur', 'Bilaspur', 'Chhattisgarh', ['Hindi', 'Chhattisgarhi']],
  ['bhubaneswar', 'Bhubaneswar', 'Odisha', ['Odia', 'Hindi', 'English']],
  ['cuttack', 'Cuttack', 'Odisha', ['Odia', 'Hindi']],
  ['rourkela', 'Rourkela', 'Odisha', ['Odia', 'Hindi']],
  ['berhampur', 'Berhampur', 'Odisha', ['Odia', 'Telugu']],
  ['sambalpur', 'Sambalpur', 'Odisha', ['Odia']],
  ['guwahati', 'Guwahati', 'Assam', ['Assamese', 'Bengali', 'Hindi']],
  ['dibrugarh', 'Dibrugarh', 'Assam', ['Assamese', 'Hindi']],
  ['silchar', 'Silchar', 'Assam', ['Bengali', 'Assamese', 'Hindi']],
  ['jorhat', 'Jorhat', 'Assam', ['Assamese']],
  ['shillong', 'Shillong', 'Meghalaya', ['Khasi', 'English', 'Hindi']],
  ['imphal', 'Imphal', 'Manipur', ['Manipuri', 'English']],
  ['aizawl', 'Aizawl', 'Mizoram', ['Mizo', 'English']],
  ['agartala', 'Agartala', 'Tripura', ['Bengali', 'Kokborok']],
  ['kohima', 'Kohima', 'Nagaland', ['English', 'Nagamese']],
  ['gangtok', 'Gangtok', 'Sikkim', ['Nepali', 'English']],
  ['itanagar', 'Itanagar', 'Arunachal Pradesh', ['English', 'Hindi']],
  ['siliguri', 'Siliguri', 'West Bengal', ['Bengali', 'Hindi', 'Nepali']],
  ['durgapur', 'Durgapur', 'West Bengal', ['Bengali', 'Hindi']],
  ['asansol', 'Asansol', 'West Bengal', ['Bengali', 'Hindi']],
  ['howrah', 'Howrah', 'West Bengal', ['Bengali', 'Hindi']],
  ['kharagpur', 'Kharagpur', 'West Bengal', ['Bengali', 'Hindi']],
  ['kanpur', 'Kanpur', 'Uttar Pradesh', ['Hindi', 'Urdu']],
  ['varanasi', 'Varanasi', 'Uttar Pradesh', ['Hindi', 'Bhojpuri']],
  ['agra', 'Agra', 'Uttar Pradesh', ['Hindi', 'Braj']],
  ['meerut', 'Meerut', 'Uttar Pradesh', ['Hindi', 'Urdu']],
  ['prayagraj', 'Prayagraj', 'Uttar Pradesh', ['Hindi']],
  ['bareilly', 'Bareilly', 'Uttar Pradesh', ['Hindi', 'Urdu']],
  ['aligarh', 'Aligarh', 'Uttar Pradesh', ['Hindi', 'Urdu']],
  ['moradabad', 'Moradabad', 'Uttar Pradesh', ['Hindi', 'Urdu']],
  ['gorakhpur', 'Gorakhpur', 'Uttar Pradesh', ['Hindi', 'Bhojpuri']],
  ['saharanpur', 'Saharanpur', 'Uttar Pradesh', ['Hindi', 'Urdu']],
  ['jhansi', 'Jhansi', 'Uttar Pradesh', ['Hindi', 'Bundeli']],
  ['mathura', 'Mathura', 'Uttar Pradesh', ['Hindi', 'Braj']],
  ['ayodhya', 'Ayodhya', 'Uttar Pradesh', ['Hindi', 'Awadhi']],
  ['dehradun', 'Dehradun', 'Uttarakhand', ['Hindi', 'Garhwali']],
  ['haridwar', 'Haridwar', 'Uttarakhand', ['Hindi']],
  ['haldwani', 'Haldwani', 'Uttarakhand', ['Hindi', 'Kumaoni']],
  ['rishikesh', 'Rishikesh', 'Uttarakhand', ['Hindi', 'Garhwali']],
  ['shimla', 'Shimla', 'Himachal Pradesh', ['Hindi', 'Pahari']],
  ['dharamshala', 'Dharamshala', 'Himachal Pradesh', ['Hindi', 'Kangri']],
  ['solan', 'Solan', 'Himachal Pradesh', ['Hindi', 'Pahari']],
  ['mandi', 'Mandi', 'Himachal Pradesh', ['Hindi', 'Mandeali']],
  ['jammu', 'Jammu', 'Jammu and Kashmir', ['Dogri', 'Hindi', 'Punjabi']],
  ['srinagar', 'Srinagar', 'Jammu and Kashmir', ['Kashmiri', 'Urdu']],
  ['leh', 'Leh', 'Ladakh', ['Ladakhi', 'Hindi']],
  ['jodhpur', 'Jodhpur', 'Rajasthan', ['Hindi', 'Marwari']],
  ['udaipur', 'Udaipur', 'Rajasthan', ['Hindi', 'Mewari']],
  ['kota', 'Kota', 'Rajasthan', ['Hindi']],
  ['ajmer', 'Ajmer', 'Rajasthan', ['Hindi', 'Urdu']],
  ['bikaner', 'Bikaner', 'Rajasthan', ['Hindi', 'Marwari']],
  ['alwar', 'Alwar', 'Rajasthan', ['Hindi', 'Mewati']],
  ['bhilwara', 'Bhilwara', 'Rajasthan', ['Hindi', 'Mewari']],
  ['panaji', 'Panaji', 'Goa', ['Konkani', 'Marathi', 'English']],
  ['vasco-da-gama', 'Vasco da Gama', 'Goa', ['Konkani', 'English']],
  ['ambala', 'Ambala', 'Haryana', ['Hindi', 'Punjabi']],
  ['panipat', 'Panipat', 'Haryana', ['Hindi', 'Haryanvi']],
  ['hisar', 'Hisar', 'Haryana', ['Hindi', 'Haryanvi']],
  ['karnal', 'Karnal', 'Haryana', ['Hindi', 'Haryanvi']],
  ['rohtak', 'Rohtak', 'Haryana', ['Hindi', 'Haryanvi']],
  ['sonipat', 'Sonipat', 'Haryana', ['Hindi', 'Haryanvi']],
  ['yamunanagar', 'Yamunanagar', 'Haryana', ['Hindi', 'Punjabi']],
  ['puducherry', 'Puducherry', 'Puducherry', ['Tamil', 'French', 'English']],
];

export interface SeoCity {
  slug: string;
  name: string;
  state: string;
  languages: string[];
}

export const SEO_CITIES: SeoCity[] = CITY_TUPLES.map(([slug, name, state, languages]) => ({
  slug,
  name,
  state,
  languages,
}));

const CITY_BY_SLUG = new Map(SEO_CITIES.map((c) => [c.slug, c]));
export const getSeoCity = (slug?: string): SeoCity | undefined =>
  slug ? CITY_BY_SLUG.get(slug.toLowerCase()) : undefined;

export const citiesInState = (state: string, excludeSlug?: string): SeoCity[] =>
  SEO_CITIES.filter((c) => c.state === state && c.slug !== excludeSlug);

// ── Use cases ─────────────────────────────────────────────────────────────

export interface SeoUseCase {
  slug: string;
  /** Short label used in breadcrumbs and link lists. */
  label: string;
  /** Hub page this family rolls up to. */
  hub: string;
  /** Search intent, city name interpolated at render time. */
  intentLabel: string;
  priority: number;
  changefreq: ChangeFreq;
}

export const SEO_USE_CASES: SeoUseCase[] = [
  {
    slug: 'live-call-translation',
    label: 'Live call translation',
    hub: '/chatr/live-call-translation',
    intentLabel: 'live call translation',
    priority: 0.6,
    changefreq: 'monthly',
  },
  {
    slug: 'ai-call-answering',
    label: 'AI call answering',
    hub: '/chatr/ai-call-answering',
    intentLabel: 'AI answering your calls',
    priority: 0.6,
    changefreq: 'monthly',
  },
  {
    slug: 'spam-call-protection',
    label: 'Spam call protection',
    hub: '/chatr/spam-call-protection',
    intentLabel: 'spam and scam call protection',
    priority: 0.6,
    changefreq: 'weekly',
  },
  {
    slug: 'calls-on-slow-networks',
    label: 'Calls on slow networks',
    hub: '/chatr/calls-on-slow-networks',
    intentLabel: 'calls that hold up on a weak signal',
    priority: 0.6,
    changefreq: 'monthly',
  },
  {
    slug: 'business-messaging',
    label: 'Business messaging',
    hub: '/chatr/business-messaging',
    intentLabel: 'business messaging and a shared inbox',
    priority: 0.6,
    changefreq: 'monthly',
  },
  {
    slug: 'universal-inbox-ai',
    label: 'Universal inbox with AI',
    hub: '/chatr/universal-inbox-ai',
    intentLabel: 'one inbox for email, WhatsApp, Slack and Teams',
    priority: 0.6,
    changefreq: 'monthly',
  },
  {
    slug: 'whatsapp-candidate-screening',
    label: 'WhatsApp candidate screening',
    hub: '/chatr/whatsapp-candidate-screening',
    intentLabel: 'screening job candidates over WhatsApp',
    priority: 0.6,
    changefreq: 'monthly',
  },
];

const USE_CASE_BY_SLUG = new Map(SEO_USE_CASES.map((u) => [u.slug, u]));
export const getSeoUseCase = (slug?: string): SeoUseCase | undefined =>
  slug ? USE_CASE_BY_SLUG.get(slug.toLowerCase()) : undefined;

export const cityUseCasePath = (useCaseSlug: string, citySlug: string) =>
  `/chatr/${useCaseSlug}/${citySlug}`;

export const cityUseCaseTitle = (useCase: SeoUseCase, city: SeoCity) =>
  `${useCase.label} in ${city.name} — Chatr`;

export const cityUseCaseDescription = (useCase: SeoUseCase, city: SeoCity) =>
  `Chatr for ${useCase.intentLabel} in ${city.name}, ${city.state}. Built for how people actually talk here — ${listLanguages(city.languages)} — with phone-number sign-in and no extra hardware.`;

export const listLanguages = (languages: string[]) =>
  languages.length <= 1
    ? languages[0] ?? ''
    : `${languages.slice(0, -1).join(', ')} and ${languages[languages.length - 1]}`;

// ── Language pairs ────────────────────────────────────────────────────────

export interface SeoLanguage {
  slug: string;
  name: string;
  native: string;
}

export const SEO_LANGUAGES: SeoLanguage[] = [
  { slug: 'hindi', name: 'Hindi', native: 'हिन्दी' },
  { slug: 'english', name: 'English', native: 'English' },
  { slug: 'punjabi', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { slug: 'marathi', name: 'Marathi', native: 'मराठी' },
  { slug: 'gujarati', name: 'Gujarati', native: 'ગુજરાતી' },
  { slug: 'bengali', name: 'Bengali', native: 'বাংলা' },
  { slug: 'tamil', name: 'Tamil', native: 'தமிழ்' },
  { slug: 'telugu', name: 'Telugu', native: 'తెలుగు' },
  { slug: 'kannada', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { slug: 'malayalam', name: 'Malayalam', native: 'മലയാളം' },
  { slug: 'odia', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { slug: 'assamese', name: 'Assamese', native: 'অসমীয়া' },
  { slug: 'urdu', name: 'Urdu', native: 'اردو' },
  { slug: 'bhojpuri', name: 'Bhojpuri', native: 'भोजपुरी' },
  { slug: 'maithili', name: 'Maithili', native: 'मैथिली' },
  { slug: 'rajasthani', name: 'Rajasthani', native: 'राजस्थानी' },
  { slug: 'haryanvi', name: 'Haryanvi', native: 'हरियाणवी' },
  { slug: 'konkani', name: 'Konkani', native: 'कोंकणी' },
  { slug: 'tulu', name: 'Tulu', native: 'ತುಳು' },
  { slug: 'nepali', name: 'Nepali', native: 'नेपाली' },
  { slug: 'kashmiri', name: 'Kashmiri', native: 'کٲشُر' },
  { slug: 'sindhi', name: 'Sindhi', native: 'سنڌي' },
  { slug: 'dogri', name: 'Dogri', native: 'डोगरी' },
  { slug: 'manipuri', name: 'Manipuri', native: 'মৈতৈলোন্' },
  { slug: 'santali', name: 'Santali', native: 'ᱥᱟᱱᱛᱟᱲᱤ' },
];


const LANGUAGE_BY_SLUG = new Map(SEO_LANGUAGES.map((l) => [l.slug, l]));

export interface SeoLanguagePair {
  from: SeoLanguage;
  to: SeoLanguage;
  slug: string;
}

export const LANGUAGE_PAIRS: SeoLanguagePair[] = SEO_LANGUAGES.flatMap((from) =>
  SEO_LANGUAGES.filter((to) => to.slug !== from.slug).map((to) => ({
    from,
    to,
    slug: `${from.slug}-to-${to.slug}`,
  })),
);

export const languagePairPath = (slug: string) => `/chatr/translate/${slug}`;

export const getLanguagePair = (slug?: string): SeoLanguagePair | undefined => {
  if (!slug) return undefined;
  const [from, to] = slug.toLowerCase().split('-to-');
  const a = LANGUAGE_BY_SLUG.get(from ?? '');
  const b = LANGUAGE_BY_SLUG.get(to ?? '');
  if (!a || !b || a.slug === b.slug) return undefined;
  return { from: a, to: b, slug: `${a.slug}-to-${b.slug}` };
};

export const languagePairTitle = (pair: SeoLanguagePair) =>
  `${pair.from.name} to ${pair.to.name} Call Translation — Chatr`;

export const languagePairDescription = (pair: SeoLanguagePair) =>
  `Speak ${pair.from.name} on a call and let the other person hear ${pair.to.name}. Chatr translates speech in both directions during a voice or video call, with captions you can read as you talk.`;

// ── Directory hubs ────────────────────────────────────────────────────────

export const DIRECTORY_ROUTES: PublicRoute[] = [
  {
    path: '/chatr/locations',
    title: 'Chatr by City — Calling and Messaging Across India',
    description:
      'Browse Chatr calling and messaging use cases city by city, from Mumbai and Delhi to Ludhiana, Coimbatore and Guwahati, with the languages each page is written for.',
    changefreq: 'weekly',
    priority: 0.7,
  },
  {
    path: '/chatr/translate',
    title: 'Call Translation Language Pairs — Chatr',
    description:
      'Every language pair Chatr can translate during a live voice or video call, from Hindi to Punjabi through to Tamil, Telugu, Bengali, Malayalam and Urdu.',
    changefreq: 'weekly',
    priority: 0.7,
  },
];

// ── Generated PublicRoute entries ─────────────────────────────────────────

export const CITY_USE_CASE_ROUTES: PublicRoute[] = SEO_USE_CASES.flatMap((useCase) =>
  SEO_CITIES.map((city) => ({
    path: cityUseCasePath(useCase.slug, city.slug),
    title: cityUseCaseTitle(useCase, city),
    description: cityUseCaseDescription(useCase, city),
    changefreq: useCase.changefreq,
    priority: useCase.priority,
  })),
);

export const LANGUAGE_PAIR_ROUTES: PublicRoute[] = LANGUAGE_PAIRS.map((pair) => ({
  path: languagePairPath(pair.slug),
  title: languagePairTitle(pair),
  description: languagePairDescription(pair),
  changefreq: 'monthly' as ChangeFreq,
  priority: 0.6,
}));

/** Everything this module contributes to PUBLIC_ROUTES. */
export const PROGRAMMATIC_ROUTES: PublicRoute[] = [
  ...DIRECTORY_ROUTES,
  ...CITY_USE_CASE_ROUTES,
  ...LANGUAGE_PAIR_ROUTES,
];
