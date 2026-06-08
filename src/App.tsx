import { useState } from 'react';
import { Volume2, VolumeX, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import ResumeBuilderDeck from './components/ResumeBuilderDeck';

export default function App() {
  const [muted, setMuted] = useState(false);

  return (
    <div className="min-h-screen bg-[#050505] text-[#f8fafc] relative overflow-x-hidden selection:bg-[#38bdf8]/20">
      {/* Ambient background grid lines / layout spots */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370a_1px,transparent_1px),linear-gradient(to_bottom,#1f29370a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[50%] bg-[#38bdf8]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#38bdf8]/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10 flex flex-col min-h-screen">
        
        {/* Elegant Top Header / Navigation styled as Bento Row */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#222222] pb-6 mb-10 text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#111111] rounded-[14px] border border-[#222222] hover:border-[#38bdf8] transition-colors duration-300">
              <Sparkles className="w-6 h-6 text-[#38bdf8]" />
            </div>
            <div>
              <h1 className="text-xl font-bold uppercase tracking-[0.15em] text-white flex items-center gap-2">
                Resume Optimizer
                <span className="text-[10px] tracking-normal uppercase bg-[#38bdf8]/10 ml-1 hover:bg-[#38bdf8]/20 text-[#38bdf8] font-mono px-2.5 py-0.5 rounded-full border border-[#38bdf8]/20 transition-all">
                  DEPLOY BUILD v4.2
                </span>
              </h1>
              <p className="text-xs text-[#64748b] mt-0.5">System Status: Optimal • Last updated 1m ago</p>
            </div>
          </div>

          {/* Sound Controls / Badges */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="px-3 py-1.5 bg-[#111111] border border-[#222222] rounded-[8px] text-[11px] font-semibold text-[#64748b] tracking-wider uppercase">
              REGION: PREMIUM-AI
            </div>
            <button
              onClick={() => setMuted(!muted)}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-[#111111] hover:bg-[#111111] border border-[#222222] hover:border-[#38bdf8] rounded-[8px] text-xs text-white/75 transition-all text-center cursor-pointer"
              title={muted ? "Unmute Sounds" : "Mute Sounds"}
            >
              {muted ? (
                <>
                  <VolumeX className="w-4 h-4 text-red-400" />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-red-500">Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-[#38bdf8]" />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#38bdf8]">Audio ON</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Feature info banner / Introduction designed as Modular Bento Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 text-left">
          
          <div className="bg-[#111111] border border-[#222222] rounded-[20px] p-6 flex flex-col justify-between transition-all duration-300 hover:border-[#38bdf8] group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#38bdf8]/[0.02] rounded-full blur-xl group-hover:bg-[#38bdf8]/[0.05] transition-all" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#38bdf8]/5 rounded-[12px] border border-[#38bdf8]/10 group-hover:border-[#38bdf8]/30 transition-colors shrink-0">
                <CheckCircle2 className="w-5 h-5 text-[#38bdf8]" />
              </div>
              <span className="text-[11px] uppercase tracking-[0.1em] text-[#64748b] font-semibold">01 / Assessment</span>
            </div>
            <div>
              <h4 className="text-base font-bold text-white mb-2">Compliance Scoring</h4>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Parse target role requirements, calculate key metric coverage instantly, and build visual alignment gauges.
              </p>
            </div>
          </div>

          <div className="bg-[#111111] border border-[#222222] rounded-[20px] p-6 flex flex-col justify-between transition-all duration-300 hover:border-[#38bdf8] group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#38bdf8]/[0.02] rounded-full blur-xl group-hover:bg-[#38bdf8]/[0.05] transition-all" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#38bdf8]/5 rounded-[12px] border border-[#38bdf8]/10 group-hover:border-[#38bdf8]/30 transition-colors shrink-0">
                <FileText className="w-5 h-5 text-[#38bdf8]" />
              </div>
              <span className="text-[11px] uppercase tracking-[0.1em] text-[#64748b] font-semibold">02 / Integrity</span>
            </div>
            <div>
              <h4 className="text-base font-bold text-white mb-2">Structure Preservation</h4>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Preserve contact info, employer sequences, and project schedules meticulously while rewriting bullet points under strict criteria.
              </p>
            </div>
          </div>

          <div className="bg-[#111111] border border-[#222222] rounded-[20px] p-6 flex flex-col justify-between transition-all duration-300 hover:border-[#38bdf8] group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#38bdf8]/[0.02] rounded-full blur-xl group-hover:bg-[#38bdf8]/[0.05] transition-all" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#38bdf8]/5 rounded-[12px] border border-[#38bdf8]/10 group-hover:border-[#38bdf8]/30 transition-colors shrink-0">
                <Sparkles className="w-5 h-5 text-[#38bdf8]" />
              </div>
              <span className="text-[11px] uppercase tracking-[0.1em] text-[#64748b] font-semibold">03 / Infusion</span>
            </div>
            <div>
              <h4 className="text-base font-bold text-white mb-2">High-Value Tailoring</h4>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Seamlessly inject keywords from uploaded spreadsheets alongside job description vocabulary for professional resume alignment.
              </p>
            </div>
          </div>

        </div>

        {/* Deck Card UI Component Hosting */}
        <main className="flex-1 flex flex-col justify-center items-center">
          <ResumeBuilderDeck muted={muted} />
        </main>

        {/* Humid Footer Credits */}
        <footer className="mt-14 pt-6 border-t border-[#222222] flex flex-col sm:flex-row items-center justify-between text-[#64748b] text-[10px] tracking-wider uppercase font-mono">
          <span>Enterprise Resume Matching Engine</span>
          <span className="mt-2 sm:mt-0">Refined Compliance Standard • Active</span>
        </footer>

      </div>
    </div>
  );
}
