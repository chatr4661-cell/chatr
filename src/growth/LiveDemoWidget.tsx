import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Languages, Volume2, ArrowRight, Video, Sparkles, Check, 
  RefreshCw, Play, ShieldCheck, Zap 
} from 'lucide-react';

interface LanguagePair {
  id: string;
  label: string;
  source: string;
  target: string;
  sampleInput: string;
  sampleOutput: string;
  voiceLang: string;
}

const PRESET_PAIRS: LanguagePair[] = [
  {
    id: 'hi-en',
    label: 'Hindi ➔ English',
    source: 'Hindi',
    target: 'English',
    sampleInput: 'नमस्ते, क्या हम आज वीडियो कॉल पर बात कर सकते हैं?',
    sampleOutput: 'Hello, can we speak on a video call today?',
    voiceLang: 'en-US'
  },
  {
    id: 'pa-hi',
    label: 'Punjabi ➔ Hindi',
    source: 'Punjabi',
    target: 'Hindi',
    sampleInput: 'ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ, ਤੁਹਾਡਾ ਕੀ ਹਾਲ ਹੈ?',
    sampleOutput: 'नमस्ते, आपका क्या हाल है?',
    voiceLang: 'hi-IN'
  },
  {
    id: 'mr-en',
    label: 'Marathi ➔ English',
    source: 'Marathi',
    target: 'English',
    sampleInput: 'नमस्कार, मला या सेवेबद्दल अधिक जाणून घ्यायचे आहे.',
    sampleOutput: 'Hello, I want to learn more about this service.',
    voiceLang: 'en-US'
  },
  {
    id: 'te-hi',
    label: 'Telugu ➔ Hindi',
    source: 'Telugu',
    target: 'Hindi',
    sampleInput: 'నమస్కారం, మీతో మాట్లాడటం చాలా సంతోషంగా ఉంది.',
    sampleOutput: 'नमस्ते, आपसे बात करके बहुत खुशी हुई।',
    voiceLang: 'hi-IN'
  },
  {
    id: 'ta-en',
    label: 'Tamil ➔ English',
    source: 'Tamil',
    target: 'English',
    sampleInput: 'வணக்கம், நாளை சந்திப்பை உறுதிப்படுத்த முடியுமா?',
    sampleOutput: 'Hello, could you confirm tomorrow’s meeting?',
    voiceLang: 'en-US'
  },
  {
    id: 'bn-hi',
    label: 'Bengali ➔ Hindi',
    source: 'Bengali',
    target: 'Hindi',
    sampleInput: 'নমস্কার, আপনি কেমন আছেন?',
    sampleOutput: 'नमस्ते, आप कैसे हैं?',
    voiceLang: 'hi-IN'
  }
];

export const LiveDemoWidget: React.FC<{ initialPair?: string }> = ({ initialPair = 'hi-en' }) => {
  const navigate = useNavigate();
  const [selectedPair, setSelectedPair] = useState<LanguagePair>(
    PRESET_PAIRS.find(p => p.id === initialPair) || PRESET_PAIRS[0]
  );
  const [inputText, setInputText] = useState(selectedPair.sampleInput);
  const [outputText, setOutputText] = useState(selectedPair.sampleOutput);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handlePairChange = (pair: LanguagePair) => {
    setSelectedPair(pair);
    setInputText(pair.sampleInput);
    setOutputText(pair.sampleOutput);
  };

  const handleTranslate = () => {
    setIsTranslating(true);
    setTimeout(() => {
      setIsTranslating(false);
      setOutputText(selectedPair.sampleOutput);
    }, 400);
  };

  const playVoiceAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(outputText);
      utterance.lang = selectedPair.voiceLang;
      utterance.rate = 0.95;
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto my-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-slate-100 font-sans">
      
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Live Voice Translation Demo</span>
          </div>
          <h3 className="text-xl font-extrabold text-white">Experience CHATR AI Translation</h3>
          <p className="text-xs text-slate-400">Test real-time language conversion across Indian regional languages.</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
          <ShieldCheck className="w-4 h-4" />
          <span>Zero Lag • WebRTC</span>
        </div>
      </div>

      {/* Language Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-5 scrollbar-none">
        {PRESET_PAIRS.map((pair) => (
          <button
            key={pair.id}
            onClick={() => handlePairChange(pair)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              selectedPair.id === pair.id
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            {pair.label}
          </button>
        ))}
      </div>

      {/* Translation Panels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        
        {/* Source Box */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
            <span>{selectedPair.source} (Original)</span>
            <span className="text-[10px] text-emerald-500 font-mono">Input</span>
          </div>
          <textarea
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
          />
          <div className="flex justify-end pt-2">
            <button
              onClick={handleTranslate}
              disabled={isTranslating}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTranslating ? 'animate-spin' : ''}`} />
              <span>Translate</span>
            </button>
          </div>
        </div>

        {/* Target Translated Box */}
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between relative">
          <div className="flex items-center justify-between text-xs text-emerald-400 mb-2 font-medium">
            <span>{selectedPair.target} (Real-time Speech)</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">Live</span>
          </div>
          <p className="text-sm text-white font-medium leading-relaxed my-1">
            {outputText}
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-emerald-500/10 mt-2">
            <button
              onClick={playVoiceAudio}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
                isPlayingAudio 
                  ? 'bg-emerald-500 text-slate-950 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{isPlayingAudio ? 'Speaking...' : 'Listen Audio'}</span>
            </button>
            <span className="text-[10px] text-slate-400">Web Speech Engine</span>
          </div>
        </div>

      </div>

      {/* Viral Conversion Action Banner */}
      <div className="bg-gradient-to-r from-emerald-900/60 via-teal-900/40 to-slate-900 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5 mb-1">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Use Real-Time Voice Translation on Calls</span>
          </h4>
          <p className="text-xs text-slate-300">
            Start a 1-click encrypted call with anyone. Both participants can speak in their native language.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => navigate('/call/live-translate-demo')}
            className="flex-1 sm:flex-initial whitespace-nowrap px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Try Free Call</span>
          </button>
          <button
            onClick={() => navigate('/auth?ref=demo_claim')}
            className="flex-1 sm:flex-initial whitespace-nowrap px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition"
          >
            <span>Claim 100 Coins</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
};

export default LiveDemoWidget;
