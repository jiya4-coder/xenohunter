import React from 'react';
import { useStudy } from '../context/StudyContext';
import { X, ExternalLink, RefreshCw, CheckCircle2, ShieldCheck, Sparkles, Globe } from 'lucide-react';

export const LovableModalView: React.FC = () => {
  const { lovableModalOpen, setLovableModalOpen, aiEngine, setAiEngine } = useStudy();

  if (!lovableModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-white/10 bg-[#0d1222] shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#090e1c] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs">
              ❤️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Lovable App Integration</h3>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-400 border border-emerald-500/30">
                  CONNECTED
                </span>
              </div>
              <p className="text-[0.7rem] text-slate-400">
                https://study-buddy-ai-ai.lovable.app
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* AI Engine Switch */}
            <div className="flex items-center rounded-xl border border-white/10 bg-[#161c30] p-1 text-xs">
              <button
                type="button"
                onClick={() => setAiEngine('gemini')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                  aiEngine === 'gemini'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Gemini 3.8 Flash
              </button>
              <button
                type="button"
                onClick={() => setAiEngine('lovable')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                  aiEngine === 'lovable'
                    ? 'bg-pink-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Lovable StudyBot
              </button>
            </div>

            <a
              href="https://study-buddy-ai-ai.lovable.app"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10"
              title="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <button
              onClick={() => setLovableModalOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Live iFrame / Embedded View */}
        <div className="flex-1 bg-black relative">
          <iframe
            src="https://study-buddy-ai-ai.lovable.app"
            title="Lovable StudyBot App"
            className="h-full w-full border-none"
            allow="microphone; clipboard-write;"
          />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#090e1c] px-5 py-2.5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>AI responses are synced between Gemini 3.8 Flash & Lovable backend</span>
          </div>
          <button
            onClick={() => setLovableModalOpen(false)}
            className="rounded-lg bg-blue-600 px-3.5 py-1 text-xs font-bold text-white hover:bg-blue-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
