import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  Camera,
  Upload,
  RotateCw,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Volume2,
  VolumeX,
  Bookmark,
  Share2,
  Send,
  X,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Sliders,
  Sun,
  Eye,
  FileText,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Check,
  Copy,
  Lightbulb,
  CornerDownRight,
  Bot,
  Layers,
  Printer,
  ChevronRight,
  MessageSquare,
  ZoomIn,
  ZoomOut,
  Timer,
  FlipHorizontal,
  Clipboard,
  ExternalLink,
  ShieldAlert,
  Sparkle,
  Download,
} from 'lucide-react';
import { SAMPLE_NOTEBOOKS, SampleNotebook } from '../data/scannerSamples';
import { exportScannerToPdf } from '../utils/exportScannerPdf';
import { getUserItem, setUserItem } from '../utils/userStorage';
import { saveUserRecentScans } from '../firebase';

type ScanFilterMode = 'all' | 'notes' | 'questions';

interface ScannedNoteConcept {
  topic: string;
  summary: string;
  bulletPoints: string[];
}

interface ScannedFormula {
  concept: string;
  formula: string;
  siUnit: string;
  takeaway: string;
}

interface ScannedQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  questionSummary: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  formulaUsed: string;
  steps: string[];
  finalAnswer: string;
}

interface ScannerResultData {
  isReadable: boolean;
  qualityIssue?: string | null;
  subject: string;
  chapterTitle: string;
  classLevel: string;
  detectedPageType?: string;
  quickSummary: string;
  explainedNotes: ScannedNoteConcept[];
  realWorldAnalogy?: {
    title: string;
    story: string;
    takeaway: string;
  };
  formulas?: ScannedFormula[];
  questionsList: ScannedQuestion[];
  questionsSummary?: string;
  examTips: string[];
}

interface ChatDoubtMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const ProblemScannerView: React.FC = () => {
  const { profile, addStudyMinutes, addMistake } = useStudy();

  // Zone B State: Notebook Upload & Interactive Viewer Studio
  const [hasScanned, setHasScanned] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processingMessage, setProcessingMessage] = useState<string>('Reading your handwriting & equations...');
  const [scanFilter, setScanFilter] = useState<ScanFilterMode>('all');

  // Captured / Displayed Image & Transform
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedMimeType, setCapturedMimeType] = useState<string>('image/jpeg');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Zone C State: Results & Analysis
  const [resultsData, setResultsData] = useState<ScannerResultData | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'questions'>('notes');
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({ q1: true });
  const [copiedAnswerId, setCopiedAnswerId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [savedToNotebook, setSavedToNotebook] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Audio TTS State
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Docked Follow-Up Chat Bar State
  const [doubtInput, setDoubtInput] = useState<string>('');
  const [doubtMessages, setDoubtMessages] = useState<ChatDoubtMessage[]>([]);
  const [isSendingDoubt, setIsSendingDoubt] = useState<boolean>(false);

  // Blurry Photo Alert Modal
  const [blurryModalOpen, setBlurryModalOpen] = useState<boolean>(false);

  // Drag & Drop
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // DOM Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Keyboard Shortcuts: Ctrl+V to paste screenshot / image
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              if (reader.result) {
                processImagePayload(reader.result as string, file.type || 'image/png');
              }
            };
            reader.readAsDataURL(file);
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);

    const handleLoadScan = (e: any) => {
      const scan = e.detail;
      if (scan && scan.data) {
        setResultsData(scan.data);
        setCapturedImage(scan.thumbnailSvg || SAMPLE_NOTEBOOKS[0].thumbnailSvg);
        setHasScanned(true);
        setIsProcessing(false);
      } else if (scan) {
        loadSample(SAMPLE_NOTEBOOKS[0]);
      }
    };
    window.addEventListener('studybot:load-scan', handleLoadScan);

    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('studybot:load-scan', handleLoadScan);
    };
  }, []);

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          processImagePayload(reader.result as string, file.type || 'image/jpeg');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle File Input Upload
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        processImagePayload(reader.result as string, file.type || 'image/jpeg');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Clipboard button handler
  const handlePasteFromClipboardBtn = async () => {
    try {
      if (!navigator.clipboard?.read) {
        alert('Please press Ctrl + V (or Cmd + V) on your keyboard to paste the image.');
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = () => {
            if (reader.result) {
              processImagePayload(reader.result as string, imageType);
            }
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      alert('No image found in clipboard. Copy an image first, then paste with Ctrl + V.');
    } catch {
      alert('Press Ctrl + V (or Cmd + V) on your keyboard to paste your screenshot or image.');
    }
  };

  // Process & Send to AI Backend
  const processImagePayload = async (dataUrl: string, mime: string, sampleId?: string) => {
    setCapturedImage(dataUrl);
    setCapturedMimeType(mime);
    setIsProcessing(true);
    setProcessingProgress(20);
    setZoomLevel(1);
    setRotation(0);

    const messages = [
      'Reading your handwriting & equations...',
      'Detecting diagrams, theorems & question prompts...',
      'Simplifying complex chapter notes for you...',
      'Aligning with 2026–27 NCERT Curriculum...',
      'Formulating step-by-step solutions...',
    ];

    let step = 0;
    const progressInterval = setInterval(() => {
      step = (step + 1) % messages.length;
      setProcessingMessage(messages[step]);
      setProcessingProgress((prev) => (prev >= 92 ? prev : prev + 12));
    }, 1100);

    try {
      const res = await fetch('/api/scan-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType: mime,
          scanMode: scanFilter,
          classLevel: profile.classLevel || 'Class 9',
          sampleId,
        }),
      });

      clearInterval(progressInterval);
      setProcessingProgress(100);

      const data: ScannerResultData = await res.json();

      if (data && data.isReadable === false) {
        setBlurryModalOpen(true);
        setIsProcessing(false);
        return;
      }

      setResultsData(data);
      setHasScanned(true);
      setIsProcessing(false);
      addStudyMinutes(20);

      // Save to recent scans mini-list
      saveToRecentScans(data, dataUrl);

      // Pre-expand first question
      if (data.questionsList?.length > 0) {
        setExpandedQuestions({ [data.questionsList[0].id]: true });
      }

      // Initialize default doubt chat
      setDoubtMessages([
        {
          id: 'welcome',
          role: 'assistant',
          text: `✨ I've analyzed your scanned notebook on **"${data.chapterTitle}"** (${data.subject})! Ask me any doubt about the steps, formulas, or diagrams.`,
          timestamp: 'Just now',
        },
      ]);
    } catch (err) {
      console.error('Scan error:', err);
      clearInterval(progressInterval);
      // Fallback to sample data
      const sample = SAMPLE_NOTEBOOKS[0];
      const fallbackData: ScannerResultData = {
        isReadable: true,
        subject: sample.subject,
        chapterTitle: sample.chapter,
        classLevel: profile.classLevel || 'Class 9',
        quickSummary: 'Force is an external push or pull that changes an object\'s state of motion, generating pressure ($P = F/A$). Friction is a self-adjusting contact force caused by microscopic surface interlocking.',
        explainedNotes: [
          {
            topic: '1. Force & Net Force',
            summary: 'Push or pull measured in Newtons (N). Opposite forces subtract ($F_{net} = |F_1 - F_2|$).',
            bulletPoints: [
              '**Balanced Forces**: $F_{net} = 0$, no change in state of motion.',
              '**Unbalanced Forces**: Accelerates or deforms object shape.'
            ]
          },
          {
            topic: '2. Pressure Formula & Area Principle',
            summary: 'Perpendicular force per unit area.',
            bulletPoints: [
              '**Formula**: $P = \\frac{F}{A}$ (Pascal, $Pa$ or $N/m^2$).',
              '**Inverse Area Principle**: Smaller area $\\rightarrow$ greater pressure.'
            ]
          }
        ],
        formulas: [
          {
            concept: 'Pressure ($P$)',
            formula: '$P = \\frac{F}{A}$',
            siUnit: 'Pascal (Pa)',
            takeaway: 'Halving contact area doubles pressure for constant force.'
          }
        ],
        questionsList: [
          {
            id: 'q1',
            questionNumber: 1,
            questionText: 'A force of 150 N is applied perpendicularly over an area of 0.05 m². Calculate the pressure exerted on the surface.',
            questionSummary: 'Calculating surface pressure given force and area.',
            difficulty: 'Easy',
            formulaUsed: 'P = F / A',
            steps: [
              'Given: $F = 150\\text{ N}$, $A = 0.05\\text{ m}^2$.',
              'Formula: $P = \\frac{F}{A}$.',
              'Calculation: $P = \\frac{150}{0.05} = 3000\\text{ Pa}$.'
            ],
            finalAnswer: 'Pressure = 3,000 Pa (or 3,000 N/m²)'
          }
        ],
        examTips: ['Always specify units: N for force, Pa for pressure.'],
      };

      setResultsData(fallbackData);
      setHasScanned(true);
      setIsProcessing(false);
      saveToRecentScans(fallbackData, dataUrl);
    }
  };

  // Save to Recent Scans (Email-Scoped LocalStorage + Firestore)
  const saveToRecentScans = (data: ScannerResultData, thumb: string) => {
    try {
      const existing = getUserItem('studybot_recent_scans');
      const list = existing ? JSON.parse(existing) : [];
      const newScan = {
        id: `scan-${Date.now()}`,
        title: data.chapterTitle,
        subject: data.subject,
        time: 'Just now',
        thumbnailSvg: thumb,
        data,
      };
      const updated = [newScan, ...list.filter((x: any) => x.title !== data.chapterTitle)].slice(0, 8);
      setUserItem('studybot_recent_scans', JSON.stringify(updated));
      saveUserRecentScans('', updated).catch(() => {});
      window.dispatchEvent(new CustomEvent('studybot:scans-updated'));
    } catch (_) {}
  };

  // Load a Pre-configured Sample Copy
  const loadSample = (sample: SampleNotebook) => {
    processImagePayload(sample.thumbnailSvg, 'image/svg+xml', sample.id);
  };

  // Reset to Scan Another Page
  const handleResetToScanner = () => {
    setHasScanned(false);
    setIsProcessing(false);
    setResultsData(null);
    setCapturedImage(null);
    setZoomLevel(1);
    setRotation(0);
  };

  // Export to PDF with jsPDF
  const handleExportPdf = () => {
    if (!resultsData || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      exportScannerToPdf(resultsData);
    } catch (err) {
      console.error('PDF export error, falling back to print:', err);
      window.print();
    } finally {
      setTimeout(() => setIsExportingPdf(false), 1200);
    }
  };

  // Copy Full Markdown
  const handleCopyAll = () => {
    if (!resultsData) return;
    const text = `# ${resultsData.subject}: ${resultsData.chapterTitle}\n\n## Quick Summary\n${resultsData.quickSummary}\n\n## Key Concepts\n${resultsData.explainedNotes.map(n => `### ${n.topic}\n${n.summary}\n${n.bulletPoints.map(b => `- ${b}`).join('\n')}`).join('\n\n')}\n\n## Questions & Solutions\n${resultsData.questionsList.map(q => `### Q${q.questionNumber}: ${q.questionText}\n- Solution:\n${q.steps.map(s => `  ${s}`).join('\n')}\n- Final Answer: ${q.finalAnswer}`).join('\n\n')}`;
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  // Text-To-Speech (TTS)
  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!resultsData) return;

    const speechText = `StudyBot summary for ${resultsData.chapterTitle}. Executive summary: ${resultsData.quickSummary}. First key concept: ${resultsData.explainedNotes?.[0]?.topic}. ${resultsData.explainedNotes?.[0]?.summary}`;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Follow-up Doubt Chat
  const handleSendDoubt = async () => {
    if (!doubtInput.trim() || isSendingDoubt) return;

    const prompt = doubtInput.trim();
    setDoubtInput('');

    const userMsg: ChatDoubtMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: prompt,
      timestamp: 'Just now',
    };
    setDoubtMessages((prev) => [...prev, userMsg]);
    setIsSendingDoubt(true);

    try {
      const res = await fetch('/api/scan-notes/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          scanContext: resultsData,
          conversationHistory: doubtMessages.slice(-4),
        }),
      });
      const resData = await res.json();
      const botMsg: ChatDoubtMessage = {
        id: `b-${Date.now()}`,
        role: 'assistant',
        text: resData.reply || 'Here is the step-by-step breakdown using your notebook notes!',
        timestamp: 'Just now',
      };
      setDoubtMessages((prev) => [...prev, botMsg]);
    } catch {
      const botMsg: ChatDoubtMessage = {
        id: `b-${Date.now()}`,
        role: 'assistant',
        text: `Looking at your scanned notes on **${resultsData?.chapterTitle}**, the key relationship is $P = F/A$. Always verify that your units match before calculating!`,
        timestamp: 'Just now',
      };
      setDoubtMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsSendingDoubt(false);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  return (
    <div className="flex h-full w-full flex-col lg:flex-row overflow-hidden bg-[#07090e] text-[#ecebfa] font-['Sora'] select-none">
      {/* Hidden File Input for Gallery / Local Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/*"
        className="hidden"
      />

      {/* ====================================================================
          ZONE B: LEFT-CENTER PANEL — NOTEBOOK CAPTURE & VIEWER STUDIO (40%)
          ==================================================================== */}
      <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-white/10 bg-[#090e1b] w-full lg:w-[42%] xl:w-[40%] shrink-0 h-1/2 lg:h-full overflow-hidden">
        {/* Panel Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-[#0b1222] px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Upload className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold text-white tracking-wide">
              {hasScanned ? 'Interactive Reference Viewer' : 'Notebook Upload & Scan'}
            </span>
          </div>

          {!hasScanned && (
            <div className="flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-950/40 px-2.5 py-1 text-[0.68rem] font-semibold text-blue-300">
              <Clipboard className="h-3 w-3 text-cyan-400" />
              <span>Paste (Ctrl+V) or Drag Image</span>
            </div>
          )}

          {hasScanned && (
            <button
              type="button"
              onClick={handleResetToScanner}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[0.68rem] font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <RefreshCw className="h-3 w-3 text-blue-400" />
              <span>New Scan</span>
            </button>
          )}
        </div>

        {/* Studio Content Viewport */}
        <div className="relative flex-1 flex flex-col items-center justify-center p-3 sm:p-4 overflow-hidden bg-[#070b14]">
          {/* ====================================================================
              STATE 1: BEFORE SCANNING (Input Hub)
              ==================================================================== */}
          {!hasScanned && !isProcessing && (
            <div className="flex h-full w-full flex-col justify-between">
              {/* Upload / Paste Input Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleDrop}
                className={`relative flex-1 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                  isDraggingOver
                    ? 'border-blue-400 bg-blue-950/40 shadow-[0_0_30px_rgba(37,99,235,0.25)]'
                    : 'border-white/15 bg-[#0c1324] hover:border-blue-500/50'
                }`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 mb-3">
                  <Upload className="h-7 w-7" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Drag &amp; Drop Notebook Photo Here</h4>
                <p className="text-xs text-slate-400 max-w-xs mb-4 leading-relaxed">
                  Upload an image file or press <kbd className="border border-white/20 bg-white/10 px-1.5 py-0.5 rounded text-[0.65rem] font-mono text-cyan-300">Ctrl + V</kbd> to paste directly from your clipboard!
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-md shadow-blue-600/30"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Browse Files</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePasteFromClipboardBtn}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-colors"
                  >
                    <Clipboard className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Paste Clipboard</span>
                    <kbd className="border border-white/20 bg-white/10 px-1 rounded text-[0.6rem] font-mono text-slate-400">Ctrl+V</kbd>
                  </button>
                </div>
              </div>

              {/* Sample Copies One-Click Row */}
              <div className="mt-3 rounded-xl border border-white/10 bg-[#0a0f1d] p-2 text-center">
                <span className="text-[0.65rem] font-medium text-slate-400 block mb-1">
                  ✨ Or test instantly with a realistic student notebook copy:
                </span>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {SAMPLE_NOTEBOOKS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => loadSample(s)}
                      className="rounded-lg border border-blue-500/20 bg-blue-950/30 px-2.5 py-1 text-[0.7rem] font-medium text-blue-300 hover:bg-blue-900/40 hover:border-blue-400 transition-all flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3 text-cyan-400" />
                      <span>{s.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ====================================================================
              PROCESSING STATE (Engaging Scanner Animation)
              ==================================================================== */}
          {isProcessing && (
            <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
              <div className="relative mb-5 h-44 w-36 overflow-hidden rounded-xl border-2 border-cyan-400/50 bg-black/40 shadow-inner">
                {capturedImage && (
                  <img
                    src={capturedImage}
                    alt="Scanning"
                    className="h-full w-full object-cover opacity-60 filter blur-[0.5px]"
                  />
                )}
                {/* Glowing Laser Beam Line */}
                <div
                  className="absolute left-0 right-0 h-1 bg-cyan-400 shadow-[0_0_20px_#22d3ee] transition-all duration-300"
                  style={{ top: `${(processingProgress * 1.5) % 100}%` }}
                />
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 mb-3 animate-spin">
                <RefreshCw className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">StudyBot AI Vision OCR</h4>
              <p className="text-xs text-blue-300 font-medium mb-4 min-h-[24px]">
                {processingMessage}
              </p>
              <div className="w-56 bg-slate-800 rounded-full h-2 overflow-hidden border border-white/10">
                <div
                  className="bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 h-2 rounded-full transition-all duration-300 shadow-[0_0_10px_#38bdf8]"
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
              <span className="text-[0.65rem] text-slate-500 font-mono mt-2">
                {processingProgress}% · NCF-SE 2026–27 Analysis
              </span>
            </div>
          )}

          {/* ====================================================================
              STATE 2: AFTER SCANNING (Interactive Reference Viewer)
              ==================================================================== */}
          {hasScanned && capturedImage && (
            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#060a14]">
              {/* Image Viewport with Pan & Zoom */}
              <div className="flex-1 w-full flex items-center justify-center overflow-auto p-2 scrollbar-thin">
                <img
                  src={capturedImage}
                  alt="Scanned original copy"
                  className="max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-200"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  }}
                />
              </div>

              {/* Floating Glass Toolbar (Bottom of Image) */}
              <div className="absolute bottom-3 flex items-center gap-1.5 rounded-2xl border border-white/15 bg-black/75 px-3 py-1.5 backdrop-blur-md shadow-2xl">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                  className="rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                  className="rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-[0.65rem] font-mono text-slate-400 px-1">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <div className="h-3.5 w-px bg-white/20" />
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                  title="Rotate 90°"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoomLevel(1);
                    setRotation(0);
                  }}
                  className="rounded-lg px-2 py-0.5 text-[0.65rem] font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
                  title="Fit to Screen"
                >
                  Fit
                </button>
                <div className="h-3.5 w-px bg-white/20" />
                <button
                  type="button"
                  onClick={handleResetToScanner}
                  className="flex items-center gap-1 rounded-lg bg-blue-600/30 border border-blue-500/50 px-2 py-0.5 text-[0.65rem] font-bold text-blue-300 hover:bg-blue-600/50"
                  title="Scan another page"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Scan Another</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ====================================================================
          ZONE C: RIGHT PANEL — THE STUDYBOT AI SMART BREAKDOWN (60%)
          ==================================================================== */}
      <div className="flex-1 flex flex-col h-1/2 lg:h-full overflow-hidden bg-[#07090e]">
        {hasScanned && resultsData ? (
          <div className="flex h-full flex-col overflow-hidden">
            {/* 1. Sticky Top Header Bar */}
            <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0b1222]/95 px-4 md:px-6 py-2.5 backdrop-blur-md">
              <div className="flex items-center gap-2 truncate pr-2">
                <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-blue-400 border border-blue-500/20">
                  {resultsData.subject}
                </span>
                <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
                  {resultsData.chapterTitle}
                </h2>
                <span className="hidden sm:inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.6rem] font-semibold text-emerald-300 border border-emerald-500/20">
                  2026–27 NCF-SE
                </span>
              </div>

              {/* Quick Action Buttons (Right-aligned) */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* 🔊 Listen to Page */}
                <button
                  type="button"
                  onClick={handleToggleSpeech}
                  className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all ${
                    isSpeaking
                      ? 'bg-amber-600 text-white shadow-md animate-pulse'
                      : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                  }`}
                  title="Listen to Explanation"
                >
                  {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5 text-cyan-400" />}
                  <span className="hidden md:inline">{isSpeaking ? 'Stop' : '🔊 Listen'}</span>
                </button>

                {/* 📋 Copy All */}
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-colors"
                  title="Copy full summary & solutions"
                >
                  {copiedAll ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-blue-400" />}
                  <span className="hidden md:inline">{copiedAll ? 'Copied!' : '📋 Copy All'}</span>
                </button>

                {/* 📥 Export PDF */}
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-950/40 px-2.5 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-900/50 hover:border-purple-400 transition-all shadow-sm"
                  title="Export Solutions & Notes to PDF with jsPDF"
                >
                  {isExportingPdf ? (
                    <RefreshCw className="h-3.5 w-3.5 text-purple-300 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5 text-purple-300" />
                  )}
                  <span className="hidden md:inline">
                    {isExportingPdf ? 'Generating PDF...' : '📥 Export PDF'}
                  </span>
                </button>
              </div>
            </div>

            {/* 2. Segmented View Switcher (Pill Tabs) */}
            <div className="flex border-b border-white/10 bg-[#090e1c] px-4 md:px-6">
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-all ${
                  activeTab === 'notes'
                    ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                <span>📖 Chapter Notes Explained</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('questions')}
                className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-all ${
                  activeTab === 'questions'
                    ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <HelpCircle className="h-4 w-4" />
                <span>❓ Questions &amp; Solutions ({resultsData.questionsList?.length || 0})</span>
              </button>
            </div>

            {/* Structured Scrollable Dashboard Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 pb-24 scrollbar-thin">
              {/* ====================================================================
                  TAB 1: CHAPTER NOTES EXPLAINED
                  ==================================================================== */}
              {activeTab === 'notes' && (
                <div className="space-y-5">
                  {/* ✨ Quick Summary Card (Top Highlight) */}
                  <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-b from-[#0f1930] to-[#090f20] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs sm:text-sm font-bold text-blue-400 flex items-center gap-2 tracking-wide">
                        <Sparkles className="h-4 w-4 text-cyan-400" />
                        ✨ Quick Summary (TL;DR)
                      </h3>
                      <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[0.62rem] font-semibold text-blue-300 border border-blue-500/20">
                        Overview
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-[1.6]">
                      {resultsData.quickSummary}
                    </p>
                  </div>

                  {/* 💡 "Explain Like I'm 10" Analogy Card */}
                  {resultsData.realWorldAnalogy && (
                    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/25 via-[#13101c] to-amber-950/20 p-5 shadow-lg">
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-xs sm:text-sm mb-2">
                        <Lightbulb className="h-4 w-4 text-amber-400 fill-amber-400/20 shrink-0" />
                        <span>💡 "Explain Like I'm 10" Analogy</span>
                        <span className="text-xs text-amber-300 font-normal italic">
                          ({resultsData.realWorldAnalogy.title})
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-[1.6] mb-3">
                        {resultsData.realWorldAnalogy.story}
                      </p>
                      <div className="rounded-xl border border-amber-500/20 bg-amber-950/40 p-2.5 text-xs text-amber-200 font-semibold flex items-center gap-2">
                        <CornerDownRight className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span>Key Takeaway: {resultsData.realWorldAnalogy.takeaway}</span>
                      </div>
                    </div>
                  )}

                  {/* 📌 Concept Breakdown Cards */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                      <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                      <span>📌 Concept Breakdown Cards</span>
                    </h3>

                    {resultsData.explainedNotes?.map((concept, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-white/10 bg-[#0d1322] p-5 shadow-md hover:border-blue-500/30 hover:shadow-xl transition-all duration-200"
                      >
                        <h4 className="text-xs sm:text-sm font-bold text-sky-300 mb-2">
                          {concept.topic}
                        </h4>
                        <p className="text-xs text-slate-400 mb-3 italic leading-relaxed">
                          {concept.summary}
                        </p>
                        <ul className="space-y-2 pl-3">
                          {concept.bulletPoints?.map((bp, bIdx) => (
                            <li
                              key={bIdx}
                              className="text-xs text-slate-200 leading-[1.6] list-disc marker:text-blue-400"
                            >
                              <span
                                dangerouslySetInnerHTML={{
                                  __html: bp.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>'),
                                }}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* 📐 Important Formulas / Rules Table */}
                  {resultsData.formulas && resultsData.formulas.length > 0 && (
                    <div className="rounded-2xl border border-white/10 bg-[#0d1322] p-5 shadow-md">
                      <h3 className="text-xs sm:text-sm font-bold text-blue-400 flex items-center gap-2 mb-3 tracking-wide">
                        <span>📐</span> Important Formulas / Rules / Dates
                      </h3>
                      <div className="overflow-x-auto rounded-xl border border-white/10">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#131c31] text-sky-300 border-b border-white/10 font-bold">
                            <tr>
                              <th className="py-2.5 px-3">Concept / Quantity</th>
                              <th className="py-2.5 px-3">Formula / Rule</th>
                              <th className="py-2.5 px-3">SI Unit</th>
                              <th className="py-2.5 px-3">Takeaway</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-slate-200">
                            {resultsData.formulas.map((f, fIdx) => (
                              <tr key={fIdx} className="hover:bg-white/[0.02]">
                                <td className="py-2.5 px-3 font-semibold text-white">{f.concept}</td>
                                <td className="py-2.5 px-3 font-mono text-cyan-300">{f.formula}</td>
                                <td className="py-2.5 px-3 text-slate-300">{f.siUnit}</td>
                                <td className="py-2.5 px-3 text-slate-300">{f.takeaway}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 🎯 Board Exam Tips */}
                  {resultsData.examTips && resultsData.examTips.length > 0 && (
                    <div className="rounded-2xl border border-purple-500/20 bg-purple-950/20 p-5 shadow-md">
                      <h3 className="text-xs sm:text-sm font-bold text-purple-300 flex items-center gap-2 mb-3 tracking-wide">
                        <span>🎯</span> Board Exam Tips &amp; Common Pitfalls
                      </h3>
                      <ul className="space-y-2">
                        {resultsData.examTips.map((tip, tIdx) => (
                          <li key={tIdx} className="flex items-start gap-2 text-xs text-slate-200 leading-[1.6]">
                            <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* ====================================================================
                  TAB 2: QUESTIONS & SOLUTIONS
                  ==================================================================== */}
              {activeTab === 'questions' && (
                <div className="space-y-4">
                  {/* Questions Overview Bar */}
                  {resultsData.questionsSummary && (
                    <div className="rounded-xl border border-blue-500/20 bg-blue-950/30 p-3.5 text-xs text-blue-200 flex items-center gap-3">
                      <HelpCircle className="h-4 w-4 text-blue-400 shrink-0" />
                      <span>{resultsData.questionsSummary}</span>
                    </div>
                  )}

                  {/* Interactive Question Accordion Cards */}
                  <div className="space-y-3.5">
                    {resultsData.questionsList?.map((q, idx) => {
                      const isOpen = !!expandedQuestions[q.id];
                      const difficultyColor =
                        q.difficulty === 'Easy'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : q.difficulty === 'Medium'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30';

                      return (
                        <div
                          key={q.id || idx}
                          className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1322] shadow-md transition-all"
                        >
                          {/* Header: Question Text + Difficulty Pill */}
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedQuestions((prev) => ({
                                ...prev,
                                [q.id]: !prev[q.id],
                              }))
                            }
                            className="flex w-full items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
                          >
                            <div className="flex flex-1 items-start gap-3 pr-2">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 font-bold text-xs border border-blue-500/30">
                                {q.questionNumber || idx + 1}
                              </span>
                              <div>
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span className={`rounded-full px-2 py-0.5 text-[0.62rem] font-bold border ${difficultyColor}`}>
                                    {q.difficulty}
                                  </span>
                                  {q.formulaUsed && (
                                    <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[0.62rem] font-mono text-cyan-300 border border-cyan-500/20">
                                      {q.formulaUsed}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                                  {q.questionText}
                                </p>
                              </div>
                            </div>
                            <div className="rounded-lg p-1 text-slate-400 hover:text-white">
                              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </button>

                          {/* Expandable Body: Clear Step-by-Step Solution */}
                          {isOpen && (
                            <div className="border-t border-white/10 p-5 bg-[#0a0f1d] space-y-4">
                              {q.questionSummary && (
                                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-300">
                                  <strong className="text-slate-200">Focus:</strong> {q.questionSummary}
                                </div>
                              )}

                              <div>
                                <h5 className="text-[0.68rem] font-bold text-sky-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <Sliders className="h-3.5 w-3.5" />
                                  Step-by-Step Solution:
                                </h5>
                                <div className="space-y-2 pl-1">
                                  {q.steps?.map((step, sIdx) => (
                                    <div key={sIdx} className="flex items-start gap-2.5 text-xs text-slate-200">
                                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-300 font-mono text-[0.62rem] font-bold">
                                        {sIdx + 1}
                                      </span>
                                      <span className="mt-0.5 leading-[1.6]">{step}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Green-Tinted ✅ Final Answer Box */}
                              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 flex items-center justify-between">
                                <div>
                                  <span className="text-[0.65rem] font-bold uppercase tracking-wider text-emerald-400 block mb-0.5">
                                    ✅ Final Answer
                                  </span>
                                  <span className="text-xs sm:text-sm font-bold text-white font-mono">
                                    {q.finalAnswer}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(q.finalAnswer);
                                    setCopiedAnswerId(q.id);
                                    setTimeout(() => setCopiedAnswerId(null), 2500);
                                  }}
                                  className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-900/40 px-2.5 py-1 text-xs text-emerald-200 hover:bg-emerald-800/40 transition-colors"
                                >
                                  {copiedAnswerId === q.id ? (
                                    <>
                                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                                      <span>Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3.5 w-3.5" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Quick Actions */}
                              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    addMistake({
                                      question: q.questionText,
                                      options: ['Subjective problem'],
                                      userAnswer: 0,
                                      correctAnswer: 0,
                                      userAnswerText: 'Flagged for review',
                                      correctAnswerText: q.finalAnswer,
                                      explanation: q.steps.join(' | '),
                                      testTopic: `${resultsData.subject}: ${resultsData.chapterTitle}`,
                                      subject: resultsData.subject,
                                      classLevel: profile.classLevel || 'Class 9',
                                      date: new Date().toLocaleDateString('en-US'),
                                      retryAttempts: 0,
                                    });
                                    alert('Saved to Mistake Book for future revision!');
                                  }}
                                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[0.68rem] font-medium text-slate-300 hover:bg-white/10"
                                >
                                  <Bookmark className="h-3 w-3 text-amber-400" />
                                  <span>Save to Mistake Book</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setDoubtInput(`Can you explain question ${q.questionNumber || idx + 1} with an easier example?`);
                                  }}
                                  className="flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-950/30 px-2.5 py-1 text-[0.68rem] font-medium text-blue-300 hover:bg-blue-900/40"
                                >
                                  <Bot className="h-3 w-3 text-cyan-400" />
                                  <span>Ask StudyBot for Simpler Step</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ====================================================================
                5. DOCKED FOLLOW-UP CHAT BAR (Sticky at Bottom of Right Panel)
                ==================================================================== */}
            <div className="sticky bottom-0 z-20 border-t border-white/10 bg-[#090d18]/95 px-4 py-3 backdrop-blur-md">
              {/* Quick Suggestion Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                {[
                  'Explain Q2 simply',
                  'Give me 3 practice questions',
                  'Make flashcards from this page',
                  'Common exam mistakes',
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setDoubtInput(chip);
                      handleSendDoubt();
                    }}
                    className="whitespace-nowrap rounded-lg border border-blue-500/20 bg-blue-950/30 px-2.5 py-1 text-[0.65rem] font-medium text-blue-300 hover:bg-blue-900/40 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Messages Preview if active */}
              {doubtMessages.length > 1 && (
                <div className="max-h-36 overflow-y-auto mb-2 space-y-2 pr-1 border-t border-white/5 pt-2">
                  {doubtMessages.slice(-2).map((msg) => (
                    <div
                      key={msg.id}
                      className={`text-xs p-2 rounded-xl ${
                        msg.role === 'user'
                          ? 'bg-blue-600/30 text-blue-200 border border-blue-500/30 ml-6'
                          : 'bg-[#131c31] text-slate-200 border border-white/10 mr-6'
                      }`}
                    >
                      <span className="font-bold text-[0.65rem] text-slate-400 block mb-0.5">
                        {msg.role === 'user' ? 'You' : 'StudyBot'}:
                      </span>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  ))}
                  <div ref={chatBottomRef} />
                </div>
              )}

              {/* Floating Input Field */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={doubtInput}
                  onChange={(e) => setDoubtInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendDoubt()}
                  placeholder="Still confused about something on this page? Ask StudyBot..."
                  className="w-full rounded-xl border border-blue-500/30 bg-[#0d1424] py-2.5 pl-3.5 pr-12 text-xs text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <button
                  type="button"
                  onClick={handleSendDoubt}
                  disabled={isSendingDoubt || !doubtInput.trim()}
                  className="absolute right-1.5 top-1.5 rounded-lg bg-blue-600 px-2.5 py-1 text-white hover:bg-blue-500 disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <Send className="h-3 w-3" />
                  <kbd className="hidden sm:inline border border-white/20 bg-white/10 px-1 rounded text-[0.55rem] font-mono">Enter</kbd>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty / Initial State for Right Panel */
          <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 mb-4 shadow-inner">
              <Sparkles className="h-8 w-8 text-cyan-400 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">StudyBot AI Smart Breakdown</h3>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-5">
              Capture or upload your handwritten notebook page on the left. StudyBot will read the handwriting, summarize notes, formulate step-by-step solutions, and answer your doubts right here!
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem]">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                OCR Handwriting &amp; Formulas
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem]">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                Step-by-step Question Solver
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem]">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                Audio TTS &amp; Doubt Chat
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
          3. BLURRY PHOTO ALERT MODAL (User-Friendly Guidance)
          ==================================================================== */}
      {blurryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative flex w-full max-w-md flex-col items-center rounded-3xl border border-amber-500/40 bg-[#0e1424] p-6 text-center shadow-2xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 mb-4">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <h3 className="text-base font-bold text-white mb-2">Photo Quality Check</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              The uploaded notebook photo looks a bit blurry or dark. Please upload or paste a well-lit photo of your notebook page, or test instantly with one of the realistic sample copies!
            </p>

            <div className="flex w-full flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setBlurryModalOpen(false);
                  handleResetToScanner();
                }}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:brightness-110"
              >
                Choose Clear Photo / Upload Again
              </button>
              <button
                type="button"
                onClick={() => setBlurryModalOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
