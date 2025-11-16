import { useState, useCallback } from 'react';
import { BarcodeScanner, SupportedFormat } from '@capacitor-community/barcode-scanner';
import { toast } from 'sonner';

export interface ScanResult {
  hasContent: boolean;
  content?: string;
  format?: string;
}

/**
 * Premium QR/Barcode scanner hook
 * Supports QR codes, EAN, UPC, Code 128, and more
 */
export const useBarcodeScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  /**
   * Request camera permissions
   */
  const requestPermissions = useCallback(async () => {
    try {
      const status = await BarcodeScanner.checkPermission({ force: true });
      
      if (status.granted) {
        return true;
      }
      
      if (status.denied) {
        toast.error('Camera permission denied. Please enable in settings.');
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }, []);

  /**
   * Start scanning
   */
  const startScan = useCallback(async (targetFormats?: SupportedFormat[]) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      setIsScanning(true);
      
      // Make background transparent for camera view
      document.body.classList.add('scanner-active');
      
      const result = await BarcodeScanner.startScan({
        targetedFormats: targetFormats || ['QR_CODE']
      });

      document.body.classList.remove('scanner-active');
      setIsScanning(false);

      if (result.hasContent) {
        setScanResult(result);
        toast.success('Code scanned successfully');
        return result;
      }

      return null;
    } catch (error) {
      console.error('Scan failed:', error);
      document.body.classList.remove('scanner-active');
      setIsScanning(false);
      toast.error('Scan failed');
      return null;
    }
  }, [requestPermissions]);

  /**
   * Stop scanning
   */
  const stopScan = useCallback(async () => {
    try {
      await BarcodeScanner.stopScan();
      document.body.classList.remove('scanner-active');
      setIsScanning(false);
    } catch (error) {
      console.error('Stop scan failed:', error);
    }
  }, []);

  /**
   * Prepare camera (show preview)
   */
  const prepare = useCallback(async () => {
    try {
      await BarcodeScanner.prepare();
    } catch (error) {
      console.error('Prepare failed:', error);
    }
  }, []);

  /**
   * Check if camera is available
   */
  const checkPermission = useCallback(async () => {
    try {
      const status = await BarcodeScanner.checkPermission({ force: false });
      return status.granted;
    } catch {
      return false;
    }
  }, []);

  return {
    isScanning,
    scanResult,
    startScan,
    stopScan,
    prepare,
    checkPermission,
    requestPermissions
  };
};
