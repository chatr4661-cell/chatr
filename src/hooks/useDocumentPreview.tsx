import { useState, useCallback } from 'react';

interface DocumentPreview {
  url: string;
  type: 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'ppt' | 'pptx' | 'txt' | 'image' | 'unknown';
  name: string;
  size?: number;
  pages?: number;
}

export const useDocumentPreview = () => {
  const [currentDocument, setCurrentDocument] = useState<DocumentPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const getDocumentType = useCallback((url: string, mimeType?: string): DocumentPreview['type'] => {
    const extension = url.split('.').pop()?.toLowerCase();
    
    if (mimeType) {
      if (mimeType.includes('pdf')) return 'pdf';
      if (mimeType.includes('word') || mimeType.includes('document')) return 'docx';
      if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'xlsx';
      if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'pptx';
      if (mimeType.includes('text/plain')) return 'txt';
      if (mimeType.startsWith('image/')) return 'image';
    }

    switch (extension) {
      case 'pdf': return 'pdf';
      case 'doc': return 'doc';
      case 'docx': return 'docx';
      case 'xls': return 'xls';
      case 'xlsx': return 'xlsx';
      case 'ppt': return 'ppt';
      case 'pptx': return 'pptx';
      case 'txt': return 'txt';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return 'image';
      default:
        return 'unknown';
    }
  }, []);

  const openDocument = useCallback(async (url: string, name: string, mimeType?: string) => {
    setIsLoading(true);
    setError(null);
    setCurrentPage(1);

    try {
      const type = getDocumentType(url, mimeType);
      
      setCurrentDocument({
        url,
        type,
        name,
      });
    } catch (err) {
      setError('Failed to load document');
      console.error('Document preview error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getDocumentType]);

  const closeDocument = useCallback(() => {
    setCurrentDocument(null);
    setCurrentPage(1);
    setError(null);
  }, []);

  const nextPage = useCallback(() => {
    if (currentDocument?.pages && currentPage < currentDocument.pages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentDocument, currentPage]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const goToPage = useCallback((page: number) => {
    if (currentDocument?.pages && page >= 1 && page <= currentDocument.pages) {
      setCurrentPage(page);
    }
  }, [currentDocument]);

  const getPreviewUrl = useCallback((url: string, type: DocumentPreview['type']): string => {
    // For PDFs and images, we can display directly
    if (type === 'pdf' || type === 'image') {
      return url;
    }
    
    // For Office documents, use Google Docs Viewer or Microsoft Office Online
    // This provides a preview without needing to download
    const encodedUrl = encodeURIComponent(url);
    
    // Google Docs Viewer (works for most document types)
    return `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
  }, []);

  const canPreview = useCallback((type: DocumentPreview['type']): boolean => {
    return ['pdf', 'image', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(type);
  }, []);

  const downloadDocument = useCallback(async () => {
    if (!currentDocument) return;

    try {
      const response = await fetch(currentDocument.url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = currentDocument.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download error:', err);
      // Fallback: open in new tab
      window.open(currentDocument.url, '_blank');
    }
  }, [currentDocument]);

  return {
    currentDocument,
    isLoading,
    error,
    currentPage,
    openDocument,
    closeDocument,
    nextPage,
    prevPage,
    goToPage,
    getPreviewUrl,
    getDocumentType,
    canPreview,
    downloadDocument,
  };
};
