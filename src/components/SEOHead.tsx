import { Helmet } from 'react-helmet-async';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  ORGANIZATION_NAME,
  PRODUCTION_ORIGIN,
  SITE_NAME,
  SOCIAL_PROFILES,
  SUPPORT_TELEPHONE,
  TWITTER_HANDLE,
  absoluteUrl,
  canonicalUrlFor,
  isIndexable,
} from '@/config/seo';

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

export const SEOHead = ({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  keywords,
  ogImage = DEFAULT_OG_IMAGE,
  ogUrl,
  canonicalUrl,
  schemaData,
  noIndex,
  articleData,
  breadcrumbList,
}: SEOHeadProps) => {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';

  // Canonical is always absolute, always chatr.chat, always the page itself,
  // and never carries query/hash parameters.
  const canonical = canonicalUrl ? absoluteUrl(canonicalUrl) : canonicalUrlFor(currentPath);
  const fullUrl = ogUrl ? absoluteUrl(ogUrl) : canonical;
  const absoluteOgImage = absoluteUrl(ogImage);

  // Default to noindex whenever the route is not classified INDEXABLE_PUBLIC.
  const shouldNoIndex = noIndex ?? !isIndexable(currentPath);

  // WebApplication schema — no ratings, review counts, downloads or user
  // numbers: none of those are verifiable, so none are published.
  const defaultSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Chatr',
    alternateName: SITE_NAME,
    description,
    url: canonical,
    applicationCategory: 'CommunicationApplication',
    operatingSystem: 'Web, Android',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
    },
    featureList: [
      'Messaging and calling',
      'AI assistant and AI agents',
      'Universal inbox across email and chat channels',
      'Healthcare records and doctor booking',
      'Jobs and applications',
      'Local services and marketplace',
    ],
    author: {
      '@type': 'Organization',
      name: ORGANIZATION_NAME,
      url: PRODUCTION_ORIGIN,
    },
  };

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    legalName: ORGANIZATION_NAME,
    url: PRODUCTION_ORIGIN,
    logo: absoluteUrl(DEFAULT_OG_IMAGE),
    ...(SOCIAL_PROFILES.length > 0 ? { sameAs: SOCIAL_PROFILES } : {}),
    ...(SUPPORT_TELEPHONE
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: SUPPORT_TELEPHONE,
            contactType: 'customer service',
            availableLanguage: ['English', 'Hindi'],
          },
        }
      : {}),
  };

  const breadcrumbSchema =
    breadcrumbList && breadcrumbList.length > 1
      ? {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: breadcrumbList.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: absoluteUrl(item.url),
          })),
        }
      : null;

  const schemas = [
    schemaData || defaultSchema,
    organizationSchema,
    ...(breadcrumbSchema ? [breadcrumbSchema] : []),
  ];

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}

      {/* Robots */}
      {shouldNoIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />
      )}

      {/* Canonical URL */}
      <link rel="canonical" href={canonical} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={articleData ? 'article' : 'website'} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_IN" />

      {/* Article specific OG tags */}
      {articleData?.publishedTime && (
        <meta property="article:published_time" content={articleData.publishedTime} />
      )}
      {articleData?.modifiedTime && (
        <meta property="article:modified_time" content={articleData.modifiedTime} />
      )}
      {articleData?.author && <meta property="article:author" content={articleData.author} />}
      {articleData?.section && <meta property="article:section" content={articleData.section} />}

      {/* Twitter / X */}
      <meta name="twitter:card" content="summary_large_image" />
      {TWITTER_HANDLE && <meta name="twitter:site" content={TWITTER_HANDLE} />}
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteOgImage} />

      {/* Mobile / PWA */}
      <meta name="theme-color" content="#0EA5E9" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="Chatr" />

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
      return { '@context': 'https://schema.org', '@type': 'Product', ...data };
    case 'Service':
      return { '@context': 'https://schema.org', '@type': 'Service', ...data };
    case 'JobPosting':
      return { '@context': 'https://schema.org', '@type': 'JobPosting', ...data };
    case 'MedicalOrganization':
      return { '@context': 'https://schema.org', '@type': 'MedicalOrganization', ...data };
    case 'FAQPage':
      // Only use this when the questions are visibly rendered on the page.
      return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: data.questions?.map((q: { question: string; answer: string }) => ({
          '@type': 'Question',
          name: q.question,
          acceptedAnswer: { '@type': 'Answer', text: q.answer },
        })),
      };
    default:
      return { '@context': 'https://schema.org', '@type': type, ...data };
  }
};
