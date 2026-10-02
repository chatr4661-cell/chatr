import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Bell,
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Dumbbell,
  Eye,
  EyeOff,
  Flame,
  Globe2,
  Heart,
  HeartPulse,
  Languages,
  Lock,
  MessageSquare,
  Mic,
  Moon,
  Phone,
  PhoneCall,
  Play,
  Plus,
  Minus,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Users,
  Video,
  Volume2,
  Wrench,
  X,
  Menu,
  Zap,
} from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import {
  ORGANIZATION_NAME,
  PRODUCTION_ORIGIN,
  SITE_NAME,
  SOCIAL_PROFILES,
  absoluteUrl,
} from '@/config/seo';

/**
 * Chatr Consumer Homepage
 * Embodying the clean, crisp modern design with:
 * - High-definition smiling families, friends, and live calling imagery
 * - LIVE Calling demonstrated prominently on the LEFT side of the page
 * - BEYOND MESSAGING SHOWCASE:
 *   1. Chatr Health & Vitals (Overall Health 92, Heart Rate, HRV, Sleep, Stress, AI Insights)
 *   2. Biometrics & Fitness Intelligence (BMI, Daily Calories, Protein, Age, Weight, Height, Goals)
 *   3. ChatrShield PRO (Identity & Fraud Defense, Shield Score 90, Profile Views Alerts, Dark Web Scanner)
 * - "One app for how you communicate" with 5 rich preview cards
 * - Realtime Live Calling & Video Translation split showcase
 * - Chatr+ Interactive Onboarding Strip with phone number OTP form
 * - Editorial "Built for everyday life" cards with genuine smiling photos
 * - Complete narrative: Privacy controls, 4-step onboarding, and full footer directory.
 */
const PublicHome: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [siAnswerEnabled, setSiAnswerEnabled] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Interactive Health & Shield States (matching uploaded screens)
  const [autoProfileAlerts, setAutoProfileAlerts] = useState(true);
  const [bioAge, setBioAge] = useState(45);
  const [bioWeight, setBioWeight] = useState(74);
  const [bioHeight, setBioHeight] = useState(164);
  const [bioMeals, setBioMeals] = useState(4);
  const [bioSex, setBioSex] = useState<'Male' | 'Female' | 'Other'>('Female');
  const [bioGoal, setBioGoal] = useState<'lose' | 'maintain' | 'gain'>('maintain');
  const [healthTab, setHealthTab] = useState<'today' | 'vitals' | 'sleep' | 'activity' | 'trends'>('today');

  const countryCodes = [
    { code: '+91', country: 'IN', flag: '🇮🇳' },
    { code: '+1', country: 'US', flag: '🇺🇸' },
    { code: '+44', country: 'UK', flag: '🇬🇧' },
    { code: '+971', country: 'AE', flag: '🇦🇪' },
    { code: '+65', country: 'SG', flag: '🇸🇬' },
  ];

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = phoneNumber.trim().replace(/\D/g, '');
    if (cleanNumber) {
      navigate(`/auth?phone=${encodeURIComponent(countryCode + cleanNumber)}`);
    } else {
      navigate('/auth');
    }
  };

  const homepageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${PRODUCTION_ORIGIN}/#organization`,
        name: ORGANIZATION_NAME,
        alternateName: 'Chatr',
        url: PRODUCTION_ORIGIN,
        logo: absoluteUrl('/images/chatr-official-logo.png'),
        sameAs: SOCIAL_PROFILES,
      },
      {
        '@type': 'WebSite',
        '@id': `${PRODUCTION_ORIGIN}/#website`,
        name: SITE_NAME,
        url: PRODUCTION_ORIGIN,
        inLanguage: 'en-IN',
        publisher: { '@id': `${PRODUCTION_ORIGIN}/#organization` },
      },
      {
        '@type': 'WebApplication',
        '@id': `${PRODUCTION_ORIGIN}/#webapp`,
        name: 'Chatr',
        alternateName: 'Chatr — Talk. Connect. Let SI help.',
        url: PRODUCTION_ORIGIN,
        applicationCategory: 'CommunicationApplication',
        operatingSystem: 'Web, Android',
        description:
          'Chatr is a modern messaging, calling, health, and identity defense app built for everyday conversations. Chat with friends and family, track vitals, manage fitness biometrics, and protect against fraud with ChatrShield PRO.',
        publisher: { '@id': `${PRODUCTION_ORIGIN}/#organization` },
        featureList: [
          'Private messaging with photos, videos, documents, and voice messages',
          'Voice and video calling designed for all network conditions',
          'Chatr Health — overall health scores, heart rate, HRV, sleep, and stress tracking',
          'Biometrics & Nutrition — daily kcal, protein targets, and metabolic goals',
          'ChatrShield PRO — real-time number lookup alerts and dark web identity monitoring',
          'SI personal intelligence for summaries, drafts, translation, and routine replies',
          'Live call translation',
          'SI Answer for automated call handling',
          'Communities and discovery for people, jobs, services, and businesses',
          'Phone-number sign-in with one-time verification',
        ],
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white text-[#0F172A] font-sans antialiased selection:bg-[#E0F2E9] selection:text-[#093E32]">
      <SEOHead
        title="Chatr — Talk. Connect. Let SI help."
        description="Messaging, calling, health vitals, identity defense and personal SI together in one simple app. One number. One account. One Chatr."
        canonicalUrl="/"
        noIndex={false}
        schemaData={homepageSchema}
      />

      {/* ========================================================= */}
      {/* 1. BRAND HEADER                                           */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-bold tracking-tight text-[#0F172A]">chatr</span>
            <div className="w-6 h-6 rounded-lg bg-[#00D084] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <MessageSquare className="w-3.5 h-3.5 fill-current" />
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#475569]">
            
            {/* Features Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('features')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center gap-1 hover:text-[#0F172A] transition-colors py-2 cursor-pointer">
                <span>Features</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
              {activeDropdown === 'features' && (
                <div className="absolute top-full left-0 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150 z-50">
                  <Link
                    to="/chat"
                    className="w-full text-left p-2.5 rounded-xl hover:bg-gray-50 flex items-start gap-3 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#E0F2E9] text-[#093E32] flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#0F172A]">Private Messaging</div>
                      <div className="text-[11px] text-gray-500">Text, photos, audio & documents</div>
                    </div>
                  </Link>
                  <Link
                    to="/calls"
                    className="w-full text-left p-2.5 rounded-xl hover:bg-gray-50 flex items-start gap-3 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#0F172A]">Voice &amp; Video Calls</div>
                      <div className="text-[11px] text-gray-500">Crystal clear calls worldwide</div>
                    </div>
                  </Link>
                  <Link
                    to="/health"
                    className="w-full text-left p-2.5 rounded-xl hover:bg-gray-50 flex items-start gap-3 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                      <HeartPulse className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#0F172A]">Chatr Health &amp; Vitals</div>
                      <div className="text-[11px] text-gray-500">Heart rate, HRV, sleep &amp; stress</div>
                    </div>
                  </Link>
                  <Link
                    to="/health-risks"
                    className="w-full text-left p-2.5 rounded-xl hover:bg-gray-50 flex items-start gap-3 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#0F172A]">ChatrShield PRO</div>
                      <div className="text-[11px] text-gray-500">Identity &amp; phone fraud defense</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* SI Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('si')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center gap-1 hover:text-[#0F172A] transition-colors py-2 cursor-pointer">
                <span>SI</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
              {activeDropdown === 'si' && (
                <div className="absolute top-full left-0 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150 z-50">
                  <Link
                    to="/ai-assistant"
                    className="w-full text-left p-2.5 rounded-xl hover:bg-gray-50 flex items-start gap-3 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#E0F2E9] text-[#093E32] flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#0F172A]">SI — Personal Intelligence</div>
                      <div className="text-[11px] text-gray-500">Summaries, replies, translations</div>
                    </div>
                  </Link>
                  <Link
                    to="/chatr/ai-call-answering"
                    className="w-full text-left p-2.5 rounded-xl hover:bg-gray-50 flex items-start gap-3 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#0F172A]">SI Answer</div>
                      <div className="text-[11px] text-gray-500">Answers calls &amp; sends summaries</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            <Link to="/communities" className="hover:text-[#0F172A] transition-colors">
              Communities
            </Link>

            <Link to="/discover" className="hover:text-[#0F172A] transition-colors">
              Discover
            </Link>

            <Link to="/health" className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 font-semibold transition-colors">
              <HeartPulse className="w-4 h-4" />
              <span>Health</span>
            </Link>

            <Link to="/download" className="hover:text-[#0F172A] transition-colors">
              Download
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-5">
            <Link
              to="/auth"
              className="text-sm font-semibold text-[#0F172A] hover:text-[#093E32] transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#093E32] hover:bg-[#072F26] text-white text-sm font-semibold shadow-sm hover:shadow transition-all"
            >
              <span>Get Chatr</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              to="/auth"
              className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-[#093E32] text-white"
            >
              Get Chatr
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-700 hover:text-[#093E32] rounded-lg"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-5 pt-3 pb-6 space-y-3 shadow-xl animate-in slide-in-from-top-2 duration-150">
            <Link to="/chat" className="block py-2 text-sm font-semibold text-gray-900">
              Private Messaging
            </Link>
            <Link to="/calls" className="block py-2 text-sm font-semibold text-gray-900">
              Voice &amp; Video Calls
            </Link>
            <Link to="/health" className="block py-2 text-sm font-semibold text-rose-600">
              Chatr Health &amp; Vitals
            </Link>
            <Link to="/ai-assistant" className="block py-2 text-sm font-semibold text-gray-900">
              SI Personal Intelligence
            </Link>
            <Link to="/communities" className="block py-2 text-sm font-semibold text-gray-900">
              Communities
            </Link>
            <Link to="/discover" className="block py-2 text-sm font-semibold text-gray-900">
              Discover
            </Link>
            <Link to="/download" className="block py-2 text-sm font-semibold text-gray-900">
              Download App
            </Link>
            <div className="pt-3 border-t border-gray-100">
              <Link
                to="/auth"
                className="block w-full text-center py-3 rounded-full bg-[#093E32] text-white font-semibold text-sm"
              >
                Sign In / Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================= */}
      {/* 2. HERO SECTION (WITH LIVE CALL PREVIEW ON LEFT SIDE)      */}
      {/* ========================================================= */}
      <section className="relative overflow-hidden pt-10 sm:pt-16 pb-20 lg:pb-28">
        
        {/* Ambient Radial Gradient Mesh in Background */}
        <div className="absolute top-1/4 right-5 sm:right-20 w-[450px] sm:w-[600px] h-[450px] sm:h-[600px] bg-gradient-to-tr from-[#10B981]/15 via-[#34D399]/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-10 w-[350px] h-[350px] bg-[#E0F2E9]/40 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-20 right-1/3 w-[300px] h-[300px] bg-purple-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* LEFT COLUMN: Narrative, Action & LIVE CALL ON LEFT */}
            <div className="lg:col-span-6 space-y-6 z-10">
              
              {/* Mint Top Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBF7F2] border border-[#BCE8D5] text-[#0D6246] text-xs font-semibold shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>More than chat. A smarter way to stay connected.</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-[#0F172A] leading-[1.08]">
                Talk. Connect.<br />
                <span className="text-[#094D3B]">Let SI help.</span>
              </h1>

              {/* Subheading */}
              <p className="text-base sm:text-lg text-[#475569] leading-relaxed max-w-lg">
                Messaging, calling, communities, health vitals, and fraud defense in one simple app.
              </p>

              {/* ======================================================== */}
              {/* LIVE CALL SHOWCASE ON LEFT SIDE: SMILING FAMILY & FRIENDS */}
              {/* ======================================================== */}
              <div className="bg-white/95 backdrop-blur-md rounded-3xl p-4 border border-emerald-200/80 shadow-xl shadow-emerald-500/5 max-w-lg space-y-3 relative">
                
                {/* Live Header Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      <span>LIVE NOW</span>
                    </span>
                    <span className="text-xs font-bold text-gray-900">Family &amp; Friends HD Call</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>1080p Ultra HD · 08:24</span>
                  </div>
                </div>

                {/* Dual High-Res Smiling Streams */}
                <div className="grid grid-cols-2 gap-2">
                  
                  {/* Stream 1: Smiling Mother & Child laughing */}
                  <div className="relative h-28 sm:h-32 rounded-2xl overflow-hidden bg-gray-900 border border-emerald-100 shadow-xs">
                    <img
                      src="https://images.unsplash.com/photo-1609220136736-443140cffec6?w=400&auto=format&fit=crop&q=80"
                      alt="Smiling Mom and Kid"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-xs text-[9px] text-white font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Mom &amp; Riya (Delhi)</span>
                    </div>
                    {/* Live Audio Equalizer Waveform */}
                    <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 h-3 px-1.5 bg-black/50 backdrop-blur-xs rounded-md">
                      <span className="w-0.5 h-1.5 bg-emerald-400 animate-pulse" />
                      <span className="w-0.5 h-3 bg-emerald-400 animate-pulse [animation-delay:100ms]" />
                      <span className="w-0.5 h-2 bg-emerald-400 animate-pulse [animation-delay:200ms]" />
                      <span className="w-0.5 h-2.5 bg-emerald-400 animate-pulse [animation-delay:150ms]" />
                    </div>
                  </div>

                  {/* Stream 2: Smiling Brother / Son in London */}
                  <div className="relative h-28 sm:h-32 rounded-2xl overflow-hidden bg-gray-900 border border-emerald-100 shadow-xs">
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80"
                      alt="Smiling Brother"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-xs text-[9px] text-white font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Arjun (London)</span>
                    </div>
                    <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-emerald-600/90 text-[9px] font-bold text-white shadow-xs">
                      Speaking 🎙️
                    </div>
                  </div>

                </div>

                {/* Live Speech Subtitle with Realtime Translation */}
                <div className="p-2.5 rounded-2xl bg-[#F0FDF4] border border-emerald-200/60 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2 text-emerald-950 font-medium truncate">
                    <span className="text-emerald-600 text-sm">🌐</span>
                    <span className="truncate">"Mom, look who joined the call! We are all here! 🎉"</span>
                  </div>
                  <span className="text-[9px] text-emerald-800 font-bold bg-white px-2 py-0.5 rounded-lg shrink-0 border border-emerald-200 shadow-2xs">
                    Translated Live
                  </span>
                </div>

                {/* Live Active Presence Counter */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-gray-500 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-1.5">
                      <img className="w-5 h-5 rounded-full border border-white object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80" alt="Active 1" />
                      <img className="w-5 h-5 rounded-full border border-white object-cover" src="https://images.unsplash.com/photo-1511895426328-dc8714191300?w=60&auto=format&fit=crop&q=80" alt="Active 2" />
                      <img className="w-5 h-5 rounded-full border border-white object-cover" src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=60&auto=format&fit=crop&q=80" alt="Active 3" />
                    </div>
                    <span className="font-semibold text-gray-800">14,800+</span>
                    <span>friends &amp; families live now</span>
                  </div>
                  <span className="text-emerald-600 font-bold text-[10px]">● Zero Lag</span>
                </div>

              </div>

              <p className="text-sm text-gray-500 leading-relaxed max-w-lg">
                Chat with friends and family, make voice and video calls, track your vitals and sleep, personalize your fitness targets, and use Chatr's SI to help you navigate everyday life.
              </p>

              <div className="text-sm font-bold text-[#0F172A]">
                One number. One account. One Chatr.
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2.5 px-6 sm:px-7 py-3.5 rounded-full bg-[#093E32] hover:bg-[#072F26] text-white text-sm sm:text-base font-semibold shadow-md hover:shadow-lg transition-all transform active:scale-[0.99]"
                >
                  <Phone className="w-4 h-4 fill-current" />
                  <span>Get started free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/download"
                  className="inline-flex items-center gap-2.5 px-5 sm:px-6 py-3.5 rounded-full bg-white hover:bg-gray-50 text-[#0F172A] border border-gray-200 text-sm sm:text-base font-medium shadow-xs hover:border-gray-300 transition-all"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M3.6 1.8l9.6 9.6-9.6 9.6c-.4-.4-.6-1-.6-1.7V3.5c0-.7.2-1.3.6-1.7z" />
                    <path fill="#34A853" d="M16.5 14.7l-3.3-3.3-9.6 9.6c.3.2.7.3 1.2.3.8 0 1.6-.4 2.2-.8l9.5-5.8z" />
                    <path fill="#FBBC05" d="M19.7 11.2l-3.2-1.9-3.3 2.1 3.3 3.3 3.2-1.9c.7-.4 1.1-1 1.1-1.6s-.4-1.2-1.1-1.6z" />
                    <path fill="#EA4335" d="M3.6 1.8l9.6 9.6 3.3-2.1-9.5-5.8C6.4 3.1 5.6 2.7 4.8 2.7c-.5 0-.9.1-1.2.3z" />
                  </svg>
                  <span>Download for Android</span>
                </Link>
              </div>

              {/* Sign up microtext */}
              <p className="text-xs text-gray-500 pt-1">
                Sign up with your phone number. No email or password required.
              </p>

              {/* Trust Badges Row */}
              <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-gray-600">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#00D084]" />
                  <span>Private by design</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#00D084]" />
                  <span>One number, zero passwords</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe2 className="w-4 h-4 text-[#00D084]" />
                  <span>Live translation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#00D084]">💚</span>
                  <span>Free for real life</span>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Realistic Phone Device + Floating Cards */}
            <div className="lg:col-span-6 relative flex justify-center items-center py-6">
              
              <div className="relative w-full max-w-[520px]">

                {/* Floating ambient star sparkles in background */}
                <div className="absolute top-2 -right-6 text-purple-300 text-lg font-bold animate-pulse pointer-events-none">✦</div>
                <div className="absolute bottom-16 -left-10 text-emerald-300 text-base font-bold animate-pulse pointer-events-none">✦</div>
                
                {/* -------------------------------------------------- */}
                {/* 1. CENTRAL SMARTPHONE FRAME                        */}
                {/* -------------------------------------------------- */}
                <div className="relative mx-auto w-[270px] sm:w-[290px] h-[550px] sm:h-[580px] bg-[#0F172A] rounded-[42px] p-2.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border-4 border-[#1E293B]">
                  
                  {/* Smartphone Screen Canvas */}
                  <div className="w-full h-full bg-[#FAF9F6] rounded-[34px] overflow-hidden flex flex-col justify-between relative border border-black/10">
                    
                    {/* Top Status Bar & Punch-hole Camera */}
                    <div className="pt-2 px-5 pb-1 flex items-center justify-between text-[10px] font-semibold text-gray-700 bg-white">
                      <span>10:20</span>
                      <div className="w-3.5 h-3.5 rounded-full bg-black -mt-0.5 mx-auto" />
                      <div className="flex items-center gap-1">
                        <span className="text-[9px]">5G</span>
                        <div className="w-3.5 h-2 rounded-xs border border-gray-700 flex items-center p-0.5">
                          <div className="w-full h-full bg-gray-700" />
                        </div>
                      </div>
                    </div>

                    {/* App Header */}
                    <div className="px-4 py-2 bg-white flex items-center justify-between border-b border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-bold tracking-tight text-[#0F172A]">chatr</span>
                        <div className="w-4 h-4 rounded-md bg-[#00D084] flex items-center justify-center text-white">
                          <MessageSquare className="w-2.5 h-2.5 fill-current" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Search className="w-3.5 h-3.5" />
                        <div className="w-5 h-5 rounded-full bg-[#093E32] text-white flex items-center justify-center">
                          <Plus className="w-3 h-3 stroke-[3]" />
                        </div>
                      </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="px-3 py-1.5 bg-white flex items-center gap-1.5 text-[11px] font-medium border-b border-gray-100">
                      <span className="px-3 py-0.5 rounded-full bg-[#093E32] text-white font-semibold">All</span>
                      <span className="px-2.5 py-0.5 text-gray-500 hover:text-gray-900">Chats</span>
                      <span className="px-2.5 py-0.5 text-gray-500 hover:text-gray-900">Calls</span>
                      <span className="px-2.5 py-0.5 text-gray-500 hover:text-gray-900">Health</span>
                    </div>

                    {/* Chat Conversations List with Genuine Smiling Avatars */}
                    <div className="flex-1 overflow-y-auto px-2.5 py-1.5 space-y-1.5 bg-[#F9FAF9]">
                      
                      {/* Aisha */}
                      <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white shadow-2xs border border-gray-100/60">
                        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-emerald-300">
                          <img
                            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
                            alt="Aisha"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-900 truncate">Aisha</span>
                            <span className="text-[9px] text-gray-400">10:24</span>
                          </div>
                          <p className="text-[10px] text-gray-600 truncate">Hey! Are we still meeting...</p>
                        </div>
                        <span className="w-4 h-4 rounded-full bg-[#00D084] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                          2
                        </span>
                      </div>

                      {/* Family */}
                      <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white shadow-2xs border border-gray-100/60">
                        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-rose-200">
                          <img
                            src="https://images.unsplash.com/photo-1609220136736-443140cffec6?w=120&auto=format&fit=crop&q=80"
                            alt="Family"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-900 truncate">Family</span>
                            <span className="text-[9px] text-gray-400">09:41</span>
                          </div>
                          <p className="text-[10px] text-gray-600 truncate">Mom: Dinner at 8? 🍲</p>
                        </div>
                        <span className="w-4 h-4 rounded-full bg-[#00D084] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                          4
                        </span>
                      </div>

                      {/* Design Team */}
                      <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white shadow-2xs border border-gray-100/60">
                        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-blue-200">
                          <img
                            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=120&auto=format&fit=crop&q=80"
                            alt="Design Team"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-900 truncate">Design Team</span>
                            <span className="text-[9px] text-gray-400">09:02</span>
                          </div>
                          <p className="text-[10px] text-gray-500 truncate">File: Product ideas.pdf</p>
                        </div>
                      </div>

                      {/* Rahul */}
                      <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white shadow-2xs border border-gray-100/60">
                        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-amber-200">
                          <img
                            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
                            alt="Rahul"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-900 truncate">Rahul</span>
                            <span className="text-[9px] text-gray-400">Yesterday</span>
                          </div>
                          <p className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                            <PhoneCall className="w-2.5 h-2.5 text-emerald-600 inline" /> Voice call · 2 min
                          </p>
                        </div>
                      </div>

                      {/* Weekend Plans */}
                      <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white shadow-2xs border border-gray-100/60">
                        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-purple-200">
                          <img
                            src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=120&auto=format&fit=crop&q=80"
                            alt="Weekend Plans"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-900 truncate">Weekend Plans</span>
                            <span className="text-[9px] text-gray-400">Yesterday</span>
                          </div>
                          <p className="text-[10px] text-gray-500 truncate">You: That sounds great!</p>
                        </div>
                      </div>

                      {/* ChatrShield Protection Item */}
                      <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-50/70 shadow-2xs border border-emerald-200/60">
                        <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-900 truncate">ChatrShield</span>
                            <span className="text-[9px] text-emerald-700 font-bold">90 Score</span>
                          </div>
                          <p className="text-[10px] text-emerald-800 font-medium truncate">🛡️ Identity Protected</p>
                        </div>
                      </div>

                    </div>

                    {/* Bottom Navigation with Elevated Center SI Button */}
                    <div className="bg-white border-t border-gray-100 px-3 py-2 flex items-center justify-around text-gray-400 relative">
                      <div className="flex flex-col items-center gap-0.5 text-[#093E32]">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="text-[8px] font-bold">Chats</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <Phone className="w-3.5 h-3.5" />
                        <span className="text-[8px]">Calls</span>
                      </div>
                      
                      {/* Elevated SI Circle */}
                      <div className="-mt-5 flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-[#00D084] text-white flex items-center justify-center shadow-lg font-bold text-[11px] ring-4 ring-white">
                          SI
                        </div>
                        <span className="text-[7px] text-[#093E32] font-semibold mt-0.5">SI</span>
                      </div>

                      <div className="flex flex-col items-center gap-0.5">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-[8px]">Communities</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-[8px] text-rose-600">Health</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* -------------------------------------------------- */}
                {/* 2. FLOATING CARD: CHAT DIALOGUE (Top-Left)         */}
                {/* -------------------------------------------------- */}
                <div className="absolute -top-3 -left-4 sm:-left-12 z-20 max-w-[210px] sm:max-w-[230px] space-y-1.5 animate-in fade-in slide-in-from-left duration-300">
                  {/* Aisha's message */}
                  <div className="flex items-end gap-1.5">
                    <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-emerald-300">
                      <img
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                        alt="Aisha"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="bg-white rounded-2xl rounded-bl-xs p-2.5 shadow-lg border border-gray-100 text-[11px] text-gray-800">
                      <p className="font-medium">Hey! Are we still meeting tomorrow?</p>
                      <span className="text-[9px] text-gray-400 block text-right mt-0.5">10:24</span>
                    </div>
                  </div>

                  {/* User's reply */}
                  <div className="flex justify-end">
                    <div className="bg-[#DCFCE7] rounded-2xl rounded-br-xs p-2.5 shadow-md border border-[#86EFAC]/40 text-[11px] text-[#064E3B] max-w-[190px]">
                      <p className="font-medium">Yes! 7 PM works for me. See you there! 😊</p>
                      <div className="flex items-center justify-end gap-1 text-[9px] text-[#064E3B]/70 mt-0.5">
                        <span>10:25</span>
                        <span>✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* -------------------------------------------------- */}
                {/* 3. FLOATING CARD: SI SUGGESTED REPLY (Bottom-Left) */}
                {/* -------------------------------------------------- */}
                <div className="absolute -bottom-6 -left-4 sm:-left-12 z-20 w-[220px] sm:w-[240px] bg-white rounded-2xl p-3 shadow-xl border border-gray-100 space-y-2 animate-in fade-in slide-in-from-bottom duration-300">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0D6246]">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
                    <span>SI Suggested reply</span>
                  </div>
                  <p className="text-[11px] text-gray-800 font-medium bg-gray-50 p-2 rounded-xl border border-gray-100">
                    Yes! 7 PM works for me. See you there! 😊
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button className="px-2.5 py-1 rounded-full bg-[#093E32] text-white font-semibold shadow-xs">
                      Use
                    </button>
                    <button className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200">
                      Change tone
                    </button>
                    <button className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200">
                      Translate
                    </button>
                  </div>
                </div>

                {/* -------------------------------------------------- */}
                {/* 4. FLOATING CARD: AISHA INCOMING CALL (Top-Right)  */}
                {/* -------------------------------------------------- */}
                <div className="absolute top-8 -right-4 sm:-right-10 z-20 w-[190px] sm:w-[210px] bg-[#111827]/95 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl border border-white/10 text-white text-center space-y-2 animate-in fade-in slide-in-from-right duration-300">
                  <div className="relative w-12 h-12 mx-auto rounded-full overflow-hidden border-2 border-emerald-400">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                      alt="Aisha"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Aisha is calling...</h4>
                    <p className="text-[10px] text-emerald-400 font-medium">Translate in real time</p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-1">
                    <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-sm">
                      <Phone className="w-3.5 h-3.5 fill-current transform rotate-[135deg]" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm animate-bounce">
                      <Phone className="w-3.5 h-3.5 fill-current" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Ambient soundwave animation ripple beside call card */}
                <div className="absolute top-16 -right-14 sm:-right-20 hidden sm:flex items-center gap-1 opacity-70">
                  <span className="w-1 h-3 bg-purple-300 rounded-full animate-pulse" />
                  <span className="w-1 h-6 bg-purple-400 rounded-full animate-pulse [animation-delay:150ms]" />
                  <span className="w-1 h-9 bg-purple-500 rounded-full animate-pulse [animation-delay:300ms]" />
                  <span className="w-1 h-7 bg-purple-400 rounded-full animate-pulse [animation-delay:450ms]" />
                  <span className="w-1 h-4 bg-purple-300 rounded-full animate-pulse [animation-delay:200ms]" />
                </div>

                {/* -------------------------------------------------- */}
                {/* 5. FLOATING CARD: SI ANSWER TOGGLE (Bottom-Right)  */}
                {/* -------------------------------------------------- */}
                <div className="absolute bottom-10 -right-4 sm:-right-8 z-20 w-[200px] sm:w-[220px] bg-white rounded-2xl p-3 shadow-xl border border-gray-100 space-y-1.5 animate-in fade-in slide-in-from-bottom duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                      <span className="text-purple-600">🔮</span>
                      <span>SI Answer</span>
                    </div>
                    <button
                      onClick={() => setSiAnswerEnabled(!siAnswerEnabled)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                        siAnswerEnabled ? 'bg-[#00D084]' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          siAnswerEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-600 leading-snug">
                    Can't answer right now? Let SI take the call and give you a summary.
                  </p>
                </div>

              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. EVERYTHING YOU NEED: ONE APP FOR HOW YOU COMMUNICATE    */}
      {/* ========================================================= */}
      <section className="py-16 sm:py-24 bg-[#FAFBFB] border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Centered Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
              EVERYTHING YOU NEED
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#093E32]">
              One app for how you communicate.
            </h2>
          </div>

          {/* 5 Feature Cards with Visual Realistic Mockups */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            
            {/* 1. MESSAGING (Warm Smiling Friends & Photos) */}
            <div className="rounded-3xl bg-white border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-[#00D084] text-white flex items-center justify-center mb-4 shadow-xs">
                  <MessageSquare className="w-5 h-5 fill-current" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Messaging</h3>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  Text, photos, videos, documents and more.
                </p>
              </div>

              {/* Inside Mockup Preview: Smiling Friends Photos & Voice Note */}
              <div className="mt-6 bg-[#F9FAF9] rounded-2xl p-3 border border-gray-100 space-y-2.5">
                <div className="bg-white p-2 rounded-xl border border-gray-100 text-[11px] text-gray-800 shadow-2xs">
                  <span>Sounds good! 👍</span>
                  <span className="text-[9px] text-gray-400 block text-right mt-0.5">10:24</span>
                </div>
                
                {/* Smiling Friends & Family Photos preview */}
                <div className="grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden">
                  <div className="h-16 bg-gray-200 overflow-hidden rounded-lg">
                    <img
                      src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=300&auto=format&fit=crop&q=80"
                      alt="Friends Smiling"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="h-16 bg-gray-200 overflow-hidden rounded-lg">
                    <img
                      src="https://images.unsplash.com/photo-1511895426328-dc8714191300?w=300&auto=format&fit=crop&q=80"
                      alt="Family Celebration"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Voice note waveform */}
                <div className="bg-white p-2 rounded-xl border border-gray-100 flex items-center gap-2 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-[#00D084] text-white flex items-center justify-center shrink-0">
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  </div>
                  <div className="flex-1 flex items-center gap-0.5 h-3">
                    <span className="w-1 h-2 bg-emerald-500 rounded-full" />
                    <span className="w-1 h-3 bg-emerald-600 rounded-full" />
                    <span className="w-1 h-1.5 bg-emerald-400 rounded-full" />
                    <span className="w-1 h-3.5 bg-emerald-700 rounded-full" />
                    <span className="w-1 h-2 bg-emerald-500 rounded-full" />
                    <span className="w-1 h-2.5 bg-emerald-600 rounded-full" />
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span className="w-1 h-2 bg-gray-300 rounded-full" />
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                  </div>
                  <span className="text-[9px] text-gray-500 font-mono">0:15</span>
                </div>
              </div>
            </div>

            {/* 2. VOICE & VIDEO CALLS (High-Definition Crisp Video Call) */}
            <div className="rounded-3xl bg-white border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center mb-4 shadow-xs">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Voice &amp; Video Calls</h3>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  Clear, reliable calls anywhere in the world.
                </p>
              </div>

              {/* Inside Mockup Preview: Full-bleed Crisp Video Call Screen */}
              <div className="mt-6 bg-[#0F172A] rounded-2xl overflow-hidden relative border border-gray-200 shadow-md">
                <div className="h-40 relative">
                  {/* High Quality Smiling Video Caller */}
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80"
                    alt="Smiling Caller"
                    className="w-full h-full object-cover"
                  />
                  {/* Top Bar with HD Badge & Encryption */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-[8px] text-white font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>HD 1080p</span>
                  </div>

                  {/* Picture-in-picture user (Smiling Man) */}
                  <div className="absolute top-2 right-2 w-10 h-12 rounded-lg border border-white/70 overflow-hidden shadow-lg">
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
                      alt="You"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Floating call action buttons with glass backdrop */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2 py-1 rounded-xl bg-black/40 backdrop-blur-md">
                    <div className="flex items-center gap-1 text-[8px] text-white/80 font-mono">
                      <span>12:48</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center">
                        <Mic className="w-2.5 h-2.5" />
                      </div>
                      <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
                        <Phone className="w-3.5 h-3.5 fill-current transform rotate-[135deg]" />
                      </div>
                      <div className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center">
                        <Plus className="w-2.5 h-2.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. SI — YOUR ASSISTANT */}
            <div className="rounded-3xl bg-white border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-[#00D084] text-white flex items-center justify-center mb-4 shadow-xs">
                  <Sparkles className="w-5 h-5 fill-current" />
                </div>
                <h3 className="text-base font-bold text-gray-900">SI — Your Assistant</h3>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  Summarise, reply, translate and help with conversations.
                </p>
              </div>

              {/* Inside Mockup Preview: 4 SI Actions */}
              <div className="mt-6 bg-[#F9FAF9] rounded-2xl p-2.5 border border-gray-100 space-y-1.5 text-[11px]">
                <div className="p-2 rounded-xl bg-white border border-gray-100 flex items-center justify-between text-gray-800 hover:border-emerald-300 transition-colors shadow-2xs">
                  <span className="flex items-center gap-1.5 truncate">
                    <span>📄</span> Summarise this chat
                  </span>
                  <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
                </div>

                <div className="p-2 rounded-xl bg-white border border-gray-100 flex items-center justify-between text-gray-800 hover:border-emerald-300 transition-colors shadow-2xs">
                  <span className="flex items-center gap-1.5 truncate">
                    <span>✏️</span> Draft a reply
                  </span>
                  <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
                </div>

                <div className="p-2 rounded-xl bg-white border border-gray-100 flex items-center justify-between text-gray-800 hover:border-emerald-300 transition-colors shadow-2xs">
                  <span className="flex items-center gap-1.5 truncate">
                    <span>🌐</span> Translate to Hindi
                  </span>
                  <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
                </div>

                <div className="p-2 rounded-xl bg-white border border-gray-100 flex items-center justify-between text-gray-800 hover:border-emerald-300 transition-colors shadow-2xs">
                  <span className="flex items-center gap-1.5 truncate">
                    <span>🔍</span> Find information
                  </span>
                  <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
                </div>
              </div>
            </div>

            {/* 4. COMMUNITIES (Smiling Enthusiasts & Outdoor Groups) */}
            <div className="rounded-3xl bg-white border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center mb-4 shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Communities</h3>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  Find and join communities around what you care about.
                </p>
              </div>

              {/* Inside Mockup Preview: Images of Smiling Groups */}
              <div className="mt-6 bg-[#F9FAF9] rounded-2xl p-2.5 border border-gray-100 space-y-2">
                <div className="grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden">
                  <div className="h-16 bg-gray-200 rounded-lg overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=300&auto=format&fit=crop&q=80"
                      alt="Friends Community"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="h-16 bg-gray-200 rounded-lg overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&auto=format&fit=crop&q=80"
                      alt="Tech Creators Community"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-gray-100 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                      🏃
                    </div>
                    <span className="text-[10px] font-bold text-gray-900">Runners Club</span>
                  </div>
                  <button className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-[#00D084] hover:text-white transition-colors text-[9px] font-bold text-gray-700">
                    + Join
                  </button>
                </div>
              </div>
            </div>

            {/* 5. DISCOVER */}
            <div className="rounded-3xl bg-white border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center mb-4 shadow-xs">
                  <Search className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Discover</h3>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  Explore people, jobs, services and businesses.
                </p>
              </div>

              {/* Inside Mockup Preview: Jobs, Services, Businesses */}
              <div className="mt-6 bg-[#F9FAF9] rounded-2xl p-2.5 border border-gray-100 space-y-1.5 text-[11px]">
                <Link
                  to="/jobs"
                  className="p-2 rounded-xl bg-white border border-gray-100 flex items-center justify-between text-gray-800 hover:border-rose-300 transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Briefcase className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-[10px]">Jobs</div>
                      <div className="text-[8px] text-gray-400">Find your next opportunity</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
                </Link>

                <Link
                  to="/discover"
                  className="p-2 rounded-xl bg-white border border-gray-100 flex items-center justify-between text-gray-800 hover:border-amber-300 transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Wrench className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-[10px]">Services</div>
                      <div className="text-[8px] text-gray-400">Trusted services near you</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
                </Link>

                <Link
                  to="/business"
                  className="p-2 rounded-xl bg-white border border-gray-100 flex items-center justify-between text-gray-800 hover:border-blue-300 transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Store className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-[10px]">Businesses</div>
                      <div className="text-[8px] text-gray-400">Discover local businesses</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
                </Link>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. NEW: BEYOND MESSAGING — HEALTH, FITNESS & CHATRSHIELD   */}
      {/*    (Directly matching the 3 user-attached mobile screens) */}
      {/* ========================================================= */}
      <section className="py-16 sm:py-24 bg-white border-t border-gray-100 relative overflow-hidden">
        
        {/* Soft Ambient Radial Accents */}
        <div className="absolute top-1/2 left-10 w-96 h-96 bg-rose-50/40 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-10 w-96 h-96 bg-emerald-50/50 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#093E32] text-xs font-bold uppercase tracking-wider border border-emerald-200/50">
              <Sparkles className="w-3.5 h-3.5 text-[#00D084]" />
              <span>BEYOND MESSAGING · SUPER APP INTELLIGENCE</span>
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0F172A]">
              Protect your identity. Track vitals.<br className="hidden sm:block" />
              <span className="text-[#094D3B]">Power your daily life.</span>
            </h2>
            <p className="mt-3 text-base text-gray-600">
              Chatr integrates medical-grade wellness, metabolic biometrics, and phone number fraud defense directly into your daily conversations.
            </p>
          </div>

          {/* 3 Hero Cards Styled with Index Page Theme */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* ---------------------------------------------------- */}
            {/* SCREEN 1: CHATR HEALTH (Matching media_1790928726510) */}
            {/* ---------------------------------------------------- */}
            <div className="rounded-3xl border border-gray-200 bg-[#FAFBFB] p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-200/70">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-2xs">
                      <HeartPulse className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Chatr Health</h3>
                      <p className="text-[11px] text-gray-500">Live Vitals &amp; Sleep Intelligence</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200/60">
                    ● Active
                  </span>
                </div>

                {/* Sub-nav tabs from user screen */}
                <div className="flex items-center gap-1 py-3 text-[11px] font-medium overflow-x-auto">
                  {(['today', 'vitals', 'sleep', 'activity', 'trends'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setHealthTab(tab)}
                      className={`px-3 py-1 rounded-full capitalize transition-colors ${
                        healthTab === tab
                          ? 'bg-[#0F172A] text-white font-bold'
                          : 'bg-white text-gray-600 border border-gray-200/60 hover:bg-gray-100'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Realistic Dark/Emerald Inner Device Display */}
                <div className="rounded-2xl bg-[#0F172A] p-4 text-white shadow-inner space-y-4">
                  
                  {/* Circular Overall Health Gauge (92 Score) */}
                  <div className="flex flex-col items-center justify-center py-2 relative">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="#1E293B" strokeWidth="8" fill="transparent" />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#00D084"
                          strokeWidth="8"
                          strokeDasharray="251.2"
                          strokeDashoffset="20"
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-3xl font-extrabold text-white tracking-tight">92</span>
                        <span className="text-[9px] text-gray-400 font-medium">Overall Health</span>
                        <span className="text-[8px] text-emerald-400 font-bold mt-0.5">● Optimal</span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Health Tiles (2x2 Grid) */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    
                    {/* Heart Rate */}
                    <div className="p-2.5 rounded-xl bg-[#1E293B]/80 border border-white/5 space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-400 text-[10px]">
                        <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                        <span>Heart Rate</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold text-white">62</span>
                        <span className="text-[9px] text-gray-400">bpm</span>
                      </div>
                      <div className="text-[9px] text-emerald-400 font-semibold">Normal</div>
                      {/* Pink ECG Pulse Wave */}
                      <svg className="w-full h-4 stroke-rose-400 fill-none" viewBox="0 0 100 20">
                        <path d="M0,10 L30,10 L35,16 L40,2 L45,18 L50,10 L100,10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>

                    {/* HRV */}
                    <div className="p-2.5 rounded-xl bg-[#1E293B]/80 border border-white/5 space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-400 text-[10px]">
                        <Activity className="w-3 h-3 text-cyan-400" />
                        <span>HRV</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold text-white">48</span>
                        <span className="text-[9px] text-gray-400">ms</span>
                      </div>
                      <div className="text-[9px] text-cyan-400 font-semibold">Good</div>
                      {/* Cyan HRV Wave */}
                      <svg className="w-full h-4 stroke-cyan-400 fill-none" viewBox="0 0 100 20">
                        <path d="M0,10 C20,15 30,5 50,12 C70,18 80,4 100,10" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>

                    {/* Sleep */}
                    <div className="p-2.5 rounded-xl bg-[#1E293B]/80 border border-white/5 space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-400 text-[10px]">
                        <Moon className="w-3 h-3 text-indigo-400" />
                        <span>Sleep</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold text-white">7h 24m</span>
                      </div>
                      <div className="text-[9px] text-indigo-400 font-semibold">Good</div>
                      {/* Sleep stages visualizer */}
                      <div className="flex items-center gap-1 h-2 pt-1">
                        <span className="flex-1 h-1.5 bg-indigo-900 rounded-xs" />
                        <span className="flex-1 h-2.5 bg-indigo-700 rounded-xs" />
                        <span className="flex-1 h-3.5 bg-indigo-500 rounded-xs" />
                        <span className="flex-1 h-2.5 bg-indigo-600 rounded-xs" />
                        <span className="flex-1 h-1.5 bg-indigo-800 rounded-xs" />
                      </div>
                    </div>

                    {/* Stress */}
                    <div className="p-2.5 rounded-xl bg-[#1E293B]/80 border border-white/5 space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-400 text-[10px]">
                        <Zap className="w-3 h-3 text-emerald-400" />
                        <span>Stress</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold text-white">Low</span>
                      </div>
                      <div className="text-[9px] text-emerald-400 font-semibold">Good</div>
                      {/* Stress bar levels */}
                      <div className="flex items-center gap-1 h-2 pt-1">
                        <span className="flex-1 h-2 bg-emerald-400 rounded-xs" />
                        <span className="flex-1 h-2 bg-emerald-500 rounded-xs" />
                        <span className="flex-1 h-2 bg-emerald-600 rounded-xs" />
                        <span className="flex-1 h-2 bg-gray-700 rounded-xs" />
                        <span className="flex-1 h-2 bg-gray-800 rounded-xs" />
                      </div>
                    </div>

                  </div>

                  {/* AI Health Insight Banner */}
                  <Link
                    to="/health"
                    className="block p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-white">
                          Your sleep has improved by 12% this week.
                        </p>
                        <p className="text-[9px] text-gray-400">You're on a positive trend. →</p>
                      </div>
                    </div>
                  </Link>

                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between text-xs">
                <span className="text-gray-500">Live Apple Health / Wearable Sync</span>
                <Link to="/health" className="font-bold text-[#093E32] hover:underline flex items-center gap-1">
                  Open Health <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>

            {/* ---------------------------------------------------- */}
            {/* SCREEN 2: BIOMETRICS & NUTRITION (media_1790928748122)*/}
            {/* ---------------------------------------------------- */}
            <div className="rounded-3xl border border-gray-200 bg-[#FAFBFB] p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-200/70">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center shadow-2xs">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Biometrics &amp; Fitness</h3>
                      <p className="text-[11px] text-gray-500">Target Calories &amp; Macronutrients</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 text-[10px] font-bold border border-cyan-200/60">
                    AI Targets
                  </span>
                </div>

                {/* Top 3 High-Impact Metrics */}
                <div className="my-3 p-3.5 rounded-2xl bg-[#092B27] text-white flex items-center justify-around text-center shadow-xs">
                  <div>
                    <span className="text-[10px] text-gray-300 block">BMI</span>
                    <span className="text-xl font-extrabold text-white">27.5</span>
                    <span className="text-[9px] text-emerald-400 block font-semibold">Overweight</span>
                  </div>
                  <div className="w-px h-8 bg-white/20" />
                  <div>
                    <span className="text-[10px] text-gray-300 block">Daily kcal</span>
                    <span className="text-xl font-extrabold text-cyan-300">1655</span>
                    <span className="text-[9px] text-gray-300 block">target</span>
                  </div>
                  <div className="w-px h-8 bg-white/20" />
                  <div>
                    <span className="text-[10px] text-gray-300 block">Protein</span>
                    <span className="text-xl font-extrabold text-emerald-300">111g</span>
                    <span className="text-[9px] text-gray-300 block">per day</span>
                  </div>
                </div>

                {/* Interactive Biometrics Adjusters (Age, Weight, Height, Meals) */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                    🔬 Biometrics
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    
                    {/* Age */}
                    <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-gray-400 font-bold block uppercase">Age</span>
                        <span className="text-base font-extrabold text-gray-900">{bioAge} <span className="text-[10px] font-normal text-gray-500">yrs</span></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setBioAge(Math.max(18, bioAge - 1))}
                          className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setBioAge(bioAge + 1)}
                          className="w-6 h-6 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Weight */}
                    <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-gray-400 font-bold block uppercase">Weight</span>
                        <span className="text-base font-extrabold text-gray-900">{bioWeight} <span className="text-[10px] font-normal text-gray-500">kg</span></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setBioWeight(Math.max(40, bioWeight - 1))}
                          className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setBioWeight(bioWeight + 1)}
                          className="w-6 h-6 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Height */}
                    <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-gray-400 font-bold block uppercase">Height</span>
                        <span className="text-base font-extrabold text-gray-900">{bioHeight} <span className="text-[10px] font-normal text-gray-500">cm</span></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setBioHeight(Math.max(120, bioHeight - 1))}
                          className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setBioHeight(bioHeight + 1)}
                          className="w-6 h-6 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Meals / Day */}
                    <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-gray-400 font-bold block uppercase">Meals/Day</span>
                        <span className="text-base font-extrabold text-gray-900">{bioMeals} <span className="text-[10px] font-normal text-gray-500">meals</span></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setBioMeals(Math.max(1, bioMeals - 1))}
                          className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setBioMeals(bioMeals + 1)}
                          className="w-6 h-6 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Biological Sex and Goal Selectors */}
                  <div className="pt-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-semibold">🧬 Biological Sex</span>
                      <div className="flex gap-1 text-[10px]">
                        {(['Male', 'Female', 'Other'] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => setBioSex(s)}
                            className={`px-2 py-0.5 rounded-md ${
                              bioSex === s
                                ? 'bg-[#093E32] text-white font-bold'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-semibold">🎯 Target Goal</span>
                      <div className="flex gap-1 text-[10px]">
                        <button
                          onClick={() => setBioGoal('lose')}
                          className={`px-2 py-0.5 rounded-md ${
                            bioGoal === 'lose'
                              ? 'bg-orange-600 text-white font-bold'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          🔥 Cut
                        </button>
                        <button
                          onClick={() => setBioGoal('maintain')}
                          className={`px-2 py-0.5 rounded-md ${
                            bioGoal === 'maintain'
                              ? 'bg-cyan-700 text-white font-bold'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          ⚖️ Maintain
                        </button>
                        <button
                          onClick={() => setBioGoal('gain')}
                          className={`px-2 py-0.5 rounded-md ${
                            bioGoal === 'gain'
                              ? 'bg-emerald-700 text-white font-bold'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          💪 Bulk
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between text-xs">
                <span className="text-gray-500">Personalized Metabolic Profile</span>
                <Link to="/health-risks" className="font-bold text-[#093E32] hover:underline flex items-center gap-1">
                  Adjust Goals <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>

            {/* ---------------------------------------------------- */}
            {/* SCREEN 3: CHATRSHIELD PRO (media_1790928799649)      */}
            {/* ---------------------------------------------------- */}
            <div className="rounded-3xl border border-gray-200 bg-[#FAFBFB] p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-200/70">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-2xs">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">ChatrShield <span className="text-[10px] px-1.5 py-0.2 bg-purple-600 text-white rounded font-extrabold">PRO</span></h3>
                      <p className="text-[11px] text-gray-500">Identity &amp; Fraud Defense</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200/60">
                    Shield Active
                  </span>
                </div>

                {/* Dark Screen Preview from User Screenshot */}
                <div className="mt-3 rounded-2xl bg-[#0F172A] p-4 text-white shadow-inner space-y-3.5">
                  
                  {/* Shield Score Ring (90 Score) */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="#1E293B" strokeWidth="8" fill="transparent" />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#00D084"
                          strokeWidth="8"
                          strokeDasharray="251.2"
                          strokeDashoffset="25"
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-3xl font-extrabold text-white">90</span>
                        <span className="text-[8px] text-gray-400 uppercase font-semibold">SHIELD SCORE</span>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>FULLY PROTECTED</span>
                    </div>
                    <span className="text-[9px] text-gray-400">Last scanned · just now</span>
                  </div>

                  {/* 3 Protection Counters Row */}
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="p-2 rounded-xl bg-[#1E293B]">
                      <span className="text-xs font-extrabold text-purple-400 block">Active</span>
                      <span className="text-[8px] text-gray-400 font-bold">DB RECORDS</span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#1E293B]">
                      <span className="text-xs font-extrabold text-white block">0</span>
                      <span className="text-[8px] text-gray-400 font-bold">BLOCKED</span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#1E293B]">
                      <span className="text-xs font-extrabold text-emerald-400 block">99%</span>
                      <span className="text-[8px] text-gray-400 font-bold">ACCURACY</span>
                    </div>
                  </div>

                  {/* Profile Views Feature Card */}
                  <div className="p-3 rounded-xl bg-white text-gray-900 space-y-2 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                        <Eye className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-gray-900">Profile Views</div>
                        <div className="text-[9px] text-gray-500">Auto-alerts when someone searches your number</div>
                      </div>
                    </div>
                    
                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-gray-700">
                        <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                        <span>No profile views recorded</span>
                      </div>
                      <p className="text-[8px] text-gray-400 mt-0.5">
                        Your shield is actively scanning incoming searches in real-time.
                      </p>
                    </div>

                    {/* Auto Profile View Alerts Toggle */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-purple-600" />
                        <span className="text-[10px] font-bold text-gray-800">Auto Profile Alerts</span>
                        <span className="px-1 py-0.2 bg-purple-100 text-purple-700 text-[8px] font-extrabold rounded">NEW</span>
                      </div>
                      <button
                        onClick={() => setAutoProfileAlerts(!autoProfileAlerts)}
                        className={`w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer ${
                          autoProfileAlerts ? 'bg-purple-600' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                            autoProfileAlerts ? 'translate-x-3.5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Dark Web Monitor Banner */}
                  <div className="p-2.5 rounded-xl bg-[#1E293B] border border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-purple-400" />
                      <div>
                        <div className="text-[10px] font-bold text-white">Dark Web Monitor</div>
                        <div className="text-[8px] text-gray-400">Scanning 900M+ breach records for your identity</div>
                      </div>
                    </div>
                    <span className="text-[9px] text-emerald-400 font-bold">Secure</span>
                  </div>

                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between text-xs">
                <span className="text-gray-500">Real-Time Number Fraud Shield</span>
                <Link to="/auth" className="font-bold text-[#093E32] hover:underline flex items-center gap-1">
                  Activate Shield <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. REALTIME LIVE CALLING SHOWCASE (PROMINENT ON LEFT SIDE) */}
      {/* ========================================================= */}
      <section className="py-16 sm:py-24 bg-[#FAFBFB] border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-[#FAFBFB] via-white to-[#E0F2E9]/20 p-8 sm:p-12 shadow-sm overflow-hidden relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              
              {/* LEFT: Crisp Split Video Call Display (LIVE ON LEFT) */}
              <div className="lg:col-span-7 order-2 lg:order-1">
                <div className="rounded-3xl bg-[#0F172A] p-3 shadow-2xl border-4 border-gray-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    
                    {/* Participant 1: Smiling Multi-Gen Family Celebrating */}
                    <div className="relative h-60 sm:h-72 rounded-2xl overflow-hidden bg-gray-900 border border-white/10">
                      <img
                        src="https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&auto=format&fit=crop&q=80"
                        alt="Smiling Family Celebrating"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] text-white font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>The Sharma Family · New Delhi</span>
                      </div>
                      {/* Live Captions overlay */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 p-2.5 rounded-xl bg-black/75 backdrop-blur-md text-white text-[11px] leading-snug">
                        <p className="text-gray-300 text-[9px] uppercase font-bold tracking-wider">Original · Hindi</p>
                        <p className="font-medium">"जन्मदिन मुबारक हो बेटा! हम सब तुम्हें बहुत याद कर रहे हैं!"</p>
                      </div>
                    </div>

                    {/* Participant 2: Smiling Daughter Calling from University */}
                    <div className="relative h-60 sm:h-72 rounded-2xl overflow-hidden bg-gray-900 border border-white/10">
                      <img
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80"
                        alt="Smiling Daughter on Live Call"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] text-white font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Ananya · New York</span>
                      </div>
                      {/* Translated overlay */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 p-2.5 rounded-xl bg-emerald-950/85 border border-emerald-500/40 backdrop-blur-md text-emerald-200 text-[11px] leading-snug">
                        <p className="text-emerald-400 text-[9px] uppercase font-bold tracking-wider flex items-center gap-1">
                          <Languages className="w-2.5 h-2.5" /> Realtime English Translation
                        </p>
                        <p className="font-semibold text-white">"Happy Birthday Mom! Thank you so much, love you all!"</p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* RIGHT: Narrative */}
              <div className="lg:col-span-5 order-1 lg:order-2 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E0F2E9] text-[#093E32] text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>LIVE CALLING EXPERIENCE</span>
                </div>
                <h3 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] leading-tight">
                  Call when language isn't a barrier.
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Talk to people who speak another language with live translation during supported calls. Speak naturally while Chatr helps bridge the language gap with translated audio and captions.
                </p>
                <div className="pt-2 flex flex-wrap gap-3 text-xs font-medium text-gray-700">
                  <span className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 shadow-2xs flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-[#00D084]" /> Real-time Audio
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 shadow-2xs flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-[#00D084]" /> Live Subtitles
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 shadow-2xs flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-[#00D084]" /> 1080p Crystal Audio
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* SI Answer & Personal Intelligence row */}
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            
            {/* SI Answer Card */}
            <div className="rounded-3xl border border-gray-200 bg-white p-8 sm:p-10 flex flex-col justify-between shadow-xs">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-5">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-[#0F172A]">
                  SI Answer
                </h3>
                <p className="mt-2 text-sm font-semibold text-gray-900">
                  Can't answer the phone?
                </p>
                <p className="mt-2 text-sm text-[#475569] leading-relaxed">
                  When enabled, Chatr SI can answer on your behalf, talk to the caller and give you a summary afterwards.
                </p>
                <p className="mt-3 text-xs font-bold text-[#093E32]">
                  You decide when this feature is active.
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Automated voicemail summaries</span>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">Guarded</span>
              </div>
            </div>

            {/* SI Capabilities Spotlight */}
            <div className="rounded-3xl border border-[#00D084]/40 bg-[#E0F2E9]/40 p-8 sm:p-10 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#093E32] text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[#0F172A]">
                      SI — your personal intelligence
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Chatr's SI can help while you communicate.
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-[#093E32]">
                  Ask it to:
                </p>

                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {[
                    'Summarise long conversations',
                    'Draft replies',
                    'Translate messages',
                    'Understand what someone is asking',
                    'Help you find information',
                    'Answer routine conversations when you choose',
                    'Help after a missed call',
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-[#093E32]/10 text-xs font-medium text-gray-900 shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00D084] shrink-0" />
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-6 text-sm font-extrabold text-[#093E32]">
                You stay in control.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. CHATR+ & INTERACTIVE WELCOME PHONE ONBOARDING STRIP    */}
      {/* ========================================================= */}
      <section className="relative overflow-hidden py-16 sm:py-20 bg-gradient-to-b from-[#FAFBFB] via-purple-50/25 to-white border-t border-gray-100">
        
        {/* Ambient Pastel Gradient Blobs */}
        <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -right-20 top-1/2 -translate-y-1/2 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-emerald-100/30 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* 1. Left Side: Brand and Tagline */}
            <div className="lg:col-span-3 text-center lg:text-left space-y-2">
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <span className="text-2xl font-bold tracking-tight text-[#0F172A]">chatr</span>
                <div className="w-5 h-5 rounded-md bg-[#00D084] flex items-center justify-center text-white">
                  <MessageSquare className="w-3.5 h-3.5 fill-current" />
                </div>
              </div>
              <p className="text-xs font-medium text-gray-400">by Talentxcel</p>
              
              <div className="pt-2">
                <h3 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
                  Chatr<span className="text-[#7C3AED]">+</span>
                </h3>
                <p className="mt-1 text-sm text-gray-600 font-medium">
                  Smart Messaging, Privacy First
                </p>
              </div>
            </div>

            {/* 2. Center: Elevated Welcome Card with Phone OTP Input */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-purple-500/5 border border-purple-100/70 relative">
                
                {/* Purple top indicator */}
                <div className="w-10 h-1 bg-[#7C3AED] rounded-full mb-4" />

                <h4 className="text-lg font-bold text-gray-900 tracking-tight">
                  Welcome
                </h4>
                <p className="mt-0.5 text-xs text-gray-500">
                  Enter your phone number to continue
                </p>

                <form onSubmit={handlePhoneSubmit} className="mt-5 space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">
                      Phone Number
                    </label>
                    <div className="flex items-center gap-2">
                      {/* Country Code Dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowCountryPicker(!showCountryPicker)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 transition-colors cursor-pointer"
                        >
                          <span>{countryCodes.find((c) => c.code === countryCode)?.country || 'IN'}</span>
                          <span>{countryCode}</span>
                          <ChevronDown className="w-3 h-3 opacity-60" />
                        </button>
                        
                        {showCountryPicker && (
                          <div className="absolute top-full left-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                            {countryCodes.map((item) => (
                              <button
                                key={item.code}
                                type="button"
                                onClick={() => {
                                  setCountryCode(item.code);
                                  setShowCountryPicker(false);
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs hover:bg-purple-50 flex items-center justify-between text-gray-700"
                              >
                                <span>{item.flag} {item.country}</span>
                                <span className="font-mono text-gray-500">{item.code}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Phone Input */}
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Your phone number"
                        className="flex-1 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-all"
                      />
                    </div>
                  </div>

                  {/* Continue Button */}
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30 flex items-center justify-center gap-1.5 transition-all transform active:scale-[0.99] cursor-pointer"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <p className="text-[10px] text-gray-400 text-center pt-0.5 leading-relaxed">
                    New users will receive a verification OTP. Existing users login instantly.
                  </p>
                </form>

              </div>
            </div>

            {/* 3. Right Side: Trust Badges & Company Line */}
            <div className="lg:col-span-4 flex flex-col items-center lg:items-end justify-center space-y-5 text-center lg:text-right">
              
              {/* 3 Circular Badges Row */}
              <div className="flex items-center gap-6 sm:gap-8">
                
                {/* Secure */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-11 h-11 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs border border-amber-200/50">
                    <Shield className="w-5 h-5 fill-amber-100" />
                  </div>
                  <span className="text-[11px] font-bold text-gray-800">Secure</span>
                </div>

                {/* Fast */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-11 h-11 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shadow-2xs border border-orange-200/50">
                    <Zap className="w-5 h-5 fill-orange-100" />
                  </div>
                  <span className="text-[11px] font-bold text-gray-800">Fast</span>
                </div>

                {/* AI Powered */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-11 h-11 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shadow-2xs border border-purple-200/50">
                    <Bot className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-gray-800">AI Powered</span>
                </div>

              </div>

              {/* Attribution and Legal Links */}
              <div className="space-y-1 pt-1 text-[11px] text-gray-500">
                <p className="font-semibold text-gray-700">
                  Chatr — A product of Talentxcel Services Pvt Ltd.
                </p>
                <p className="text-[10px] text-gray-400">
                  © {new Date().getFullYear()} Talentxcel Services Pvt Ltd. All rights reserved.
                </p>
                <div className="flex flex-wrap items-center justify-center lg:justify-end gap-x-2.5 gap-y-1 text-[10px] text-gray-400 font-medium pt-1">
                  <Link to="/about" className="hover:text-[#7C3AED]">About</Link>
                  <span>·</span>
                  <Link to="/help" className="hover:text-[#7C3AED]">Help</Link>
                  <span>·</span>
                  <Link to="/contact" className="hover:text-[#7C3AED]">Contact Us</Link>
                  <span>·</span>
                  <Link to="/terms" className="hover:text-[#7C3AED]">Terms</Link>
                  <span>·</span>
                  <Link to="/privacy" className="hover:text-[#7C3AED]">Privacy</Link>
                  <span>·</span>
                  <Link to="/guidelines" className="hover:text-[#7C3AED]">Guidelines</Link>
                  <span>·</span>
                  <Link to="/claim" className="hover:text-[#7C3AED]">Claim</Link>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. BUILT FOR EVERYDAY LIFE (CRISP SMILING EDITORIAL CARDS)*/}
      {/* ========================================================= */}
      <section className="py-16 sm:py-24 bg-[#FAFBFB] border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-3xl mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#093E32]">
              DESIGNED FOR REAL HUMANS
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A]">
              Built for everyday life
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            
            {/* Friends & Family with Smiling Photo */}
            <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col">
              <div className="h-44 bg-gray-100 overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1511895426328-dc8714191300?w=500&auto=format&fit=crop&q=80"
                  alt="Smiling Family"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-bold text-rose-700 shadow-xs">
                  👨‍👩‍👧 Family First
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Friends &amp; family</h3>
                  <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed">
                    Keep your everyday conversations, calls, photos and memories together.
                  </p>
                </div>
              </div>
            </div>

            {/* People Who Travel with Smiling Traveler Photo */}
            <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col">
              <div className="h-44 bg-gray-100 overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=500&auto=format&fit=crop&q=80"
                  alt="Smiling Traveler"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-bold text-blue-700 shadow-xs">
                  ✈️ Global Roaming
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">People who travel</h3>
                  <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed">
                    Stay connected across countries and languages with calling and translation features.
                  </p>
                </div>
              </div>
            </div>

            {/* People with Busy Lives with Smiling Creator Photo */}
            <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col">
              <div className="h-44 bg-gray-100 overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80"
                  alt="Smiling Professional"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-bold text-amber-700 shadow-xs">
                  ⚡ AI Summaries
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">People with busy lives</h3>
                  <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed">
                    Let SI summarise conversations and help you catch up when you've been away.
                  </p>
                </div>
              </div>
            </div>

            {/* People who don't want another complicated app with Senior Photo */}
            <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="h-44 bg-gray-100 overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=500&auto=format&fit=crop&q=80"
                  alt="Smiling Grandparent"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-bold text-emerald-700 shadow-xs">
                  👌 Zero Passwords
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">People who don't want another complicated app</h3>
                  <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed">
                    Sign in with your phone number and start communicating. No complicated setup.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 8. YOUR CONVERSATIONS. YOUR CONTROL. (PRIVACY)            */}
      {/* ========================================================= */}
      <section className="py-16 sm:py-24 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="rounded-3xl border border-gray-200 bg-[#FAFBFB] p-8 sm:p-12 shadow-sm">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#093E32] text-white flex items-center justify-center shadow-xs">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">
                Your conversations. Your control.
              </h2>
            </div>

            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              Chatr is designed with privacy and user control in mind.
            </p>

            <div className="mt-6 space-y-3.5 text-xs sm:text-sm text-gray-800">
              {[
                'Phone-number sign-in with one-time verification',
                'Encrypted conversations in transit',
                'Account-level data access controls',
                'Connected services are optional',
                'SI actions are shown to you before sending unless you explicitly enable automated assistance',
                'You control the features you turn on',
                'You can disconnect connected services when you choose',
              ].map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#00D084] shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{point}</span>
                </div>
              ))}
            </div>

            <p className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-500">
              Read our{' '}
              <Link to="/privacy" className="font-bold text-[#093E32] underline hover:text-[#072F26]">
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link to="/terms" className="font-bold text-[#093E32] underline hover:text-[#072F26]">
                Terms of Service
              </Link>{' '}
              for complete details.
            </p>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 9. START WITH YOUR PHONE NUMBER                          */}
      {/* ========================================================= */}
      <section className="py-16 sm:py-24 bg-[#FAFBFB] border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="rounded-3xl border border-gray-200 bg-white p-8 sm:p-12 shadow-sm text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">
              Start with your phone number
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Simple 4-step onboarding with zero passwords to remember.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { step: '1', text: 'Enter your phone number.' },
                { step: '2', text: 'Confirm the one-time code.' },
                { step: '3', text: 'Create your Chatr profile.' },
                { step: '4', text: 'Start messaging and calling.' },
              ].map((item) => (
                <div key={item.step} className="bg-[#FAFBFB] p-5 rounded-2xl border border-gray-200 text-left">
                  <span className="w-8 h-8 rounded-full bg-[#093E32] text-white text-xs font-bold flex items-center justify-center mb-3">
                    {item.step}
                  </span>
                  <p className="text-xs font-semibold text-gray-900 leading-relaxed">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center sm:justify-start gap-4">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#093E32] hover:bg-[#072F26] text-white text-sm font-semibold shadow-md transition-all"
              >
                <Smartphone className="w-4 h-4" />
                <span>Continue with your phone number</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/download"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 text-sm font-medium shadow-xs"
              >
                <Download className="w-4 h-4 text-[#00D084]" />
                <span>Download Chatr for Android</span>
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 10. EXPLORE CHATR & COMPLETE FOOTER DIRECTORY            */}
      {/* ========================================================= */}
      <footer className="py-16 sm:py-24 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-[#0F172A]">chatr</span>
                <div className="w-5 h-5 rounded-md bg-[#00D084] flex items-center justify-center text-white">
                  <MessageSquare className="w-3.5 h-3.5 fill-current" />
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">Everything you need inside one super app.</p>
            </div>

            <Link to="/auth" className="text-xs font-bold text-[#093E32] hover:underline flex items-center gap-1">
              Sign In to Chatr <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[
              { to: '/chat', label: 'Messaging' },
              { to: '/calls', label: 'Voice & Video Calls' },
              { to: '/health', label: 'Chatr Health & Vitals' },
              { to: '/health-risks', label: 'ChatrShield PRO' },
              { to: '/ai-assistant', label: 'SI' },
              { to: '/chatr/ai-call-answering', label: 'SI Answer' },
              { to: '/communities', label: 'Communities' },
              { to: '/jobs', label: 'Jobs on Chatr' },
              { to: '/discover', label: 'Discover' },
              { to: '/business', label: 'Business Accounts' },
              { to: '/official-accounts', label: 'Official Accounts' },
              { to: '/help', label: 'Help Centre' },
              { to: '/privacy', label: 'Privacy' },
              { to: '/terms', label: 'Terms' },
              { to: '/contact', label: 'Contact' },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-2xl border border-gray-200 bg-[#FAFBFB] px-4 py-3 text-xs font-medium text-gray-700 hover:text-[#093E32] hover:border-emerald-300 transition-colors shadow-2xs"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-16 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <p>
              <strong>Chatr — a product of Talentxcel Services Pvt Ltd.</strong>
            </p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="hover:text-[#093E32]">Privacy</Link>
              <Link to="/terms" className="hover:text-[#093E32]">Terms</Link>
              <Link to="/contact" className="hover:text-[#093E32]">Contact</Link>
              <span>© {new Date().getFullYear()} Chatr. All rights reserved.</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};

export default PublicHome;
