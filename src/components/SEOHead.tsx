import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogUrl?: string;
  canonicalUrl?: string;
  schemaData?: object;
  noIndex?: boolean;
  articleData?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
  };
  breadcrumbList?: Array<{ name: string; url: string }>;
}

const BASE_URL = 'https://chatr.chat';

export const SEOHead = ({
  title = 'Chatr - Universal Search | AI-Powered Multi-Source Search Engine',
  description = 'Discover Chatr\'s Universal Search - Find anything instantly across web, local services, jobs, healthcare, and marketplace. AI-powered search with GPS, visual search, and smart recommendations.',
  keywords = 'universal search, AI search, multi-source search, local search, GPS search, visual search, smart search, web search, perplexity, openai search, services search',
  ogImage = '/og-image.jpg',
  ogUrl,
  canonicalUrl,
  schemaData,
  noIndex = false,
  articleData,
  breadcrumbList,
}: SEOHeadProps) => {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const fullUrl = ogUrl || `${BASE_URL}${currentPath}`;
  const canonical = canonicalUrl || fullUrl;
  const absoluteOgImage = ogImage.startsWith('http') ? ogImage : `${BASE_URL}${ogImage}`;

  // Default WebApplication schema
  const defaultSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Chatr",
    "alternateName": "Chatr+",
    "description": description,
    "url": fullUrl,
    "applicationCategory": "CommunicationApplication",
    "operatingSystem": "Web, Android, iOS",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "INR"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "10000"
    },
    "featureList": [
      "AI-Powered Search",
      "Messaging & Calling",
      "Local Jobs Search",
      "Healthcare Booking",
      "Digital Wallet",
      "Games & Rewards"
    ],
    "author": {
      "@type": "Organization",
      "name": "Talentxcel Services Pvt Ltd",
      "url": "https://chatr.chat"
    }
  };

  // Organization schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Chatr",
    "url": BASE_URL,
    "logo": `${BASE_URL}/logo.png`,
    "sameAs": [
      "https://twitter.com/chatrapp",
      "https://facebook.com/chatrapp",
      "https://instagram.com/chatrapp",
      "https://linkedin.com/company/chatr"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+91-XXXXXXXXXX",
      "contactType": "customer service",
      "availableLanguage": ["English", "Hindi"]
    }
  };

  // Breadcrumb schema
  const breadcrumbSchema = breadcrumbList ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbList.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`
    }))
  } : null;

  // Combine all schemas
  const schemas = [
    schemaData || defaultSchema,
    organizationSchema,
    ...(breadcrumbSchema ? [breadcrumbSchema] : [])
  ];

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Robots */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonical} />
      
      {/* Alternate Languages (for future i18n) */}
      <link rel="alternate" hrefLang="en" href={canonical} />
      <link rel="alternate" hrefLang="hi" href={`${canonical}?lang=hi`} />
      <link rel="alternate" hrefLang="x-default" href={canonical} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={articleData ? 'article' : 'website'} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Chatr" />
      <meta property="og:locale" content="en_IN" />
      
      {/* Article specific OG tags */}
      {articleData?.publishedTime && (
        <meta property="article:published_time" content={articleData.publishedTime} />
      )}
      {articleData?.modifiedTime && (
        <meta property="article:modified_time" content={articleData.modifiedTime} />
      )}
      {articleData?.author && (
        <meta property="article:author" content={articleData.author} />
      )}
      {articleData?.section && (
        <meta property="article:section" content={articleData.section} />
      )}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@chatrapp" />
      <meta name="twitter:creator" content="@chatrapp" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteOgImage} />
      
      {/* Mobile Optimization */}
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <meta name="theme-color" content="#0EA5E9" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="Chatr" />
      
      {/* App Links */}
      <meta property="al:android:url" content={`chatr:/${currentPath}`} />
      <meta property="al:android:package" content="app.lovable.6d6a8a571c024ddcbd7f2c0ec6dd878a" />
      <meta property="al:android:app_name" content="Chatr" />
      <meta property="al:ios:url" content={`chatr:/${currentPath}`} />
      <meta property="al:ios:app_name" content="Chatr" />
      <meta property="al:web:url" content={fullUrl} />
      
      {/* Schema.org Structured Data */}
      {schemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

// Helper function to generate page-specific schema
export const generatePageSchema = (type: string, data: Record<string, any>) => {
  switch (type) {
    case 'Product':
      return {
        "@context": "https://schema.org",
        "@type": "Product",
        ...data
      };
    case 'Service':
      return {
        "@context": "https://schema.org",
        "@type": "Service",
        ...data
      };
    case 'JobPosting':
      return {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        ...data
      };
    case 'MedicalOrganization':
      return {
        "@context": "https://schema.org",
        "@type": "MedicalOrganization",
        ...data
      };
    case 'FAQPage':
      return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": data.questions?.map((q: { question: string; answer: string }) => ({
          "@type": "Question",
          "name": q.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": q.answer
          }
        }))
      };
    default:
      return {
        "@context": "https://schema.org",
        "@type": type,
        ...data
      };
  }
};
