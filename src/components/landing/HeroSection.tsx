import React from 'react';
import { ArrowRight, Play, Check, Search, Sparkles, MessageSquare, PhoneCall, ShieldCheck, HeartPulse, Globe2, Compass, MoreHorizontal, Send, Paperclip } from 'lucide-react';

interface HeroSectionProps {
  onOpenAuth: () => void;
  onOpenVideo: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenAuth, onOpenVideo }) => {
  return (
    <section className="relative overflow-hidden pt-10 sm:pt-14 pb-16 lg:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* LEFT COLUMN: Editorial Typography & Consumer Value Proposition */}
          <div className="lg:col-span-6 space-y-7 z-10">
            
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-[#53605C]">
              <span className="w-6 h-[1.5px] bg-[#164E3F]" />
              <span>THE PERSONAL INTELLIGENCE SUPER APP</span>
            </div>

            {/* Giant Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#111817] leading-[1.08]">
              Your Life.<br />
              Our Intelligence.<br />
              <span className="text-[#164E3F] drop-shadow-sm">Zero Noise.</span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-base sm:text-lg text-[#53605C] leading-relaxed max-w-xl">
              CHATR connects you to family, friends, local services, and personal SI agents. Direct chat without saving numbers, translate live voice calls in 40+ languages, shield against spam, and access health & life tools in one private app.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onOpenAuth}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#164E3F] hover:bg-[#2E6B59] text-white text-sm sm:text-base font-semibold shadow-md hover:shadow-lg transition-all transform active:scale-[0.99] cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenVideo}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white hover:bg-[#F8F8F5] text-[#111817] border border-[#DDE3DF] text-sm sm:text-base font-medium shadow-sm hover:border-[#164E3F]/40 transition-all cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-[#E8F0EB] flex items-center justify-center text-[#164E3F]">
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </div>
                <span>Watch CHATR in action</span>
              </button>
            </div>

            {/* Trust Checklist */}
            <div className="pt-4 border-t border-[#DDE3DF]/60 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm font-medium text-[#53605C]">
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#164E3F] stroke-[2.5]" />
                <span>Private by design</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#164E3F] stroke-[2.5]" />
                <span>Direct chat (no saved #)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#164E3F] stroke-[2.5]" />
                <span>Live call translation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#164E3F] stroke-[2.5]" />
                <span>Free for real life</span>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Realistic Editorial Workspace Composition with Laptop & Mobile UI */}
          <div className="lg:col-span-6 relative">
            
            {/* Top Floating Editorial Badge */}
            <div className="absolute -top-6 right-4 sm:right-10 z-20 hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-[#164E3F] text-white text-xs font-semibold shadow-md border border-[#2E6B59]/40">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              <span className="text-white font-semibold">Smart Messaging • Free Calling • Personal SI</span>
            </div>

            {/* Handwritten-Style Script Annotation with Curving Arrow */}
            <div className="absolute -top-12 left-6 sm:left-12 z-20 hidden md:block">
              <div className="font-serif italic text-sm text-[#2E6B59] leading-tight flex flex-col items-center">
                <span>More than chat.</span>
                <span>A smarter way to live.</span>
                <svg className="w-8 h-8 text-[#2E6B59] -mt-1 stroke-current fill-none" viewBox="0 0 24 24">
                  <path d="M7 3C12 7 14 14 17 21M17 21L12 17M17 21L21 16" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Main Stage Card Container with Subtle Shadow */}
            <div className="relative rounded-3xl bg-white p-3 sm:p-5 border border-[#DDE3DF] shadow-xl shadow-stone-300/40 overflow-hidden">
              
              {/* Natural Background Layer */}
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#F2F4F2] to-[#E9ECE8] p-3 sm:p-4 border border-[#DDE3DF]/60">
                
                {/* 1. Laptop Frame Mockup (Actual CHATR Consumer App) */}
                <div className="relative rounded-xl bg-[#111817] p-2 shadow-2xl border border-stone-800">
                  
                  {/* Laptop Top Bezel */}
                  <div className="flex items-center justify-between px-2 pb-1.5 text-[10px] text-stone-400">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500/80" />
                      <span className="w-2 h-2 rounded-full bg-yellow-500/80" />
                      <span className="w-2 h-2 rounded-full bg-green-500/80" />
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-stone-700 mx-auto" />
                    <span className="text-[9px] text-stone-500">chatr.chat</span>
                  </div>

                  {/* Inside Laptop Screen */}
                  <div className="bg-[#FAF9F6] rounded-lg p-3 sm:p-4 text-[#111817] shadow-inner space-y-3 font-sans">
                    
                    {/* Top App Bar */}
                    <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                      <div className="flex items-center">
                        <img 
                          src="/images/chatr-official-logo.png" 
                          alt="CHATR" 
                          className="h-4 sm:h-5 w-auto object-contain"
                        />
                      </div>
                      
                      {/* Search Bar */}
                      <div className="flex-1 max-w-[220px] mx-3">
                        <div className="relative flex items-center bg-white border border-stone-200 rounded-full px-2.5 py-1 text-[11px] text-stone-500">
                          <Search className="w-3 h-3 text-stone-400 mr-1.5 shrink-0" />
                          <span className="truncate">Direct chat, translation, or health...</span>
                        </div>
                      </div>

                      {/* Avatar */}
                      <div className="w-6 h-6 rounded-full bg-[#164E3F] text-white text-[10px] font-bold flex items-center justify-center">
                        AR
                      </div>
                    </div>

                    {/* Greeting & Headline */}
                    <div className="pt-1">
                      <h3 className="text-base sm:text-lg font-bold text-[#111817] tracking-tight">
                        Good morning, Arshid 👋
                      </h3>
                      <p className="text-[11px] text-[#53605C]">
                        What would you like to do today?
                      </p>
                    </div>

                    {/* Quick Consumer Action Tiles */}
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      <div className="bg-white p-2 rounded-xl border border-stone-200 text-center hover:border-[#164E3F] transition-all cursor-pointer shadow-xs">
                        <div className="w-7 h-7 mx-auto rounded-lg bg-[#E8F0EB] text-[#164E3F] flex items-center justify-center mb-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-[10px] font-semibold text-[#111817] truncate">Direct Chat</div>
                      </div>

                      <div className="bg-white p-2 rounded-xl border border-stone-200 text-center hover:border-[#164E3F] transition-all cursor-pointer shadow-xs">
                        <div className="w-7 h-7 mx-auto rounded-lg bg-[#E8F0EB] text-[#164E3F] flex items-center justify-center mb-1">
                          <Globe2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-[10px] font-semibold text-[#111817] truncate">Translate Call</div>
                      </div>

                      <div className="bg-white p-2 rounded-xl border border-stone-200 text-center hover:border-[#164E3F] transition-all cursor-pointer shadow-xs">
                        <div className="w-7 h-7 mx-auto rounded-lg bg-[#E8F0EB] text-[#164E3F] flex items-center justify-center mb-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-[10px] font-semibold text-[#111817] truncate">Spam Shield</div>
                      </div>

                      <div className="bg-white p-2 rounded-xl border border-stone-200 text-center hover:border-[#164E3F] transition-all cursor-pointer shadow-xs">
                        <div className="w-7 h-7 mx-auto rounded-lg bg-[#E8F0EB] text-[#164E3F] flex items-center justify-center mb-1">
                          <HeartPulse className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-[10px] font-semibold text-[#111817] truncate">Health Hub</div>
                      </div>
                    </div>

                    {/* Interactive Prompt / Input Bar */}
                    <div className="bg-white rounded-xl border border-stone-300 p-2.5 shadow-sm space-y-2">
                      <div className="text-xs text-stone-500 font-normal">
                        Type an intent, enter a phone number or ask personal SI...
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-[10px]">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-medium">+ Action</span>
                          <span className="px-2 py-0.5 rounded-md bg-[#E8F0EB] text-[#164E3F] font-medium"># SI Assistant</span>
                          <Paperclip className="w-3 h-3 text-stone-400" />
                        </div>
                        <button className="w-5 h-5 rounded-full bg-[#164E3F] text-white flex items-center justify-center">
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Intelligent Agent Cards */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <div className="bg-white p-2 rounded-xl border border-stone-200 flex items-center justify-between">
                        <div>
                          <div className="text-[11px] font-semibold text-[#111817]">Live Call Transcribe</div>
                          <div className="text-[9px] text-[#53605C]">Hindi ⇄ English Realtime</div>
                        </div>
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[8px] font-bold">Active</span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-stone-200 flex items-center justify-between">
                        <div>
                          <div className="text-[11px] font-semibold text-[#111817]">AI Call Screen</div>
                          <div className="text-[9px] text-[#53605C]">0 spam calls allowed</div>
                        </div>
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[8px] font-bold">Guarded</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* 2. Floating Mobile Phone UI Mockup (Foreground) */}
                <div className="absolute -bottom-4 right-1 sm:-right-3 w-44 sm:w-52 rounded-2xl bg-[#111817] p-2 shadow-2xl border border-stone-700 transform rotate-1 hover:rotate-0 transition-transform">
                  <div className="bg-[#FAF9F6] rounded-xl p-3 text-[#111817] space-y-2 text-[10px]">
                    <div className="flex items-center justify-between pb-1.5 border-b border-stone-200">
                      <img 
                        src="/images/chatr-official-logo.png" 
                        alt="CHATR" 
                        className="h-3.5 w-auto object-contain"
                      />
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>

                    <div className="bg-[#E8F0EB] p-2 rounded-lg text-[#164E3F] space-y-0.5">
                      <div className="font-bold text-[10px]">Incoming Call Protected</div>
                      <div className="text-[9px] opacity-80">Caller: Courier Delivery (Verified)</div>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-stone-200 space-y-1">
                      <div className="font-semibold text-stone-800">💬 Direct Chat</div>
                      <div className="text-stone-500 text-[9px] truncate">+91 97178 45477 (No contact saved)</div>
                    </div>

                    <button
                      onClick={onOpenAuth}
                      className="w-full py-1.5 rounded-lg bg-[#164E3F] text-white font-semibold text-center text-[10px] shadow-sm cursor-pointer"
                    >
                      Open in App
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
