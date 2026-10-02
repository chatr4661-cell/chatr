import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/SEOHead';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { AudienceStrip } from '@/components/landing/AudienceStrip';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { AuthModal } from '@/components/landing/AuthModal';
import { VideoModal } from '@/components/landing/VideoModal';
import {
  DEFAULT_DESCRIPTION,
  ORGANIZATION_NAME,
  PRODUCTION_ORIGIN,
  SITE_NAME,
  SOCIAL_PROFILES,
  absoluteUrl,
} from '@/config/seo';

interface ChatrLandingPageProps {
  initialAuthOpen?: boolean;
}

export const ChatrLandingPage: React.FC<ChatrLandingPageProps> = ({ initialAuthOpen = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Check URL query params for ?auth=true or initialAuthOpen or path /auth
  const queryParams = new URLSearchParams(location.search);
  const shouldOpenAuthFromQuery = queryParams.get('auth') === 'true' || location.pathname === '/auth';

  const [authModalOpen, setAuthModalOpen] = useState<boolean>(initialAuthOpen || shouldOpenAuthFromQuery);
  const [videoModalOpen, setVideoModalOpen] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Check existing session once on mount
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted && session?.user) {
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.warn('[Landing] Session verification:', err);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsAuthenticated(true);
        setAuthModalOpen(false);
        // Destination redirect
        const stateFrom = (location.state as any)?.from?.pathname ||
          (typeof (location.state as any)?.from === 'string' ? (location.state as any)?.from : null);
        const storedRedirect = sessionStorage.getItem('auth_redirect');
        const defaultTarget = window.innerWidth >= 1024 ? '/desktop/chat' : '/chat';
        const target = stateFrom || storedRedirect || defaultTarget;
        if (storedRedirect) sessionStorage.removeItem('auth_redirect');
        navigate(target, { replace: true });
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setIsAuthenticated(true);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, location]);

  const handleNavigateWorkspace = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleAuthSuccess = useCallback(() => {
    setAuthModalOpen(false);
    navigate('/', { replace: true });
  }, [navigate]);

  const homepageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${PRODUCTION_ORIGIN}/#organization`,
        name: ORGANIZATION_NAME,
        alternateName: 'CHATR',
        url: PRODUCTION_ORIGIN,
        logo: absoluteUrl('/images/chatr-official-logo.png'),
        sameAs: SOCIAL_PROFILES,
      },
      {
        '@type': 'WebSite',
        '@id': `${PRODUCTION_ORIGIN}/#website`,
        name: 'CHATR',
        alternateName: ['CHATR Super App', 'chatr.chat', 'CHATR+'],
        url: PRODUCTION_ORIGIN,
        inLanguage: 'en-IN',
        publisher: { '@id': `${PRODUCTION_ORIGIN}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${PRODUCTION_ORIGIN}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'WebApplication',
        '@id': `${PRODUCTION_ORIGIN}/#webapp`,
        name: 'CHATR',
        alternateName: SITE_NAME,
        url: PRODUCTION_ORIGIN,
        applicationCategory: 'CommunicationApplication',
        operatingSystem: 'Web, Android, iOS',
        description: DEFAULT_DESCRIPTION,
        publisher: { '@id': `${PRODUCTION_ORIGIN}/#organization` },
        featureList: [
          'Direct Chat without saving numbers',
          'Live Voice & Video Call Translation in 40+ languages',
          'AI Call Answering & Spam Protection',
          'Health Hub, vitals logging, and family wellness',
          'Universal personal search and timeline',
          'Local Community Circles & Chatr Champions',
          'Instant phone-number login with zero passwords',
        ],
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#F8F8F5] text-[#111817] font-sans antialiased selection:bg-[#E8F0EB] selection:text-[#164E3F]">
      <SEOHead
        title="CHATR — Your Life. Our Intelligence. Zero Noise."
        description="The consumer personal intelligence super app. Direct chat without saving numbers, live dual-audio call translation in 40+ languages, spam protection, and family health tracking."
        keywords="CHATR, Super App, Direct Chat, Call Translation, Spam Call Shield, Health Hub, AI Doctor, Chatr Champions"
        canonicalUrl="/"
        noIndex={false}
        schemaData={homepageSchema}
      />

      {/* 1. Header Navigation */}
      <LandingHeader
        onOpenAuth={() => setAuthModalOpen(true)}
        isAuthenticated={isAuthenticated}
        onNavigateWorkspace={handleNavigateWorkspace}
      />

      {/* 2. Hero Section with Two-Column Editorial Layout */}
      <main>
        <HeroSection
          onOpenAuth={() => setAuthModalOpen(true)}
          onOpenVideo={() => setVideoModalOpen(true)}
        />

        {/* 3. Qualitative Consumer Audience Strip */}
        <AudienceStrip />

        {/* 4. Six Core B2C Capabilities */}
        <FeatureGrid
          onCardClick={(_featureKey) => {
            setAuthModalOpen(true);
          }}
        />

        {/* 5. Crawlable Exploration Directory for SEO */}
        <section className="py-12 bg-[#F8F8F5] border-t border-[#DDE3DF]/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#164E3F]">
              <span className="w-4 h-[1.5px] bg-[#164E3F]" />
              <span>EXPLORE CHATR SERVICES &amp; CORRIDORS</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                { to: '/direct-chat', label: 'Direct Chat Without Saving' },
                { to: '/lookup', label: 'Caller ID & Phone Lookup' },
                { to: '/chatr/universal-inbox-ai', label: 'Universal Inbox' },
                { to: '/chatr/live-call-translation', label: 'Live Call Translation' },
                { to: '/chatr/spam-call-protection', label: 'Spam Call Protection' },
                { to: '/chatr/ai-call-answering', label: 'AI Call Answering' },
                { to: '/chatr/ai-messaging-assistant', label: 'AI Messaging Assistant' },
                { to: '/chatr/ai-agents', label: 'SI Personal Agents' },
                { to: '/chatr/business-messaging', label: 'Business Messaging' },
                { to: '/chatr/whatsapp-candidate-screening', label: 'WhatsApp Screening' },
                { to: '/chatr/locations', label: 'Global Corridors' },
                { to: '/download', label: 'Android & Web App' },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="rounded-xl border border-[#DDE3DF] bg-white px-3.5 py-2.5 text-xs text-[#53605C] hover:text-[#164E3F] hover:border-[#164E3F]/40 transition-colors shadow-2xs"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Bottom Call-To-Action Banner & Footer */}
        <LandingCTA
          onOpenAuth={() => setAuthModalOpen(true)}
        />
      </main>

      {/* Auth Modal Overlay */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Video Demo Modal */}
      <VideoModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        onOpenAuth={() => {
          setVideoModalOpen(false);
          setAuthModalOpen(true);
        }}
      />
    </div>
  );
};

export default ChatrLandingPage;
