/**
 * CHATR ULTRA - Web Extraction Service
 * Extracts clean text from webpages for on-device analysis
 */

export interface ExtractedContent {
  title: string;
  text: string;
  metadata: {
    url: string;
    author?: string;
    publishDate?: string;
    description?: string;
  };
  images: string[];
  links: string[];
  structure: {
    headings: string[];
    paragraphs: number;
    lists: number;
  };
}

/**
 * Web Extraction Service
 * Loads pages and extracts clean text for AI processing
 */
class WebExtractionService {
  /**
   * Extract content from a URL
   */
  async extractFromURL(url: string): Promise<ExtractedContent> {
    console.log('🌐 [Web Extraction] Loading:', url);

    try {
      // Fetch the page
      const response = await fetch(url);
      const html = await response.text();

      // Parse HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Extract metadata
      const title = doc.querySelector('title')?.textContent || '';
      const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      const author = doc.querySelector('meta[name="author"]')?.getAttribute('content');
      const publishDate = doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content');

      // Clean the content
      this.removeNoise(doc);

      // Extract main text
      const text = this.extractMainText(doc);

      // Extract images
      const images = Array.from(doc.querySelectorAll('img'))
        .map(img => img.src)
        .filter(src => src.startsWith('http'));

      // Extract links
      const links = Array.from(doc.querySelectorAll('a'))
        .map(a => a.href)
        .filter(href => href.startsWith('http'));

      // Extract structure
      const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .map(h => h.textContent || '');

      const paragraphs = doc.querySelectorAll('p').length;
      const lists = doc.querySelectorAll('ul, ol').length;

      console.log('✅ [Web Extraction] Extracted', text.length, 'characters');

      return {
        title,
        text,
        metadata: {
          url,
          author,
          publishDate,
          description,
        },
        images,
        links,
        structure: {
          headings,
          paragraphs,
          lists,
        },
      };
    } catch (error) {
      console.error('❌ [Web Extraction] Failed:', error);
      throw new Error(`Failed to extract content from ${url}`);
    }
  }

  /**
   * Extract content from raw HTML
   */
  extractFromHTML(html: string, baseURL?: string): ExtractedContent {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    this.removeNoise(doc);

    const title = doc.querySelector('title')?.textContent || '';
    const text = this.extractMainText(doc);
    const images = Array.from(doc.querySelectorAll('img')).map(img => img.src);
    const links = Array.from(doc.querySelectorAll('a')).map(a => a.href);
    const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map(h => h.textContent || '');

    return {
      title,
      text,
      metadata: {
        url: baseURL || '',
      },
      images,
      links,
      structure: {
        headings,
        paragraphs: doc.querySelectorAll('p').length,
        lists: doc.querySelectorAll('ul, ol').length,
      },
    };
  }

  /**
   * Remove ads, scripts, styles, and other noise
   */
  private removeNoise(doc: Document): void {
    // Remove scripts, styles, comments
    const noisySelectors = [
      'script',
      'style',
      'noscript',
      'iframe',
      'nav',
      'footer',
      'header',
      'aside',
      '.ad',
      '.advertisement',
      '.popup',
      '.modal',
      '.cookie-notice',
      '.social-share',
      '.comments',
    ];

    noisySelectors.forEach(selector => {
      doc.querySelectorAll(selector).forEach(el => el.remove());
    });
  }

  /**
   * Extract main text content intelligently
   */
  private extractMainText(doc: Document): string {
    // Try to find main content area
    const mainSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '.main-content',
      '#content',
      '#main',
    ];

    let mainElement: Element | null = null;
    for (const selector of mainSelectors) {
      mainElement = doc.querySelector(selector);
      if (mainElement) break;
    }

    // Fallback to body if no main element found
    const contentRoot = mainElement || doc.body;

    // Extract text from paragraphs, headings, lists
    const textNodes: string[] = [];

    contentRoot.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li').forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length > 10) {
        textNodes.push(text);
      }
    });

    return textNodes.join('\n\n');
  }

  /**
   * Summarize extracted content to key points
   */
  summarizeContent(content: ExtractedContent): string {
    const lines: string[] = [];

    if (content.title) {
      lines.push(`# ${content.title}`);
      lines.push('');
    }

    if (content.metadata.description) {
      lines.push(content.metadata.description);
      lines.push('');
    }

    if (content.structure.headings.length > 0) {
      lines.push('## Key Topics:');
      content.structure.headings.slice(0, 5).forEach(h => {
        lines.push(`- ${h}`);
      });
      lines.push('');
    }

    // Add first 500 words of main text
    const words = content.text.split(/\s+/);
    const preview = words.slice(0, 500).join(' ');
    lines.push(preview);

    if (words.length > 500) {
      lines.push(`\n... (${words.length - 500} more words)`);
    }

    return lines.join('\n');
  }
}

export const webExtraction = new WebExtractionService();
