import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogUrl?: string;
  canonicalUrl?: string;
  schemaData?: object;
}

export const SEOHead = ({
  title = 'Chatr - Universal Search | AI-Powered Multi-Source Search Engine',
  description = 'Discover Chatr\'s Universal Search - Find anything instantly across web, local services, jobs, healthcare, and marketplace. AI-powered search with GPS, visual search, and smart recommendations.',
  keywords = 'universal search, AI search, multi-source search, local search, GPS search, visual search, smart search, web search, perplexity, openai search, services search',
  ogImage = '/og-image.jpg',
  ogUrl,
  canonicalUrl,
  schemaData,
}: SEOHeadProps) => {
  const fullUrl = ogUrl || window.location.href;
  const canonical = canonicalUrl || window.location.href;

  const defaultSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Chatr Universal Search",
    "description": description,
    "url": fullUrl,
    "applicationCategory": "SearchApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "1000"
    },
    "featureList": [
      "AI-Powered Search",
      "Multi-Source Integration",
      "GPS-Based Local Search",
      "Visual Search",
      "Smart Recommendations",
      "Saved Searches with Alerts"
    ]
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonical} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={fullUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={ogImage} />
      
      {/* Mobile Optimization */}
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <meta name="theme-color" content="#0EA5E9" />
      
      {/* Schema.org Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(schemaData || defaultSchema)}
      </script>
    </Helmet>
  );
};
