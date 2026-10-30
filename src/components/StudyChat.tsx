import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useStudy } from '../context/StudyContext';
import {
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
  Send,
  Globe,
  Plus,
  SquarePen,
  Image as ImageIcon,
  PanelLeft,
  Gift,
  RefreshCw,
  BrainCircuit,
} from 'lucide-react';
import { ChatMessage, GroundingSource } from '../types';
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
}) => {
  const {
    profile,
    currentUser,
    setActiveTab,
    addStudyMinutes,
    addQuestionAttempt,
    aiEngine,
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
  const [useGoogleSearch] = useState(false);

  // New UI states matching screenshot
  const [chatSidebarOpen, setChatSidebarOpen] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [thinkMode, setThinkMode] = useState(true);
  const [showSuggestionsPopover, setShowSuggestionsPopover] = useState(false);
  const [activeRecentId, setActiveRecentId] = useState<string | null>(null);
  const [offerBanner, setOfferBanner] = useState<string | null>(null);

  // History Drawer & Filter State
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'starred' | 'current'>('all');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
    const rawContent = (textToSend || input).trim();
    if (!rawContent || loading) return;

    setShowSuggestionsPopover(false);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: rawContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode,
    };

    const botMsgId = (Date.now() + 1).toString();
    const botTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const defaultLearningAids = [
      '💡 Explain simpler',
      '🍎 Give a real-world analogy',
      '📐 Draw a diagram / layout',
      '📝 Quiz me on this',
      '⚡ Formula cheat-sheet',
    ];

    const recentHistory = messages.slice(-4).map((m) => ({ role: m.role, content: m.content }));
    const effectivePrompt = thinkMode
      ? `${rawContent}\n\n(Please provide a clear, well-structured, step-by-step explanation with examples and key takeaways.)`
      : rawContent;

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const fallbackReply = `## 💡 Concept Overview (${profile.classLevel})\n\nHere is your step-by-step breakdown for **${rawContent}**:\n\n1. **Core Concept**: Understand this fundamental principle in simple words.\n2. **Step-by-Step Logic**: Identify given values and formula to apply.\n3. **Exam Tip**: Remember units and key terms for full marks!\n\n*Would you like me to quiz you on this?*`;

    try {
      let finalReply = '';
      let finalSources: GroundingSource[] = [];
      let finalSearchQueries: string[] = [];
      let streamSucceeded = false;

      // 1. Try fast SSE streaming endpoint first for immediate Time-To-First-Token
      try {
        const response = await fetch('/api/study-assistant/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode,
            prompt: effectivePrompt,
            studentProfile: profile,
            history: recentHistory,
            aiEngine,
            useGoogleSearch,
          }),
        });

        if (response.ok && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let insertedBotMsg = false;

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n');
            buffer = events.pop() || '';

            for (const evt of events) {
              const line = evt.trim();
              if (!line.startsWith('data:')) continue;
              const jsonStr = line.replace(/^data:\s*/, '');
              try {
                const payload = JSON.parse(jsonStr);
                if (payload.chunk) {
                  finalReply =
                    payload.done && payload.reply ? payload.reply : finalReply + payload.chunk;
                  streamSucceeded = true;

                  if (!insertedBotMsg) {
                    insertedBotMsg = true;
                    setLoading(false);
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: botMsgId,
                        role: 'assistant',
                        content: finalReply,
                        timestamp: botTimestamp,
                        mode,
                        sources: [],
                        searchQueries: [],
                        grounded: false,
                        learningAids: defaultLearningAids,
                      },
                    ]);
                  } else {
                    const updatedText = finalReply;
                    setMessages((prev) =>
                      prev.map((m) => (m.id === botMsgId ? { ...m, content: updatedText } : m))
                    );
                  }
                }
                if (payload.done) {
                  if (payload.reply) finalReply = payload.reply;
                  if (Array.isArray(payload.sources)) finalSources = payload.sources;
                  if (Array.isArray(payload.searchQueries))
                    finalSearchQueries = payload.searchQueries;
                }
              } catch {
                // Ignore malformed partial SSE chunk
              }
            }
          }

          if (streamSucceeded && finalReply.trim()) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === botMsgId
                  ? {
                      ...m,
                      content: finalReply,
                      sources: finalSources,
                      searchQueries: finalSearchQueries,
                    }
                  : m
              )
            );
          }
        }
      } catch {
        // Fall back to standard JSON endpoint if stream interrupted
      }

      // 2. Fallback to standard JSON endpoint if stream didn't produce output
      if (!streamSucceeded || !finalReply.trim()) {
        const data = await safeFetchJson<{
          reply: string;
          sources?: GroundingSource[];
          searchQueries?: string[];
          grounded?: boolean;
        }>(
          '/api/study-assistant',
          {
            method: 'POST',
            body: JSON.stringify({
              mode,
              prompt: effectivePrompt,
              studentProfile: profile,
              history: recentHistory,
              aiEngine,
              useGoogleSearch,
            }),
          },
          { reply: fallbackReply, sources: [], searchQueries: [], grounded: false }
        );

        finalReply = data.reply || fallbackReply;
        finalSources = Array.isArray(data.sources) ? data.sources : [];
        finalSearchQueries = Array.isArray(data.searchQueries) ? data.searchQueries : [];

        const botMsg: ChatMessage = {
          id: botMsgId,
          role: 'assistant',
          content: finalReply,
          timestamp: botTimestamp,
          mode,
          sources: finalSources,
          searchQueries: finalSearchQueries,
          grounded: Boolean(data.grounded) || useGoogleSearch,
          learningAids: defaultLearningAids,
        };

        setMessages((prev) => [...prev, botMsg]);
      }

      addStudyMinutes(3);
      if (mode === 'practice') {
        addQuestionAttempt(true);
      }
      addPromptHistory({
        prompt: rawContent,
        fullResponse: finalReply,
        responsePreview: finalReply.replace(/[#*`_~]/g, '').slice(0, 140) + '...',
        mode,
        subject: profile.primaryExam || 'General',
        sources: finalSources,
        searchQueries: finalSearchQueries,
      });
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: botMsgId,
        role: 'assistant',
        content: `Note: ${err.message || 'Connecting to study assistant...'}\n\nHere is a quick concept breakdown for **${rawContent}**:\n\n- **Definition**: Fundamental rule applicable in your syllabus.\n- **Step-by-step explanation**: Break the problem down into given information, formulas, and units.\n- **Learning tip**: Always cross-check the units in your final answer!`,
        timestamp: botTimestamp,
      };
      setMessages((prev) => [...prev, errorMsg]);
      addPromptHistory({
        prompt: rawContent,
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
        (item.responsePreview &&
          item.responsePreview.toLowerCase().includes(historySearch.toLowerCase())) ||
        (item.fullResponse &&
          item.fullResponse.toLowerCase().includes(historySearch.toLowerCase()));

      if (!matchesSearch) return false;

      if (historyFilter === 'starred') return !!item.starred;
      if (historyFilter === 'current') return item.mode === mode;
      return true;
    });
  }, [promptHistory, historySearch, historyFilter, mode]);

  // Recents list for Left Sidebar (User's actual history only)
  const sidebarRecents = useMemo(() => {
    const q = sidebarSearch.trim().toLowerCase();
    const userItems = promptHistory.map((item) => ({
      id: item.id,
      label: item.prompt,
      prompt: item.prompt,
      fullResponse: item.fullResponse,
      timestamp: item.timestamp,
      isUserHistory: true,
    }));

    if (!q) return userItems;
    return userItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.prompt.toLowerCase().includes(q)
    );
  }, [promptHistory, sidebarSearch]);

  const starredCount = useMemo(() => {
    return promptHistory.filter((p) => p.starred).length;
  }, [promptHistory]);

  const handleSelectSidebarRecent = (item: {
    id: string;
    label: string;
    prompt: string;
    fullResponse?: string;
  }) => {
    setActiveRecentId(item.id);
    if (item.fullResponse) {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages([
        {
          id: `u-${item.id}`,
          role: 'user',
          content: item.prompt,
          timestamp: nowTime,
          mode,
        },
        {
          id: `a-${item.id}`,
          role: 'assistant',
          content: item.fullResponse,
          timestamp: nowTime,
          mode,
          learningAids: [
            '💡 Explain simpler',
            '🍎 Give a real-world analogy',
            '📐 Draw a diagram / layout',
            '📝 Quiz me on this',
            '⚡ Formula cheat-sheet',
          ],
        },
      ]);
    } else {
      handleSend(item.prompt);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    setActiveRecentId(null);
    setShowSuggestionsPopover(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleUsePrompt = (promptText: string, autoSend: boolean = false) => {
    if (autoSend) {
      handleSend(promptText);
      setHistoryDrawerOpen(false);
    } else {
      setInput(promptText);
      setHistoryDrawerOpen(false);
      inputRef.current?.focus();
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
      const cleanText = text.replace(/[#*`_~$]/g, '');
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
            {line.replace('### ', '').replace(/\$/g, '')}
          </h4>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h3 key={idx} className="mt-4 mb-2 text-lg font-bold text-white border-b border-white/10 pb-1">
            {line.replace('## ', '').replace(/\$/g, '')}
          </h3>
        );
      }
      if (line.startsWith('# ')) {
        return (
          <h2 key={idx} className="mt-4 mb-2 text-xl font-extrabold text-white">
            {line.replace('# ', '').replace(/\$/g, '')}
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
    const cleaned = str.replace(/\$([^$]+)\$/g, '`$1`');
    const parts = cleaned.split(/(\*\*.*?\*\*|`.*?`)/g);
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
          <code
            key={i}
            className="rounded bg-blue-950/60 px-1.5 py-0.5 font-mono text-xs text-blue-300 border border-blue-800/40"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  // Greeting name matching screenshot ("pragyan" or user's first name)
  const greetingName = useMemo(() => {
    const raw = currentUser?.displayName || profile.name || '';
    if (!raw || raw.toLowerCase() === 'student' || raw.toLowerCase() === 'guest') {
      return 'pragyan';
    }
    return raw.split(' ')[0].toLowerCase();
  }, [currentUser?.displayName, profile.name]);

  const sidebarProfileName = useMemo(() => {
    const raw = currentUser?.displayName || profile.name || '';
    if (!raw || raw.toLowerCase() === 'student' || raw.toLowerCase() === 'guest') {
      return 'XeNohunte6';
    }
    return raw;
  }, [currentUser?.displayName, profile.name]);

  const sidebarAvatarText = useMemo(() => {
    if (sidebarProfileName === 'XeNohunte6') return 'Xe';
    return sidebarProfileName.slice(0, 2);
  }, [sidebarProfileName]);

  // Shared Glowing Pill Input Bar Component (used in both Centered Empty State & Bottom Docked Chat State)
  const renderGlowingInputBar = () => (
    <div className="relative w-full max-w-[680px] mx-auto">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            handleSend();
          }
        }}
        className="flex items-center gap-2.5 rounded-full border border-[#38bdf8]/80 bg-[#0d1b3a]/90 px-5 py-2.5 shadow-[0_0_38px_rgba(37,99,235,0.55),inset_0_0_16px_rgba(56,189,248,0.18)] focus-within:border-[#7dd3fc] focus-within:shadow-[0_0_48px_rgba(56,189,248,0.75),inset_0_0_20px_rgba(56,189,248,0.25)] transition-all"
      >
        {/* Center Input */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'tutor' ? 'Ask ChatGPT' : placeholder}
          className="flex-1 bg-transparent py-1.5 text-sm md:text-[15px] text-white placeholder:text-slate-400/90 focus:outline-none"
        />

        {/* Right Controls: Think + Mic */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Think Button */}
          <button
            type="button"
            onClick={() => setThinkMode((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs md:text-[13.5px] font-medium transition-all cursor-pointer ${
              thinkMode
                ? 'text-[#60a5fa] hover:bg-blue-500/15'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title={
              thinkMode
                ? 'Deep Think Mode Active (Step-by-step reasoning)'
                : 'Enable Deep Think Mode'
            }
          >
            <BrainCircuit className="h-4 w-4 text-[#38bdf8]" />
            <span>Think</span>
          </button>

          {/* Microphone Button */}
          <button
            type="button"
            onClick={toggleVoiceInput}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer ${
              isListening
                ? 'bg-rose-500/25 text-rose-400 animate-pulse'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            title="Voice input"
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="relative flex h-[calc(100vh-2.25rem)] w-full overflow-hidden bg-[#02050d] font-['Sora'] text-slate-100 select-none">
      {/* ==================== LEFT CHAT SIDEBAR ==================== */}
      {chatSidebarOpen && (
        <aside className="relative z-20 flex w-[255px] sm:w-[272px] shrink-0 flex-col justify-between bg-[#000000] border-r border-[#38bdf8]/75 shadow-[3px_0_25px_rgba(56,189,248,0.4)] h-full">
          {/* Top Section: Search + New Chat */}
          <div className="p-3 space-y-2.5">
            {/* Search Input + Sidebar Collapse Button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 flex items-center rounded-xl border border-white/10 bg-[#16181d] px-3 py-2 focus-within:border-[#38bdf8]/60 transition-colors">
                <input
                  type="text"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder="Search"
                  className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none pr-6"
                />
                <Search className="absolute right-2.5 h-4 w-4 text-slate-300 pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={() => setChatSidebarOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                title="Collapse chat sidebar"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            </div>

            {/* Glowing "New chat" Button */}
            <button
              type="button"
              onClick={handleNewChat}
              className="flex w-full items-center gap-3 rounded-xl border border-[#3b82f6] bg-gradient-to-r from-[#172a57]/90 via-[#142347]/80 to-[#0f1b38]/80 px-3.5 py-2.5 text-xs md:text-[13px] font-medium text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:brightness-110 transition-all cursor-pointer"
            >
              <SquarePen className="h-4 w-4 text-[#60a5fa] shrink-0" />
              <span>New chat</span>
            </button>
          </div>

          <div className="border-t border-white/10" />

          {/* Middle Section: Recents List (User's Real History) */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
            <div className="flex items-center justify-between px-1.5 mb-2">
              <span className="text-xs font-semibold text-white tracking-tight">Recents</span>
              {promptHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistoryDrawerOpen(true)}
                  className="text-[10.5px] font-semibold text-[#38bdf8] hover:underline cursor-pointer"
                >
                  View all ({promptHistory.length})
                </button>
              )}
            </div>

            {sidebarRecents.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSidebarRecent(item)}
                className={`w-full rounded-lg px-2 py-2 text-left text-xs md:text-[13px] truncate transition-colors cursor-pointer ${
                  activeRecentId === item.id
                    ? 'bg-[#132347] text-white font-semibold'
                    : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                }`}
                title={item.prompt}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Bottom User Profile & "Claim offer" Pill */}
          <div className="border-t border-white/10 bg-[#000000] p-3 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8f7d42] text-[11px] font-bold text-white shadow-inner">
                  {sidebarAvatarText}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate leading-tight">
                    {sidebarProfileName}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-tight">Free</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setHistoryDrawerOpen(true)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                title="Open Prompt History"
              >
                <History className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setOfferBanner(
                  '🎁 StudyBot AI Unlimited Step-by-Step Tutor & Deep Think Mode is active for your account!'
                );
                setTimeout(() => setOfferBanner(null), 4000);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-[#0ea5e9] bg-[#030b17] py-2 px-4 text-xs font-semibold text-white shadow-[0_0_18px_rgba(14,165,233,0.4)] hover:bg-[#07162c] transition-all cursor-pointer"
            >
              <Gift className="h-3.5 w-3.5 text-[#38bdf8]" />
              <span>Claim offer</span>
            </button>
          </div>
        </aside>
      )}

      {/* ==================== RIGHT MAIN AI TUTOR CANVAS ==================== */}
      <div className="relative flex-1 flex flex-col h-full overflow-hidden bg-[#02050d]">
        {/* Flowing Dark-Blue Silk Waves Background (Matching Screenshot) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 75% 42%, rgba(14, 58, 130, 0.42) 0%, rgba(6, 24, 62, 0.25) 42%, transparent 72%), radial-gradient(circle at 25% 78%, rgba(12, 52, 118, 0.38) 0%, transparent 60%), linear-gradient(180deg, #030712 0%, #040d21 50%, #02050c 100%)',
            }}
          />
          <svg
            className="absolute inset-0 h-full w-full object-cover opacity-80"
            viewBox="0 0 1440 900"
            fill="none"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M-100 680C240 820 560 520 920 330C1180 190 1360 230 1540 310V960H-100V680Z"
              fill="url(#waveGrad1)"
            />
            <path
              d="M-100 540C220 740 620 620 980 390C1220 235 1380 260 1540 350"
              stroke="url(#waveStroke1)"
              strokeWidth="3"
              opacity="0.55"
            />
            <path
              d="M-80 760C300 640 640 360 1060 250C1280 195 1420 240 1560 320V960H-80V760Z"
              fill="url(#waveGrad2)"
            />
            <defs>
              <linearGradient id="waveGrad1" x1="720" y1="200" x2="720" y2="960" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0e3a7e" stopOpacity="0.38" />
                <stop offset="0.5" stopColor="#081f49" stopOpacity="0.28" />
                <stop offset="1" stopColor="#020611" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="waveGrad2" x1="200" y1="240" x2="1200" y2="900" gradientUnits="userSpaceOnUse">
                <stop stopColor="#174ea6" stopOpacity="0.25" />
                <stop offset="0.6" stopColor="#091e46" stopOpacity="0.2" />
                <stop offset="1" stopColor="#02050d" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="waveStroke1" x1="0" y1="500" x2="1440" y2="300" gradientUnits="userSpaceOnUse">
                <stop stopColor="#1e40af" stopOpacity="0.1" />
                <stop offset="0.55" stopColor="#38bdf8" stopOpacity="0.45" />
                <stop offset="1" stopColor="#1d4ed8" stopOpacity="0.15" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Top Bar inside Right Canvas */}
        <div className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-white/[0.04] bg-[#060e20]/60 px-5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {!chatSidebarOpen && (
              <button
                type="button"
                onClick={() => setChatSidebarOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#0c1830] text-slate-300 hover:border-[#38bdf8]/60 hover:text-white transition-all cursor-pointer"
                title="Open chat sidebar"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            )}
            {messages.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">{title}</span>
                <button
                  type="button"
                  onClick={() => setHistoryDrawerOpen(true)}
                  className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-300 hover:bg-blue-500/20 cursor-pointer"
                >
                  History ({promptHistory.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Optional Offer Notification Banner */}
        {offerBanner && (
          <div className="relative z-20 mx-auto mt-3 flex max-w-xl items-center justify-between gap-3 rounded-2xl border border-[#38bdf8]/50 bg-[#081a38]/95 px-4 py-2.5 text-xs font-semibold text-sky-200 shadow-lg animate-in fade-in duration-200">
            <span>{offerBanner}</span>
            <button
              type="button"
              onClick={() => setOfferBanner(null)}
              className="text-sky-300 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ==================== CENTER CONTENT OR ACTIVE CHAT THREAD ==================== */}
        {messages.length === 0 ? (
          /* EMPTY STATE: Centered Greeting & Glowing Pill Input Bar (Matching Screenshot) */
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-14">
            <h1 className="mb-7 text-center text-2xl sm:text-[28px] font-normal tracking-normal text-white drop-shadow-sm">
              Hey, {greetingName}. Ready to dive in?
            </h1>

            {renderGlowingInputBar()}
          </div>
        ) : (
          /* ACTIVE CONVERSATION THREAD + BOTTOM DOCKED GLOWING PILL INPUT */
          <>
            <div className="relative z-10 flex-1 overflow-y-auto px-4 py-6 md:px-10">
              <div className="mx-auto max-w-3xl space-y-6 pb-8">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3.5 ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#38bdf8] to-[#2563eb] text-white shadow-[0_0_15px_rgba(56,189,248,0.5)]">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}

                    <div
                      className={`relative max-w-[85%] rounded-2xl p-4 md:p-5 shadow-lg ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-[#1e3a8a] to-[#1d4ed8] text-white rounded-tr-none border border-[#38bdf8]/40'
                          : 'border border-[#1e3a6e] bg-[#081226]/95 rounded-tl-none backdrop-blur-md'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[0.65rem] text-slate-400 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">
                            {msg.role === 'user' ? sidebarProfileName : 'StudyBot AI'}
                          </span>
                          {msg.role === 'assistant' &&
                            (msg.grounded || (msg.sources && msg.sources.length > 0)) && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[0.62rem] font-semibold text-emerald-300">
                                <Globe className="h-2.5 w-2.5 text-emerald-400" />
                                Google Search Grounded
                              </span>
                            )}
                        </div>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div className="prose-study text-sm leading-relaxed">
                        {msg.role === 'user' ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          renderFormattedMarkdown(msg.content)
                        )}
                      </div>

                      {/* Google Search Grounding Sources & Queries */}
                      {msg.role === 'assistant' &&
                        ((msg.sources && msg.sources.length > 0) ||
                          (msg.searchQueries && msg.searchQueries.length > 0)) && (
                          <div className="mt-4 rounded-xl border border-emerald-500/25 bg-[#080f20] p-3 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-[0.7rem] font-bold text-emerald-300">
                                <Globe className="h-3.5 w-3.5 text-emerald-400" />
                                <span>Google Search Grounding Sources</span>
                              </div>
                              {msg.sources && msg.sources.length > 0 && (
                                <span className="text-[0.65rem] text-slate-400">
                                  {msg.sources.length}{' '}
                                  {msg.sources.length === 1 ? 'source' : 'sources'}
                                </span>
                              )}
                            </div>

                            {msg.searchQueries && msg.searchQueries.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[0.65rem] text-slate-400 font-medium">
                                  Searched:
                                </span>
                                {msg.searchQueries.map((q, qIdx) => (
                                  <button
                                    key={qIdx}
                                    type="button"
                                    onClick={() => handleSend(q)}
                                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[0.65rem] text-slate-300 hover:border-blue-500/40 hover:text-white transition-colors"
                                  >
                                    <Search className="h-2.5 w-2.5 text-blue-400" />
                                    <span>{q}</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {msg.sources && msg.sources.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {msg.sources.map((src, sIdx) => (
                                  <a
                                    key={sIdx}
                                    href={src.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 max-w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[0.68rem] font-medium text-emerald-200 hover:bg-emerald-500/20 hover:border-emerald-400 hover:text-white transition-all"
                                  >
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-emerald-500/20 text-[0.6rem] font-bold text-emerald-300">
                                      {sIdx + 1}
                                    </span>
                                    <span className="truncate max-w-[200px]">{src.title}</span>
                                    <ExternalLink className="h-3 w-3 shrink-0 text-emerald-400" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                      {/* Assistant Actions & Learning Aids */}
                      {msg.role === 'assistant' && (
                        <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopy(msg.content, msg.id)}
                              className="flex items-center gap-1 text-[0.7rem] text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
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
                              className="flex items-center gap-1 text-[0.7rem] text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              {speakingId === msg.id ? (
                                <>
                                  <VolumeX className="h-3 w-3 text-blue-400 animate-pulse" /> Stop
                                  Voice
                                </>
                              ) : (
                                <>
                                  <Volume2 className="h-3 w-3" /> Read Aloud
                                </>
                              )}
                            </button>
                          </div>

                          {msg.learningAids && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {msg.learningAids.map((aid, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleAidClick(aid)}
                                  className="text-[0.68rem] font-semibold px-2.5 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:border-blue-400 transition-all cursor-pointer"
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
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#8f7d42] text-white text-xs font-bold">
                        {sidebarAvatarText}
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-3.5 items-center">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#2563eb] text-white">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="rounded-2xl border border-[#1e3a6e] bg-[#081226] p-4 flex items-center gap-2">
                      <div className="flex space-x-1.5">
                        <span className="h-2 w-2 rounded-full bg-sky-400 animate-bounce" />
                        <span className="h-2 w-2 rounded-full bg-sky-400 animate-bounce [animation-delay:0.2s]" />
                        <span className="h-2 w-2 rounded-full bg-sky-400 animate-bounce [animation-delay:0.4s]" />
                      </div>
                      <span className="text-xs text-slate-300 font-medium">
                        {thinkMode
                          ? 'Thinking deeply & formulating step-by-step answer...'
                          : 'Formulating answer...'}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Docked Glowing Pill Input Bar at Bottom when Chatting */}
            <div className="relative z-20 px-4 pb-5 pt-2 bg-gradient-to-t from-[#02050d] via-[#02050d]/90 to-transparent">
              {renderGlowingInputBar()}
            </div>
          </>
        )}

        {/* Bottom-Right 4-Point Star Sparkle (Matching Screenshot) */}
        <div className="pointer-events-none absolute bottom-5 right-6 z-10 opacity-75">
          <svg
            className="h-11 w-11 text-slate-300/75 drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]"
            viewBox="0 0 48 48"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M24 2C24.8 14.5 33.5 23.2 46 24C33.5 24.8 24.8 33.5 24 46C23.2 33.5 14.5 24.8 2 24C14.5 23.2 23.2 14.5 24 2Z" />
          </svg>
        </div>
      </div>

      {/* ==================== SLIDE-OVER PROMPT HISTORY DRAWER ==================== */}
      {historyDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setHistoryDrawerOpen(false)}
          />

          <div className="relative z-50 flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#080d1c] p-6 shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
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
                  <p className="text-[0.72rem] text-slate-400">
                    Review, re-ask, or copy your past AI Tutor prompts
                  </p>
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

            <div className="py-4 space-y-3">
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
                              item.starred
                                ? 'text-amber-400'
                                : 'text-slate-500 hover:text-amber-400'
                            }`}
                          >
                            <Star className={`h-3.5 w-3.5 ${item.starred ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removePromptHistory(item.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-xs md:text-sm font-bold text-white leading-snug">
                        "{item.prompt}"
                      </div>

                      {item.fullResponse && (
                        <div className="mt-2.5">
                          <button
                            type="button"
                            onClick={() => setExpandedHistoryId(isExpanded ? null : item.id)}
                            className="flex items-center gap-1 text-[0.7rem] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <span>
                              {isExpanded ? 'Hide explanation' : 'View explanation / solution'}
                            </span>
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
                                      <VolumeX className="h-3 w-3 text-blue-400 animate-pulse" /> Stop
                                      Voice
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
    </div>
  );
};
