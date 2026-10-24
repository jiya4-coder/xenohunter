import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  ArrowUp,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  RotateCcw,
  History,
  Clock,
  Star,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  MessageSquare,
  Send,
} from 'lucide-react';
import { ChatMessage } from '../types';
import { safeFetchJson } from '../utils/api';

interface StudyChatProps {
  mode: 'tutor' | 'ncert' | 'practice' | 'revision' | 'summarize' | 'planner';
  title: string;
  subtitle: string;
  placeholder: string;
  suggestions: string[];
  multiline?: boolean;
}

export const StudyChat: React.FC<StudyChatProps> = ({
  mode,
  title,
  subtitle,
  placeholder,
  suggestions,
  multiline = false,
}) => {
  const {
    profile,
    addStudyMinutes,
    addQuestionAttempt,
    aiEngine,
    setAiEngine,
    promptHistory,
    addPromptHistory,
    toggleStarPrompt,
    removePromptHistory,
    clearPromptHistory,
  } = useStudy();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  // History Drawer & Filter State
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'starred' | 'current'>('all');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Voice recognition setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = profile.language === 'Hindi' ? 'hi-IN' : 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [profile.language]);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSend = async (textToSend?: string) => {
    const content = textToSend || input;
    if (!content.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const fallbackReply = `## 💡 Concept Overview (${profile.classLevel})\n\nHere is your step-by-step breakdown for **${content}**:\n\n1. **Core Concept**: Understand this fundamental principle in simple words.\n2. **Step-by-Step Logic**: Identify given values and formula to apply.\n3. **Exam Tip**: Remember units and key terms for full marks!\n\n*Would you like me to quiz you on this?*`;

      const data = await safeFetchJson<{ reply: string }>(
        '/api/study-assistant',
        {
          method: 'POST',
          body: JSON.stringify({
            mode,
            prompt: content.trim(),
            studentProfile: profile,
            history: messages.map((m) => ({ role: m.role, content: m.content })),
            aiEngine,
          }),
        },
        { reply: fallbackReply }
      );

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode,
        learningAids: [
          '💡 Explain simpler',
          '🍎 Give a real-world analogy',
          '📐 Draw a diagram / layout',
          '📝 Quiz me on this',
          '⚡ Formula cheat-sheet',
        ],
      };

      const finalReply = data.reply || fallbackReply;
      setMessages((prev) => [...prev, botMsg]);
      addStudyMinutes(3);
      if (mode === 'practice') {
        addQuestionAttempt(true);
      }
      addPromptHistory({
        prompt: content.trim(),
        fullResponse: finalReply,
        responsePreview: finalReply.replace(/[#*`_~]/g, '').slice(0, 140) + '...',
        mode,
        subject: profile.primaryExam || 'General',
      });
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Note: ${err.message || 'Connecting to study assistant...'}\n\nHere is a quick concept breakdown for **${content}**:\n\n- **Definition**: Fundamental rule applicable in your syllabus.\n- **Step-by-step explanation**: Break the problem down into given information, formulas, and units.\n- **Learning tip**: Always cross-check the units in your final answer!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
      addPromptHistory({
        prompt: content.trim(),
        fullResponse: errorMsg.content,
        responsePreview: errorMsg.content.replace(/[#*`_~]/g, '').slice(0, 140) + '...',
        mode,
        subject: profile.primaryExam || 'General',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = useMemo(() => {
    return promptHistory.filter((item) => {
      const matchesSearch =
        !historySearch.trim() ||
        item.prompt.toLowerCase().includes(historySearch.toLowerCase()) ||
        (item.responsePreview && item.responsePreview.toLowerCase().includes(historySearch.toLowerCase())) ||
        (item.fullResponse && item.fullResponse.toLowerCase().includes(historySearch.toLowerCase()));

      if (!matchesSearch) return false;

      if (historyFilter === 'starred') return !!item.starred;
      if (historyFilter === 'current') return item.mode === mode;
      return true;
    });
  }, [promptHistory, historySearch, historyFilter, mode]);

  const starredCount = useMemo(() => {
    return promptHistory.filter((p) => p.starred).length;
  }, [promptHistory]);

  const recentPrompts = useMemo(() => {
    return promptHistory.slice(0, 4);
  }, [promptHistory]);

  const handleUsePrompt = (promptText: string, autoSend: boolean = false) => {
    if (autoSend) {
      handleSend(promptText);
      setHistoryDrawerOpen(false);
    } else {
      setInput(promptText);
      setHistoryDrawerOpen(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSpeak = (text: string, id: string) => {
    if ('speechSynthesis' in window) {
      if (speakingId === id) {
        window.speechSynthesis.cancel();
        setSpeakingId(null);
        return;
      }
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[#*`_~]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAidClick = (aid: string) => {
    let prompt = '';
    if (aid.includes('simpler')) {
      prompt = 'Explain this in simpler words with an intuitive, everyday example for my grade.';
    } else if (aid.includes('analogy')) {
      prompt = 'Give me a fun, relatable real-world analogy to remember this concept forever.';
    } else if (aid.includes('diagram')) {
      prompt = 'Draw a clear text/ASCII diagram or visual breakdown illustrating how this works step-by-step.';
    } else if (aid.includes('Quiz me') || aid.includes('Test me')) {
      prompt = 'Give me 1 quick practice problem on this topic with 4 multiple-choice options to test my grasp.';
    } else if (aid.includes('Formula')) {
      prompt = 'List the key formulas, units, and constants related to this topic in a neat table.';
    }
    if (prompt) {
      handleSend(prompt);
    }
  };

  const renderFormattedMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="mt-3 mb-1 text-base font-bold text-[#38bdf8]">
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h3 key={idx} className="mt-4 mb-2 text-lg font-bold text-white border-b border-white/10 pb-1">
            {line.replace('## ', '')}
          </h3>
        );
      }
      if (line.startsWith('# ')) {
        return (
          <h2 key={idx} className="mt-4 mb-2 text-xl font-extrabold text-white">
            {line.replace('# ', '')}
          </h2>
        );
      }
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const bulletText = line.trim().substring(2);
        return (
          <li key={idx} className="ml-4 list-disc text-sm text-slate-200 my-0.5">
            {formatInlineText(bulletText)}
          </li>
        );
      }
      if (/^\d+\.\s/.test(line.trim())) {
        return (
          <div key={idx} className="ml-2 text-sm text-slate-200 my-1 font-medium">
            {formatInlineText(line)}
          </div>
        );
      }
      if (line.trim().startsWith('```')) {
        return null;
      }
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }
      return (
        <p key={idx} className="text-sm text-slate-200 leading-relaxed my-1">
          {formatInlineText(line)}
        </p>
      );
    });
  };

  const formatInlineText = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="rounded bg-blue-950/60 px-1.5 py-0.5 font-mono text-xs text-blue-300 border border-blue-800/40">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  // Default suggested chips matching the screenshot
  const defaultIdeas = [
    ["Explain Newton's 3 laws", "What is a derivative?", "Causes of World War I"],
    ["How do vaccines work?"],
  ];

  return (
    <div className="relative flex h-[calc(100vh-2.5rem)] flex-col bg-[#07090e] font-['Sora'] select-none">
      {/* 1. Header matching Screenshot */}
      <div className="border-b border-white/10 px-6 py-4 md:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
            <p className="mt-0.5 text-xs md:text-sm text-slate-400">{subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHistoryDrawerOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-600/15 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-600/25 hover:border-blue-400 transition-all shadow-sm"
              title="View previous questions and responses"
            >
              <History className="h-3.5 w-3.5 text-blue-400" />
              <span>Prompt History</span>
              {promptHistory.length > 0 && (
                <span className="rounded-full bg-blue-500/30 px-1.5 py-0.2 text-[0.68rem] text-blue-200">
                  {promptHistory.length}
                </span>
              )}
            </button>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0e1426] px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:border-white/20 transition-all"
                title="Clear conversation"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Messages / Center Hero Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {messages.length === 0 ? (
          /* Empty State matching Screenshot 3 */
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center pb-20">
            {/* Centered Glowing Blue Robot Card */}
            <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-[#2563eb] text-white shadow-[0_0_50px_rgba(37,99,235,0.45)] mb-6 transition-transform hover:scale-105">
              <Bot className="h-12 w-12" />
            </div>

            {/* Greeting Pill */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0e1426] px-5 py-2 text-xs md:text-sm text-slate-200 shadow-md">
              <span>👋 Hi! I'm <strong>StudyBot</strong>. Tap an idea below or ask me anything!</span>
            </div>

            {/* Idea Pills (matching exact screenshot layout) */}
            <div className="space-y-2.5 w-full max-w-lg">
              {/* Row 1 */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {defaultIdeas[0].map((idea, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(idea)}
                    className="rounded-full border border-white/10 bg-[#0d1326] px-4 py-2 text-xs font-medium text-slate-200 hover:border-blue-500/60 hover:bg-[#121c38] hover:text-white transition-all shadow-sm"
                  >
                    {idea}
                  </button>
                ))}
              </div>

              {/* Row 2 */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {defaultIdeas[1].map((idea, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(idea)}
                    className="rounded-full border border-white/10 bg-[#0d1326] px-4 py-2 text-xs font-medium text-slate-200 hover:border-blue-500/60 hover:bg-[#121c38] hover:text-white transition-all shadow-sm"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Active Chat Thread */
          <div className="mx-auto max-w-3xl space-y-6 pb-28">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#2563eb] text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`relative max-w-[85%] rounded-2xl p-4 md:p-5 shadow-md ${
                    msg.role === 'user'
                      ? 'bg-[#1e3a8a] text-white rounded-tr-none border border-blue-500/40'
                      : 'border border-white/10 bg-[#0d1326] rounded-tl-none'
                  }`}
                >
                  <div className="flex items-center justify-between text-[0.65rem] text-slate-400 mb-2">
                    <span className="font-bold text-slate-300">
                      {msg.role === 'user' ? profile.name : 'StudyBot AI'}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div className="prose-study text-sm leading-relaxed">
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      renderFormattedMarkdown(msg.content)
                    )}
                  </div>

                  {/* Assistant Actions & Learning Aids */}
                  {msg.role === 'assistant' && (
                    <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="flex items-center gap-1 text-[0.7rem] text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" /> Copy
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSpeak(msg.content, msg.id)}
                          className="flex items-center gap-1 text-[0.7rem] text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          {speakingId === msg.id ? (
                            <>
                              <VolumeX className="h-3 w-3 text-blue-400 animate-pulse" /> Stop Voice
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-3 w-3" /> Read Aloud
                            </>
                          )}
                        </button>
                      </div>

                      {/* Learning Aids */}
                      {msg.learningAids && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {msg.learningAids.map((aid, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleAidClick(aid)}
                              className="text-[0.68rem] font-semibold px-2.5 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:border-blue-400 transition-all"
                            >
                              {aid}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3.5 items-center">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#2563eb] text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0d1326] p-4 flex items-center gap-2">
                  <div className="flex space-x-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">StudyBot is formulating explanation...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 3. Bottom Bar Input Box (matching exact screenshot layout) */}
      <div className="absolute inset-x-0 bottom-4 px-4 md:px-8">
        <div className="mx-auto max-w-3xl">
          {/* Quick Recent Prompts Bar */}
          {recentPrompts.length > 0 && (
            <div className="mb-2 flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-xs">
              <div className="flex items-center gap-1 shrink-0 text-[0.7rem] font-bold text-slate-400 pl-1">
                <Clock className="h-3 w-3 text-blue-400" />
                <span>Recent:</span>
              </div>
              {recentPrompts.map((hist) => (
                <button
                  key={hist.id}
                  type="button"
                  onClick={() => handleUsePrompt(hist.prompt, true)}
                  className="shrink-0 max-w-[210px] truncate rounded-full border border-white/10 bg-[#0d1428]/90 px-3 py-1 text-[0.7rem] text-slate-300 hover:border-blue-500/50 hover:bg-[#131f40] hover:text-white transition-all shadow-sm"
                  title={`Click to ask again: "${hist.prompt}"`}
                >
                  "{hist.prompt}"
                </button>
              ))}
              <button
                type="button"
                onClick={() => setHistoryDrawerOpen(true)}
                className="shrink-0 text-[0.7rem] font-bold text-blue-400 hover:text-blue-300 hover:underline px-1.5"
              >
                All History ({promptHistory.length}) →
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center rounded-2xl border border-blue-500/50 bg-[#070b16] px-4 py-2.5 shadow-[0_4px_30px_rgba(0,0,0,0.8)] focus-within:border-blue-400 transition-all"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question... e.g. How does photosynthesis work?"
              className="flex-1 bg-transparent py-1.5 text-xs md:text-sm text-white placeholder:text-slate-500 focus:outline-none"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`p-1.5 rounded-lg transition-colors ${
                  isListening
                    ? 'bg-rose-500/20 text-rose-400 animate-pulse'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Voice input"
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563eb] text-white shadow-md hover:bg-[#1d4ed8] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Send"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 4. Slide-over Prompt History Drawer */}
      {historyDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setHistoryDrawerOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative z-50 flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#080d1c] p-6 shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Prompt History
                    <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-xs text-blue-300 font-semibold">
                      {promptHistory.length}
                    </span>
                  </h2>
                  <p className="text-[0.72rem] text-slate-400">Review, re-ask, or copy your past AI Tutor prompts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryDrawerOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                title="Close history"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search and Filters */}
            <div className="py-4 space-y-3">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search previous questions..."
                  className="w-full rounded-xl border border-white/10 bg-[#050813] pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
                {historySearch && (
                  <button
                    type="button"
                    onClick={() => setHistorySearch('')}
                    className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter tabs */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('all')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      historyFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-[#10172e] text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({promptHistory.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('starred')}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      historyFilter === 'starred'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-[#10172e] text-slate-400 hover:text-amber-300'
                    }`}
                  >
                    <Star className="h-3 w-3 fill-current" />
                    <span>Starred ({starredCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('current')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      historyFilter === 'current'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-[#10172e] text-slate-400 hover:text-white'
                    }`}
                  >
                    Current Mode
                  </button>
                </div>

                {promptHistory.length > 0 && (
                  <div>
                    {confirmClearHistory ? (
                      <div className="flex items-center gap-1 text-[0.68rem]">
                        <span className="text-rose-400">Clear all?</span>
                        <button
                          type="button"
                          onClick={() => {
                            clearPromptHistory();
                            setConfirmClearHistory(false);
                          }}
                          className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold hover:bg-rose-700"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClearHistory(false)}
                          className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmClearHistory(true)}
                        className="text-[0.68rem] text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" /> Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-slate-500 mb-3">
                    <Clock className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-300">
                    {historySearch ? 'No matching prompts found' : 'No prompt history yet'}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-xs leading-relaxed">
                    {historySearch
                      ? 'Try searching with different keywords.'
                      : 'As you ask questions to StudyBot, they will be automatically saved here so you can review and practice them anytime!'}
                  </p>
                </div>
              ) : (
                filteredHistory.map((item) => {
                  const isExpanded = expandedHistoryId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="group rounded-2xl border border-white/10 bg-[#0d1428] p-4 transition-all hover:border-blue-500/40 hover:bg-[#111933]"
                    >
                      {/* Top meta row */}
                      <div className="flex items-center justify-between text-[0.68rem] text-slate-400 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 font-bold text-blue-300 uppercase tracking-wide">
                            {item.mode}
                          </span>
                          <span>{item.timestamp}</span>
                          {item.date && <span>· {item.date}</span>}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleStarPrompt(item.id)}
                            className={`p-1 rounded transition-colors ${
                              item.starred ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'
                            }`}
                            title={item.starred ? 'Starred prompt' : 'Star this prompt'}
                          >
                            <Star className={`h-3.5 w-3.5 ${item.starred ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removePromptHistory(item.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                            title="Delete this prompt"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Prompt Question */}
                      <div className="text-xs md:text-sm font-bold text-white leading-snug">
                        "{item.prompt}"
                      </div>

                      {/* Preview / Answer Accordion */}
                      {item.fullResponse && (
                        <div className="mt-2.5">
                          <button
                            type="button"
                            onClick={() => setExpandedHistoryId(isExpanded ? null : item.id)}
                            className="flex items-center gap-1 text-[0.7rem] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <span>{isExpanded ? 'Hide explanation' : 'View explanation / solution'}</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="mt-2.5 rounded-xl border border-white/10 bg-[#070b16] p-3 text-xs text-slate-300 max-h-60 overflow-y-auto space-y-2">
                              <div className="prose-study text-xs leading-relaxed">
                                {renderFormattedMarkdown(item.fullResponse)}
                              </div>

                              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                                <button
                                  type="button"
                                  onClick={() => handleCopy(item.fullResponse!, item.id)}
                                  className="flex items-center gap-1 text-[0.68rem] text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5 transition-colors"
                                >
                                  {copiedId === item.id ? (
                                    <>
                                      <Check className="h-3 w-3 text-emerald-400" /> Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3" /> Copy Answer
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSpeak(item.fullResponse!, item.id)}
                                  className="flex items-center gap-1 text-[0.68rem] text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5 transition-colors"
                                >
                                  {speakingId === item.id ? (
                                    <>
                                      <VolumeX className="h-3 w-3 text-blue-400 animate-pulse" /> Stop Voice
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 className="h-3 w-3" /> Read Aloud
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/5 pt-2.5">
                        <button
                          type="button"
                          onClick={() => handleUsePrompt(item.prompt, false)}
                          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[0.68rem] font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                        >
                          Insert in input
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUsePrompt(item.prompt, true)}
                          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-[0.68rem] font-bold text-white hover:bg-blue-500 shadow-sm transition-all"
                        >
                          <Send className="h-2.5 w-2.5" />
                          <span>Ask Again ↗</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit with Lovable badge in bottom right (matching screenshot) */}
      <div className="fixed bottom-3 right-3 flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#161616] px-2.5 py-1 text-[0.7rem] text-slate-400 z-10">
        <span>Edit with</span>
        <span className="font-bold text-white flex items-center gap-0.5">❤️ Lovable</span>
        <span className="text-slate-500 text-xs ml-1 cursor-pointer">✕</span>
      </div>
    </div>
  );
};
