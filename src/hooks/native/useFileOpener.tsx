import { useCallback } from 'react';
import { FileOpener } from '@capacitor-community/file-opener';
import { toast } from 'sonner';

/**
 * Native file opener hook
 * Opens PDFs, images, documents with native apps
 */
export const useFileOpener = () => {
  /**
   * Open a file with native application
   */
  const openFile = useCallback(async (filePath: string, mimeType?: string) => {
    try {
      // Auto-detect MIME type if not provided
      if (!mimeType) {
        const extension = filePath.split('.').pop()?.toLowerCase();
        mimeType = getMimeType(extension || '');
      }

      await FileOpener.open({
        filePath,
        contentType: mimeType,
        openWithDefault: true
      });

      return true;
    } catch (error) {
      console.error('Failed to open file:', error);
      toast.error('Could not open file');
      return false;
    }
  }, []);

  /**
   * Open PDF document
   */
  const openPDF = useCallback(async (filePath: string) => {
    return openFile(filePath, 'application/pdf');
  }, [openFile]);

  /**
   * Open image file
   */
  const openImage = useCallback(async (filePath: string) => {
    const extension = filePath.split('.').pop()?.toLowerCase();
    const mimeType = extension === 'png' ? 'image/png' : 
                     extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : 
                     'image/*';
    return openFile(filePath, mimeType);
  }, [openFile]);

  /**
   * Open document (Word, Excel, etc.)
   */
  const openDocument = useCallback(async (filePath: string) => {
    const extension = filePath.split('.').pop()?.toLowerCase();
    let mimeType = 'application/octet-stream';

    switch (extension) {
      case 'doc':
        mimeType = 'application/msword';
        break;
      case 'docx':
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case 'xls':
        mimeType = 'application/vnd.ms-excel';
        break;
      case 'xlsx':
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'ppt':
        mimeType = 'application/vnd.ms-powerpoint';
        break;
      case 'pptx':
        mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        break;
    }

    return openFile(filePath, mimeType);
  }, [openFile]);

  return {
    openFile,
    openPDF,
    openImage,
    openDocument
  };
};

/**
 * Get MIME type from file extension
 */
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'json': 'application/json',
    'xml': 'application/xml',
    'zip': 'application/zip'
  };

  return mimeTypes[extension] || 'application/octet-stream';
}
