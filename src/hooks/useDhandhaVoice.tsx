import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface VoiceResult {
  amount: number | null;
  rawText: string;
  confidence: number;
}

export const useDhandhaVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Extract amount from Hindi/English voice input
  const extractAmount = useCallback((text: string): number | null => {
    // Clean and normalize text
    const cleaned = text.toLowerCase().trim();
    
    // Hindi number words mapping
    const hindiNumbers: Record<string, number> = {
      'ek': 1, 'do': 2, 'teen': 3, 'char': 4, 'paanch': 5,
      'cheh': 6, 'saat': 7, 'aath': 8, 'nau': 9, 'das': 10,
      'gyarah': 11, 'barah': 12, 'terah': 13, 'chaudah': 14, 'pandrah': 15,
      'solah': 16, 'satrah': 17, 'atharah': 18, 'unnis': 19, 'bees': 20,
      'pachees': 25, 'tees': 30, 'chaalis': 40, 'pachaas': 50,
      'saath': 60, 'sattar': 70, 'assi': 80, 'nabbe': 90, 'sau': 100,
      'hazaar': 1000, 'hazar': 1000, 'lakh': 100000,
      // Common variations
      'sow': 100, 'so': 100, 'hajaar': 1000,
    };

    // Try to find ₹ or rupee pattern first
    const rupeePatterns = [
      /₹\s*(\d+(?:,\d+)*(?:\.\d+)?)/,
      /rs\.?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
      /rupees?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
      /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rupees?|rs\.?|₹)/i,
      /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:ka|ki|ke)\s*bill/i,
    ];

    for (const pattern of rupeePatterns) {
      const match = cleaned.match(pattern);
      if (match) {
        return parseFloat(match[1].replace(/,/g, ''));
      }
    }

    // Try plain number extraction
    const plainNumber = cleaned.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
    if (plainNumber) {
      return parseFloat(plainNumber[1].replace(/,/g, ''));
    }

    // Try Hindi word-based extraction (simplified)
    let total = 0;
    let multiplier = 1;
    const words = cleaned.split(/\s+/);
    
    for (const word of words) {
      if (hindiNumbers[word]) {
        if (word === 'sau' || word === 'sow' || word === 'so') {
          total = total === 0 ? 100 : total * 100;
        } else if (word === 'hazaar' || word === 'hazar' || word === 'hajaar') {
          total = total === 0 ? 1000 : total * 1000;
        } else {
          total += hindiNumbers[word] * multiplier;
        }
      }
    }

    return total > 0 ? total : null;
  }, []);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice recognition not supported on this browser');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'hi-IN'; // Hindi (India) - also understands English numbers
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        toast.error('Voice error: ' + event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback((): VoiceResult => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);

    const amount = extractAmount(transcript);
    return {
      amount,
      rawText: transcript,
      confidence: amount ? 0.9 : 0
    };
  }, [transcript, extractAmount]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    extractAmount
  };
};
