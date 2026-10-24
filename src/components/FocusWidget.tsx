import React from 'react';
import { useStudy } from '../context/StudyContext';
import { Play, Pause, RotateCcw, Volume2, VolumeX, CloudRain, Wind, Radio, Sparkles } from 'lucide-react';

export const FocusWidget: React.FC = () => {
  const {
    pomodoroSeconds,
    pomodoroRunning,
    togglePomodoro,
    resetPomodoro,
    ambienceSound,
    setAmbienceSound,
    pomodoroOpen,
    setPomodoroOpen,
  } = useStudy();

  const minutes = Math.floor(pomodoroSeconds / 60);
  const seconds = pomodoroSeconds % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const ambienceOptions = [
    { id: null, label: 'Mute', icon: VolumeX },
    { id: 'rain', label: 'Rain', icon: CloudRain },
    { id: 'whitenoise', label: 'White Noise', icon: Wind },
    { id: 'focus', label: 'Alpha Waves', icon: Radio },
  ];

  if (!pomodoroOpen) return null;

  return (
    <div className="fixed bottom-20 right-6 z-40 w-80 rounded-2xl border border-[oklch(27%_0.03_264)] bg-[oklch(17.5%_0.025_264)]/95 backdrop-blur-xl p-5 shadow-2xl animate-in slide-in-from-bottom-5">
      <div className="flex items-center justify-between pb-3 border-b border-[oklch(27%_0.03_264)]">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-sm font-bold text-white">Pomodoro Focus Timer</h3>
        </div>
        <button
          onClick={() => setPomodoroOpen(false)}
          className="text-xs text-slate-400 hover:text-white"
        >
          Hide
        </button>
      </div>

      {/* Clock display */}
      <div className="py-5 text-center">
        <div className="font-mono text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_0_20px_rgba(124,92,250,0.5)]">
          {timeString}
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {pomodoroRunning ? 'Deep Focus Session in progress...' : 'Paused · Ready when you are'}
        </p>

        {/* Controls */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={togglePomodoro}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-purple-500/30 hover:scale-105 transition-all"
          >
            {pomodoroRunning ? (
              <>
                <Pause className="h-4 w-4" /> Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> Start Focus
              </>
            )}
          </button>
          <button
            onClick={() => resetPomodoro(25)}
            className="rounded-full border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
            title="Reset to 25m"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Preset quick buttons */}
        <div className="mt-3 flex justify-center gap-1.5">
          <button
            onClick={() => resetPomodoro(15)}
            className="px-2 py-0.5 rounded text-[0.65rem] border border-slate-700 hover:border-purple-400 text-slate-400"
          >
            15m
          </button>
          <button
            onClick={() => resetPomodoro(25)}
            className="px-2 py-0.5 rounded text-[0.65rem] border border-purple-500/50 bg-purple-500/10 text-purple-300 font-semibold"
          >
            25m Focus
          </button>
          <button
            onClick={() => resetPomodoro(45)}
            className="px-2 py-0.5 rounded text-[0.65rem] border border-slate-700 hover:border-purple-400 text-slate-400"
          >
            45m Sprint
          </button>
          <button
            onClick={() => resetPomodoro(5)}
            className="px-2 py-0.5 rounded text-[0.65rem] border border-slate-700 hover:border-purple-400 text-slate-400"
          >
            5m Break
          </button>
        </div>
      </div>

      {/* Ambience audio */}
      <div className="pt-3 border-t border-[oklch(27%_0.03_264)]">
        <label className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
          <Volume2 className="h-3.5 w-3.5 text-purple-400" /> Study Ambience Sounds
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {ambienceOptions.map((opt) => {
            const Icon = opt.icon;
            const active = ambienceSound === opt.id;
            return (
              <button
                key={opt.label}
                onClick={() => setAmbienceSound(opt.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[0.68rem] transition-all ${
                  active
                    ? 'border-purple-500 bg-purple-500/20 text-white font-bold'
                    : 'border-[oklch(27%_0.03_264)] bg-[oklch(14%_0.02_264)] text-slate-400 hover:border-slate-600'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 mb-1 ${active ? 'text-purple-400' : 'text-slate-400'}`} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
