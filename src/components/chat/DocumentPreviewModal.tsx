import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import { Download, ChevronLeft, ChevronRight, X, FileText, ExternalLink } from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  name: string;
  mimeType?: string;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  url,
  name,
  mimeType,
}) => {
  const {
    currentPage,
    isLoading,
    error,
    getDocumentType,
    getPreviewUrl,
    canPreview,
    nextPage,
    prevPage,
  } = useDocumentPreview();

  const docType = getDocumentType(url, mimeType);
  const previewUrl = getPreviewUrl(url, docType);
  const showPreview = canPreview(docType);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openExternal = () => {
    window.open(url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <DialogTitle className="text-sm font-medium truncate max-w-[300px]">
              {name}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openExternal}>
              <ExternalLink className="w-4 h-4 mr-1" />
              Open
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted/30">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <FileText className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleDownload}>Download Instead</Button>
            </div>
          )}

          {!isLoading && !error && showPreview && (
            <>
              {docType === 'image' ? (
                <div className="h-full flex items-center justify-center p-4">
                  <img
                    src={url}
                    alt={name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : docType === 'pdf' ? (
                <iframe
                  src={`${url}#toolbar=0`}
                  className="w-full h-full border-0"
                  title={name}
                />
              ) : (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title={name}
                />
              )}
            </>
          )}

          {!isLoading && !error && !showPreview && (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <FileText className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">
                Preview not available for this file type
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {docType.toUpperCase()} files cannot be previewed in browser
              </p>
              <Button onClick={handleDownload}>Download File</Button>
            </div>
          )}
        </div>

        {/* Page navigation for multi-page documents */}
        {docType === 'pdf' && (
          <div className="p-2 border-t flex items-center justify-center gap-4">
            <Button variant="outline" size="sm" onClick={prevPage}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage}
            </span>
            <Button variant="outline" size="sm" onClick={nextPage}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
