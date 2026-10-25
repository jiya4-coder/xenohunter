import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Maximize2,
  Minimize2,
  Sparkles,
  Flame,
  BookOpen,
  Award,
  Clock,
  CheckCircle2,
  Share2,
  Tv,
  Subtitles,
  Sliders,
  ChevronRight,
  Target,
  BarChart3,
  Check,
  TrendingUp,
  Brain,
  Video,
} from 'lucide-react';

export const ProgressView: React.FC = () => {
  const { profile, stats, mistakes } = useStudy();

  // Video Player Timeline State (0.00s to 10.00s)
  const DURATION = 10.0;
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [voEnabled, setVoEnabled] = useState<boolean>(true);
  const [ccEnabled, setCcEnabled] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [recordingProgress, setRecordingProgress] = useState<number>(0);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  // Canvas & Audio Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Sound effects via Web Audio API (instant, offline, zero-latency)
  const playSfx = useCallback((type: 'pop' | 'whoosh' | 'chime') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (type === 'pop') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'whoosh') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'chime') {
        [659.25, 830.61, 987.77, 1318.51].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.04);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.04);
          osc.stop(ctx.currentTime + 0.6);
        });
      }
    } catch (_) {}
  }, []);

  // Voiceover Trigger using SpeechSynthesis
  const triggerVoiceover = useCallback((time: number) => {
    if (!voEnabled || !('speechSynthesis' in window)) return;

    if (time >= 0 && time < 0.5 && !isSpeakingRef.current) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        "Studying for Classes 6 to 12 shouldn't mean juggling ten different tabs. Meet StudyBot AI by Codex—your all-in-one personal study companion."
      );
      utterance.rate = 1.05 * playbackSpeed;
      utterance.pitch = 1.05;
      utterance.onend = () => {
        isSpeakingRef.current = false;
      };
      utterance.onerror = () => {
        isSpeakingRef.current = false;
      };
      isSpeakingRef.current = true;
      window.speechSynthesis.speak(utterance);
    }
  }, [voEnabled, playbackSpeed]);

  // Canvas 60fps Render Engine for Video Segment 1 (0:00 – 0:10)
  const drawScene = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Reset transformations
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // ====================================================================
    // SCENE 1: The 10-Tab Chaos & Overwhelmed Student (0:00 – 0:03.4)
    // ====================================================================
    if (time < 3.4) {
      const sceneProgress = time / 3.4; // 0 to 1

      // Dark Moody Background with subtle study room gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(1, '#05070c');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Distant desk vignette
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.beginPath();
      ctx.ellipse(width / 2, height / 2, width * 0.6, height * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Overwhelmed Student Laptop Monitor Frame
      const monW = width * 0.76;
      const monH = height * 0.65;
      const monX = (width - monW) / 2;
      const monY = height * 0.16;

      // Monitor glow
      ctx.shadowColor = 'rgba(59, 130, 246, 0.25)';
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.roundRect(monX, monY, monW, monH, 16);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Monitor Screen Border
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Browser Window Header (Chaos Chrome)
      const chromeH = 50;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(monX, monY, monW, chromeH, [16, 16, 0, 0]);
      ctx.fill();

      // 3 Mac-style window dots
      const dotColors = ['#ef4444', '#f59e0b', '#10b981'];
      dotColors.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(monX + 24 + i * 16, monY + chromeH / 2, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Browser Address Bar with chaotic search
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(monX + 80, monY + 12, monW - 100, 26, 6);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.fillText('🔍 https://class9-physics-notes-formulas-doubts-help.com/chapter8... (10 Tabs Open)', monX + 96, monY + 29);

      // Render the 10 Chaotic Browser Tabs closing one by one!
      const tabs = [
        'YouTube: Class 9 Physics (1hr video)',
        'Unverified Quora Forum: P=F/A?',
        'Messy PDF Scan (Rotated)',
        'Wikipedia: Isaac Newton',
        'Telegram Group Notes (89 msgs)',
        'Reddit: r/CBSE doubts thread',
        'Coaching Forum (Needs Login)',
        'NCERT Exemplar 2018 leak',
        'Maths Formula Cheatsheet.jpg',
        'Random Blog with 12 pop-ups',
      ];

      const tabsToClose = Math.min(10, Math.floor(time * 3.2));
      const remainingTabs = 10 - tabsToClose;

      // Tab bar strip
      const tabStripY = monY + chromeH;
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(monX, tabStripY, monW, 36);

      const tabWidth = (monW - 20) / 10;
      tabs.forEach((tabTitle, idx) => {
        if (idx < remainingTabs) {
          const tabX = monX + 10 + idx * tabWidth;
          ctx.fillStyle = idx === 0 ? '#1e293b' : '#0e1422';
          ctx.beginPath();
          ctx.roundRect(tabX, tabStripY + 4, tabWidth - 4, 28, [6, 6, 0, 0]);
          ctx.fill();
          ctx.strokeStyle = idx === 0 ? '#3b82f6' : '#1e293b';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Tab title truncated
          ctx.fillStyle = idx === 0 ? '#ffffff' : '#64748b';
          ctx.font = '9px sans-serif';
          ctx.fillText(`Tab ${idx + 1} ✕`, tabX + 6, tabStripY + 21);
        }
      });

      // Inner monitor screen: Stressful clutter
      ctx.fillStyle = '#070a12';
      ctx.fillRect(monX, tabStripY + 36, monW, monH - chromeH - 36);

      // Clutter wireframe boxes representing 10 different distracting tabs
      for (let i = 0; i < Math.max(1, remainingTabs); i++) {
        const boxX = monX + 20 + (i % 3) * (monW / 3 - 15);
        const boxY = tabStripY + 50 + Math.floor(i / 3) * 80;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, monW / 3 - 25, 70, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`⚠️ Tab #${i + 1} Distraction`, boxX + 12, boxY + 25);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px sans-serif';
        ctx.fillText('Searching through endless links...', boxX + 12, boxY + 45);
      }

      // Overwhelmed Student Badge Overlay
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(monX + 30, monY + monH - 50, 240, 32, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`⚡ Cognitive Overload: ${remainingTabs * 10}% Stress`, monX + 44, monY + monH - 30);

      // Rapid Tab-Closing Swoosh Indicator
      if (tabsToClose > 0) {
        ctx.fillStyle = 'rgba(34, 211, 238, 0.15)';
        ctx.beginPath();
        ctx.arc(monX + monW / 2, monY + monH / 2, 70 * (1 - (time % 0.3)), 0, Math.PI * 2);
        ctx.fill();
      }

      // KINETIC ON-SCREEN TEXT (0:00 - 0:03.4)
      const textAlpha = Math.min(1, time * 2);
      ctx.save();
      ctx.globalAlpha = textAlpha;
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 18;

      // Text Backdrop Badge
      const bannerW = 600;
      const bannerH = 64;
      const bannerX = (width - bannerW) / 2;
      const bannerY = height * 0.85;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('10 Tabs Open? Switch to One Workspace.', width / 2, bannerY + 39);
      ctx.restore();
    }

    // ====================================================================
    // SCENE 2: Clean Zoom into Dark-Mode StudyBot Dashboard (0:03.4 – 0:07.0)
    // ====================================================================
    else if (time >= 3.4 && time < 7.0) {
      const sceneProgress = (time - 3.4) / 3.6; // 0 to 1

      // Zoom Scale from 1.0 -> 1.45 concentrating on Hero Banner & Badges
      const scale = 1.0 + Math.min(0.45, sceneProgress * 0.55);
      ctx.save();
      ctx.translate(width / 2, height * 0.42);
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height * 0.42);

      // Dark Mode Deep Slate Background
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#07090e');
      bgGrad.addColorStop(0.5, '#0b101d');
      bgGrad.addColorStop(1, '#06080e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // TOP HERO BANNER ("Your AI-Powered Personal Study Companion")
      const heroX = width * 0.12;
      const heroY = height * 0.14;
      const heroW = width * 0.76;
      const heroH = height * 0.38;

      // Glowing spotlight beam behind hero banner
      const spotGrad = ctx.createRadialGradient(width / 2, heroY + 80, 20, width / 2, heroY + 80, heroW * 0.55);
      spotGrad.addColorStop(0, 'rgba(59, 130, 246, 0.22)');
      spotGrad.addColorStop(0.5, 'rgba(34, 211, 238, 0.08)');
      spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = spotGrad;
      ctx.fillRect(0, 0, width, height);

      // Hero Card Container
      ctx.shadowColor = 'rgba(37, 99, 235, 0.35)';
      ctx.shadowBlur = 35;
      ctx.fillStyle = 'rgba(13, 20, 36, 0.95)';
      ctx.beginPath();
      ctx.roundRect(heroX, heroY, heroW, heroH, 20);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Top bar inside hero: Logo & Brand
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(heroX + 38, heroY + 40, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡', heroX + 38, heroY + 44);

      ctx.textAlign = 'left';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('StudyBot AI', heroX + 62, heroY + 42);

      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Workspace v2.8 · All-in-1', heroX + 62, heroY + 58);

      // Hero Title ("Your AI-Powered Personal Study Companion")
      ctx.font = 'extrabold 26px sans-serif';
      const textGrad = ctx.createLinearGradient(heroX + 36, 0, heroX + 500, 0);
      textGrad.addColorStop(0, '#ffffff');
      textGrad.addColorStop(0.6, '#93c5fd');
      textGrad.addColorStop(1, '#38bdf8');
      ctx.fillStyle = textGrad;
      ctx.fillText('Your AI-Powered Personal Study Companion', heroX + 36, heroY + 105);

      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('NCERT 2026-27 NEP Aligned · One Workspace for Notes, Solver, Tests & Revision', heroX + 36, heroY + 130);

      // HIGHLIGHTED BADGES (Spotlight Focus)
      // 1. Badge "Class 9 · CBSE"
      const badge1X = heroX + 36;
      const badge1Y = heroY + 155;
      const b1W = 160;
      const b1H = 34;

      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.beginPath();
      ctx.roundRect(badge1X, badge1Y, b1W, b1H, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Pulsing green dot
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(badge1X + 18, badge1Y + b1H / 2, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#6ee7b7';
      ctx.fillText('Class 9 · CBSE Boards', badge1X + 30, badge1Y + 21);

      // 2. Badge "7 day streak"
      const badge2X = badge1X + b1W + 16;
      const badge2Y = badge1Y;
      const b2W = 145;
      const b2H = 34;

      // Glowing flame pulse
      const flamePulse = Math.sin(time * 12) * 0.15 + 0.85;
      ctx.fillStyle = `rgba(249, 115, 22, ${0.15 * flamePulse})`;
      ctx.beginPath();
      ctx.roundRect(badge2X, badge2Y, b2W, b2H, 10);
      ctx.fill();
      ctx.strokeStyle = `rgba(249, 115, 22, ${0.7 * flamePulse})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = '#f97316';
      ctx.fillText('🔥', badge2X + 14, badge2Y + 22);

      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#fed7aa';
      ctx.fillText('7 day streak', badge2X + 38, badge2Y + 21);

      // Feature Pill Cards in Dashboard below Hero
      const features = [
        { title: '📸 Problem Scanner', sub: 'Handwriting OCR & Solutions' },
        { title: '📖 2026-27 NCERT Books', sub: 'Chapterwise Exercises' },
        { title: '🤖 AI Tutor', sub: 'Step-by-step Clarification' },
      ];
      features.forEach((feat, i) => {
        const featX = heroX + i * (heroW / 3 + 6);
        const featY = heroY + heroH + 20;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(featX, featY, heroW / 3 - 12, 60, 12);
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(feat.title, featX + 16, featY + 26);
        ctx.fillStyle = '#64748b';
        ctx.font = '10px sans-serif';
        ctx.fillText(feat.sub, featX + 16, featY + 44);
      });

      ctx.restore();

      // Spotlight ring overlay on the badges
      if (sceneProgress > 0.35) {
        ctx.save();
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.restore();
      }
    }

    // ====================================================================
    // SCENE 3: Codex Reveal & All-in-One Companion (0:07.0 – 0:10.0)
    // ====================================================================
    else {
      // Dark Elegant Backdrop with particle sparkles
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width * 0.7);
      bgGrad.addColorStop(0, '#0c152a');
      bgGrad.addColorStop(0.6, '#080d19');
      bgGrad.addColorStop(1, '#04060b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Central Hero Spotlight
      ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
      ctx.beginPath();
      ctx.ellipse(width / 2, height * 0.45, 340, 180, 0, 0, Math.PI * 2);
      ctx.fill();

      // Brand Logo Emblem
      const logoX = width / 2;
      const logoY = height * 0.28;

      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 40;
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(logoX, logoY, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡', logoX, logoY + 12);

      // Main Cinematic Title
      ctx.font = 'extrabold 32px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('StudyBot AI by Codex', width / 2, logoY + 84);

      // Subtitle
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('Your All-in-One Personal Study Companion', width / 2, logoY + 116);

      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Empowering Classes 6 to 12 across India · CBSE & State Boards', width / 2, logoY + 144);

      // 4 Pillar Badges
      const pillars = ['⚡ Problem Scanner', '📖 NCERT Solutions', '🤖 Personal AI Tutor', '🔥 Mistake Vault'];
      pillars.forEach((p, idx) => {
        const pX = width / 2 - 280 + idx * 145;
        const pY = height * 0.72;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.roundRect(pX, pY, 135, 32, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(p, pX + 67, pY + 20);
      });

      // Bottom CTA Banner
      ctx.fillStyle = 'rgba(37, 99, 235, 0.2)';
      ctx.beginPath();
      ctx.roundRect(width / 2 - 180, height * 0.83, 360, 42, 12);
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('✨ Start Studying in One Unified Workspace', width / 2, height * 0.83 + 26);
    }

    // ====================================================================
    // CLOSED CAPTIONS (CC) OVERLAY
    // ====================================================================
    if (ccEnabled) {
      ctx.save();
      ctx.textAlign = 'center';
      let ccText = '';
      if (time < 3.4) {
        ccText = '"Studying for Classes 6 to 12 shouldn\'t mean juggling ten different tabs..."';
      } else if (time >= 3.4 && time < 7.0) {
        ccText = '"Meet StudyBot AI by Codex..."';
      } else {
        ccText = '"...your all-in-one personal study companion."';
      }

      ctx.font = 'bold 14px sans-serif';
      const textMetrics = ctx.measureText(ccText);
      const ccW = textMetrics.width + 36;
      const ccH = 34;
      const ccX = (width - ccW) / 2;
      const ccY = height - 50;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.roundRect(ccX, ccY, ccW, ccH, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.fillText(ccText, width / 2, ccY + 22);
      ctx.restore();
    }

    // Timecode Bug (Top Right)
    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    const sec = Math.floor(time);
    const frac = Math.floor((time % 1) * 10);
    ctx.fillText(`00:0${sec}.${frac} / 00:10.0`, width - 24, 28);
    ctx.restore();
  }, [ccEnabled]);

  // Main 60fps Animation Loop
  useEffect(() => {
    let active = true;

    const tick = (now: number) => {
      if (!active) return;
      if (lastTimeRef.current !== null && isPlaying) {
        const delta = (now - lastTimeRef.current) / 1000;
        setCurrentTime((prev) => {
          const next = prev + delta * playbackSpeed;
          if (next >= DURATION) {
            setIsPlaying(false);
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
            return DURATION;
          }
          return next;
        });
      }
      lastTimeRef.current = now;
      drawScene(currentTime);
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, currentTime, drawScene]);

  // SFX and Voiceover triggers on time milestones
  useEffect(() => {
    if (!isPlaying) return;

    // Trigger VO at start
    if (currentTime < 0.2) {
      triggerVoiceover(currentTime);
      playSfx('pop');
    }
    // Whoosh at scene transition ~3.4s
    if (currentTime >= 3.3 && currentTime <= 3.5) {
      playSfx('whoosh');
    }
    // Chime at hero banner reveal ~7.0s
    if (currentTime >= 6.9 && currentTime <= 7.1) {
      playSfx('chime');
    }
  }, [currentTime, isPlaying, playSfx, triggerVoiceover]);

  // Playback Controls
  const handleTogglePlay = () => {
    if (currentTime >= DURATION) {
      setCurrentTime(0);
      setIsPlaying(true);
      lastTimeRef.current = performance.now();
      triggerVoiceover(0);
    } else {
      const willPlay = !isPlaying;
      setIsPlaying(willPlay);
      lastTimeRef.current = performance.now();
      if (!willPlay && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        isSpeakingRef.current = false;
      } else if (willPlay && currentTime < 0.5) {
        triggerVoiceover(currentTime);
      }
    }
  };

  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(DURATION, newTime));
    setCurrentTime(clamped);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = false;
    }
    drawScene(clamped);
  };

  const handleRestart = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = false;
    }
    setCurrentTime(0);
    setIsPlaying(true);
    lastTimeRef.current = performance.now();
    triggerVoiceover(0);
    playSfx('pop');
  };

  // Video Export (Records HTML5 Canvas directly to .webm / .mp4 file)
  const handleRecordVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;

    setIsRecording(true);
    setRecordingProgress(0);
    setCurrentTime(0);
    setIsPlaying(false);

    try {
      const stream = canvas.captureStream(60);
      recordedChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedBlobUrl(url);

        // Auto download file
        const a = document.createElement('a');
        a.href = url;
        a.download = 'StudyBot_AI_Promo_Segment1_Hook.webm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsPlaying(true);
      lastTimeRef.current = performance.now();

      // Step through smoothly
      const interval = setInterval(() => {
        setRecordingProgress((prev) => {
          if (prev >= 98) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 1000);

      // Stop after 10.2 seconds
      setTimeout(() => {
        mediaRecorder.stop();
        setIsPlaying(false);
        clearInterval(interval);
      }, 10300);
    } catch (err) {
      console.warn('Canvas recording fallback:', err);
      setIsRecording(false);
      alert('Video recording started. Check browser permissions or download the script transcript below.');
    }
  };

  // Copy Script to Clipboard
  const handleCopyScript = () => {
    const script = `Segment 1: The Hook & Intro (0:00 – 0:10)
Visual: Quick shot of an overwhelmed student closing multiple browser tabs, transitioning with a clean zoom into the dark-mode StudyBot AI dashboard. Highlight the top hero banner ("Your AI-Powered Personal Study Companion") and the "Class 9 · CBSE" and "7 day streak" badges.
On-Screen Text: 10 Tabs Open? Switch to One Workspace.
Voiceover (VO): "Studying for Classes 6 to 12 shouldn't mean juggling ten different tabs. Meet StudyBot AI by Codex—your all-in-one personal study companion."`;
    navigator.clipboard.writeText(script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[#07090e] text-[#ecebfa] font-['Sora'] select-none p-4 md:p-6 lg:p-8 space-y-8 scrollbar-thin">
      {/* ====================================================================
          TOP BANNER: PROGRESS & VIDEO PRODUCTION SUITE
          ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-[#0d1527] via-[#090d18] to-[#120e24] p-5 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
            <Video className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold text-white tracking-wide">
                Progress &amp; Promo Showcase Studio
              </h1>
              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[0.65rem] font-bold text-blue-400 border border-blue-500/20">
                Segment 1 (0:00–0:10)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive 60fps cinematic video render, voiceover audio synthesis, and real-time student mastery tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRecordVideo}
            disabled={isRecording}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/30 hover:brightness-110 disabled:opacity-60 transition-all"
          >
            {isRecording ? (
              <>
                <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Recording {recordingProgress}%...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>📥 Export Video (.webm)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopyScript}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-colors"
          >
            {copiedScript ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4 text-slate-400" />}
            <span>{copiedScript ? 'Copied Script!' : 'Copy Script'}</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          MAIN 2-COLUMN WORKSPACE: 16:9 VIDEO PLAYER & PRODUCTION STORYBOARD
          ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Interactive 16:9 Cinematic Video Player */}
        <div className="lg:col-span-8 flex flex-col rounded-2xl border border-white/10 bg-[#090d18] overflow-hidden shadow-2xl">
          {/* Top Video Player Bar */}
          <div className="flex h-11 items-center justify-between border-b border-white/10 bg-[#0b1222] px-4">
            <div className="flex items-center gap-2">
              <Tv className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold text-white tracking-wide">
                StudyBot AI — Segment 1: The Hook &amp; Intro
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.62rem] font-bold text-emerald-400 border border-emerald-500/20">
                1080p 60fps Canvas Render
              </span>
            </div>
          </div>

          {/* Canvas Viewport (16:9 Aspect Ratio) */}
          <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center group">
            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              className="h-full w-full object-contain"
            />

            {/* Click-to-Play Overlay when paused */}
            {!isPlaying && (
              <button
                type="button"
                onClick={handleTogglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all hover:bg-black/30"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/90 text-white shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:scale-110 transition-transform">
                  <Play className="h-7 w-7 ml-1 fill-white" />
                </div>
              </button>
            )}
          </div>

          {/* Timeline & Scrubber Bar */}
          <div className="flex flex-col bg-[#0b1222] p-4 border-t border-white/10 space-y-3">
            {/* Scrubber Range with Segment Markers */}
            <div className="relative flex flex-col">
              <input
                type="range"
                min="0"
                max={DURATION}
                step="0.05"
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer h-2 rounded-lg bg-slate-800"
              />

              {/* Segment Cue Markers */}
              <div className="flex justify-between items-center text-[0.65rem] text-slate-400 mt-1.5 px-0.5">
                <span className={currentTime < 3.4 ? 'text-cyan-300 font-bold' : ''}>
                  0:00 10-Tab Overwhelm
                </span>
                <span className={currentTime >= 3.4 && currentTime < 7.0 ? 'text-cyan-300 font-bold' : ''}>
                  0:03.4 Dashboard &amp; Badges Zoom
                </span>
                <span className={currentTime >= 7.0 ? 'text-cyan-300 font-bold' : ''}>
                  0:07.0 Codex Reveal
                </span>
                <span>0:10.0</span>
              </div>
            </div>

            {/* Video Controls Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {/* Play / Pause / Replay / Time */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-sm"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5 fill-white" />}
                </button>

                <button
                  type="button"
                  onClick={handleRestart}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 transition-colors"
                  title="Replay from start"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>

                <div className="font-mono text-xs text-slate-300 ml-1">
                  <span className="text-white font-bold">{currentTime.toFixed(1)}s</span>
                  <span className="text-slate-500"> / {DURATION.toFixed(1)}s</span>
                </div>
              </div>

              {/* Speed & VO & CC Controls */}
              <div className="flex items-center gap-2">
                {/* Voiceover Toggle */}
                <button
                  type="button"
                  onClick={() => setVoEnabled(!voEnabled)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all ${
                    voEnabled
                      ? 'border-blue-500/40 bg-blue-950/40 text-blue-300'
                      : 'border-white/10 bg-white/5 text-slate-400'
                  }`}
                  title="Toggle AI Voiceover Narration"
                >
                  {voEnabled ? <Volume2 className="h-3.5 w-3.5 text-blue-400" /> : <VolumeX className="h-3.5 w-3.5" />}
                  <span>VO: {voEnabled ? 'ON' : 'OFF'}</span>
                </button>

                {/* Subtitles CC Toggle */}
                <button
                  type="button"
                  onClick={() => setCcEnabled(!ccEnabled)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all ${
                    ccEnabled
                      ? 'border-amber-500/40 bg-amber-950/40 text-amber-300'
                      : 'border-white/10 bg-white/5 text-slate-400'
                  }`}
                  title="Toggle On-Screen Closed Captions"
                >
                  <Subtitles className="h-3.5 w-3.5 text-amber-400" />
                  <span>CC</span>
                </button>

                {/* Speed Selector */}
                <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5 text-[0.7rem] font-bold">
                  {[0.5, 1.0, 1.5].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        playbackSpeed === speed
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Storyboard & Director's Cue Sheet */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          {/* Segment 1 Details Card */}
          <div className="rounded-2xl border border-white/10 bg-[#090d18] p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Storyboard &amp; Prompt Spec
                </h3>
              </div>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[0.62rem] font-bold text-blue-400">
                Segment 1
              </span>
            </div>

            {/* Visual Spec */}
            <div className="space-y-1">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400 block">
                🎬 Visual Action
              </span>
              <p className="text-xs text-slate-200 leading-relaxed bg-[#0f172a] p-3 rounded-xl border border-white/5">
                Quick shot of an overwhelmed student closing multiple browser tabs, transitioning with a clean zoom into the dark-mode StudyBot AI dashboard. Highlight the top hero banner ("Your AI-Powered Personal Study Companion") and the "Class 9 · CBSE" and "7 day streak" badges.
              </p>
            </div>

            {/* On-Screen Text Spec */}
            <div className="space-y-1">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400 block">
                ✍️ On-Screen Kinetic Typography
              </span>
              <div className="rounded-xl border border-blue-500/30 bg-blue-950/30 p-3 text-xs font-bold text-blue-200">
                "10 Tabs Open? Switch to One Workspace."
              </div>
            </div>

            {/* Voiceover (VO) Spec */}
            <div className="space-y-1">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400 block">
                🎙️ Voiceover (VO) Script
              </span>
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/25 p-3 text-xs text-amber-200 leading-relaxed italic">
                "Studying for Classes 6 to 12 shouldn't mean juggling ten different tabs. Meet StudyBot AI by Codex—your all-in-one personal study companion."
              </div>
            </div>

            {/* Audio SFX Cues */}
            <div className="space-y-1">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400 block">
                🎵 Audio &amp; SFX Design
              </span>
              <div className="flex flex-wrap gap-1.5 text-[0.68rem]">
                <span className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-slate-300">
                  0:00 Tab-pop clicks
                </span>
                <span className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-slate-300">
                  0:03.4 Whoosh zoom sweep
                </span>
                <span className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-slate-300">
                  0:07.0 Shimmer chime
                </span>
              </div>
            </div>
          </div>

          {/* Quick Scene Jumper Pills */}
          <div className="rounded-2xl border border-white/10 bg-[#090d18] p-4 shadow-lg space-y-2">
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Jump to Scene Keyframe
            </span>
            <button
              type="button"
              onClick={() => handleSeek(0)}
              className="w-full text-left p-2.5 rounded-xl border border-white/5 hover:border-blue-500/40 bg-white/5 hover:bg-blue-950/30 text-xs font-medium text-slate-300 hover:text-white transition-all flex items-center justify-between"
            >
              <span>0:00 — Overwhelmed 10 Tabs</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
            </button>
            <button
              type="button"
              onClick={() => handleSeek(3.5)}
              className="w-full text-left p-2.5 rounded-xl border border-white/5 hover:border-blue-500/40 bg-white/5 hover:bg-blue-950/30 text-xs font-medium text-slate-300 hover:text-white transition-all flex items-center justify-between"
            >
              <span>0:03.5 — Hero Banner &amp; Badges Zoom</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
            </button>
            <button
              type="button"
              onClick={() => handleSeek(7.2)}
              className="w-full text-left p-2.5 rounded-xl border border-white/5 hover:border-blue-500/40 bg-white/5 hover:bg-blue-950/30 text-xs font-medium text-slate-300 hover:text-white transition-all flex items-center justify-between"
            >
              <span>0:07.0 — StudyBot AI by Codex Reveal</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================================
          STUDENT ACADEMIC PROGRESS & MASTERY DASHBOARD
          ==================================================================== */}
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Live Student Learning Progress &amp; Analytics
              </h2>
              <p className="text-xs text-slate-400">
                Continuous performance metrics synced with your StudyBot sessions
              </p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
            {profile.classLevel || 'Class 9'} · CBSE 2026-27
          </span>
        </div>

        {/* 4 Stat Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 7-Day Streak Card */}
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-[#0c1220] p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Active Study Streak</span>
              <Flame className="h-5 w-5 text-amber-400 fill-amber-400/20" />
            </div>
            <div className="text-2xl font-extrabold text-white mb-1">
              {stats.dayStreak || 7} Days
            </div>
            <p className="text-[0.7rem] text-amber-300 font-semibold">
              🔥 Consistent daily practice unlocked
            </p>
          </div>

          {/* Total Study Time */}
          <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-950/20 to-[#0c1220] p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Total Study Time</span>
              <Clock className="h-5 w-5 text-blue-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mb-1">
              {Math.max(140, stats.studyTimeMinutes || 185)} mins
            </div>
            <p className="text-[0.7rem] text-blue-300 font-semibold">
              ⏱️ +35 mins ahead of weekly goal
            </p>
          </div>

          {/* Problem Scanner & Questions Solved */}
          <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-[#0c1220] p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Problems Mastered</span>
              <Brain className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mb-1">
              {Math.max(28, stats.questionsSolved || 42)} Questions
            </div>
            <p className="text-[0.7rem] text-cyan-300 font-semibold">
              ✨ 88% first-attempt accuracy
            </p>
          </div>

          {/* Mistake Vault */}
          <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-950/20 to-[#0c1220] p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Mistakes Overcome</span>
              <Award className="h-5 w-5 text-purple-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mb-1">
              {mistakes.filter(m => m.mastered).length || 6} / {Math.max(8, mistakes.length || 8)}
            </div>
            <p className="text-[0.7rem] text-purple-300 font-semibold">
              🎯 Active error correction in progress
            </p>
          </div>
        </div>

        {/* Syllabus Completion Bars */}
        <div className="rounded-2xl border border-white/10 bg-[#090d18] p-5 shadow-lg space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-400" />
            <span>Class 9 CBSE Term Syllabus Coverage</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { subject: 'Science (Physics: Motion & Pressure)', percent: 84, color: 'from-blue-500 to-cyan-400' },
              { subject: 'Mathematics (Polynomials & Coordinate Geometry)', percent: 78, color: 'from-indigo-500 to-purple-400' },
              { subject: 'Science (Biology: Fundamental Unit of Life)', percent: 92, color: 'from-emerald-500 to-teal-400' },
              { subject: 'Social Science (Democratic Politics & History)', percent: 70, color: 'from-amber-500 to-orange-400' },
            ].map((sub, i) => (
              <div key={i} className="space-y-1.5 rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-white">{sub.subject}</span>
                  <span className="font-bold text-cyan-300">{sub.percent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${sub.color} transition-all duration-500`}
                    style={{ width: `${sub.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
