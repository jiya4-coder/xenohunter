import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  X,
  Check,
  Sliders,
  Sparkles,
  BookOpen,
  Clock,
  Globe,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  Settings,
  User,
  Palette,
  ShieldCheck,
  Cloud,
  HelpCircle,
  Sun,
  Moon,
  Monitor,
  AlarmClock,
  FileText,
  Lock,
  Trash2,
  Zap,
  Bot,
  Crown,
  GraduationCap,
  CheckCircle2,
  Edit3,
  Smartphone,
  Laptop,
  LogOut,
  Download,
  RefreshCw,
  Upload,
  Database,
  Copy,
} from 'lucide-react';
import {
  buildCompletePersonData,
  downloadPersonDataFile,
  getPersonSettings,
  hydrateFromPersonData,
  PersonCompleteData,
  savePersonSettings,
  syncPersonDataToFile,
} from '../data/personDataStore';

const classOptions = [
  'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'
];

const examOptions = [
  'CBSE', 'ICSE / State Board', 'Science Olympiad (NSO)', 'Math Olympiad (IMO)', 'NTSE Foundation', 'School Unit Tests'
];

const languages = ['English', 'Hindi', 'Hinglish'];

const personas = [
  { id: 'Friendly & Encouraging Mentor', name: 'Friendly Mentor', desc: 'Patient, warm, step-by-step encouragement' },
  { id: 'Socratic Tutor', name: 'Socratic Tutor', desc: 'Asks smart questions to help you deduce answers yourself' },
  { id: 'Strict Professor', name: 'Strict Board Examiner', desc: 'Precise exam marks breakdown & strict keyword checks' },
  { id: 'Speed Problem Solver', name: 'Competition Coach', desc: 'Focus on speed shortcuts, elimination tricks, and formulas' },
];

export const CustomizeProfileModal: React.FC = () => {
  const { profile, updateProfile, customizeOpen, setCustomizeOpen } = useStudy();

  const [name, setName] = useState(profile.name || 'Aarav');
  const [cls, setCls] = useState(profile.classLevel || 'Class 9');
  const [exam, setExam] = useState(profile.primaryExam || 'CBSE');
  const [lang, setLang] = useState(profile.language || 'English');
  const [hours, setHours] = useState(profile.dailyHours || 3);
  const [persona, setPersona] = useState(profile.persona || 'Friendly & Encouraging Mentor');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!customizeOpen) return null;

  const handleSave = () => {
    updateProfile({
      name,
      classLevel: cls,
      primaryExam: exam,
      language: lang,
      dailyHours: hours,
      persona,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setCustomizeOpen(false);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[oklch(27%_0.03_264)] bg-[oklch(17.5%_0.025_264)] p-6 md:p-8 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-[oklch(27%_0.03_264)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Customize StudyBot AI</h2>
              <p className="text-xs text-slate-400">Tailor your study partner, syllabus, and difficulty</p>
            </div>
          </div>
          <button
            onClick={() => setCustomizeOpen(false)}
            className="rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 pt-4">
          {/* Scholar Name */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Name / Title</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[oklch(27%_0.03_264)] bg-[oklch(14%_0.02_264)] px-3.5 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
              placeholder="e.g. Scholar, Aryan, Priya..."
            />
          </div>

          {/* Class Level */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-sky-400" /> Class Level
            </label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {classOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCls(c)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                    cls === c
                      ? 'border-purple-500 bg-purple-500/20 text-white'
                      : 'border-[oklch(27%_0.03_264)] bg-[oklch(14%_0.02_264)] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Exam */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Exam Goal</label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {examOptions.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setExam(e)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    exam === e
                      ? 'border-purple-500 bg-purple-500/20 text-white font-bold'
                      : 'border-[oklch(27%_0.03_264)] bg-[oklch(14%_0.02_264)] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {exam === e && '⭐ '}
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-lime-400" /> AI Explanations Language
            </label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {languages.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                    lang === l
                      ? 'border-purple-500 bg-purple-500/20 text-white'
                      : 'border-[oklch(27%_0.03_264)] bg-[oklch(14%_0.02_264)] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {l === 'English' ? '🇬🇧 English' : l === 'Hindi' ? '🇮🇳 Hindi' : '🗣️ Hinglish'}
                </button>
              ))}
            </div>
          </div>

          {/* Tutor Persona */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-pink-400" /> Tutor Personality Style
            </label>
            <div className="space-y-2 mt-1.5">
              {personas.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPersona(p.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    persona === p.id
                      ? 'border-purple-500 bg-purple-500/15 text-white'
                      : 'border-[oklch(27%_0.03_264)] bg-[oklch(14%_0.02_264)] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs md:text-sm text-white">{p.name}</div>
                    <div className="text-[0.7rem] md:text-xs text-slate-400">{p.desc}</div>
                  </div>
                  {persona === p.id && <Check className="h-4 w-4 text-purple-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Daily Hours Goal */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-400" /> Daily Target Hours
              </span>
              <span className="text-purple-400 font-bold">{hours} Hours</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-full mt-2 accent-purple-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-[oklch(27%_0.03_264)]">
          <button
            type="button"
            onClick={() => setCustomizeOpen(false)}
            className="chip !py-2.5 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-mint !text-sm"
          >
            {savedSuccess ? (
              <>
                <Check className="h-4 w-4" /> Saved!
              </>
            ) : (
              'Apply Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

type SettingsSectionId =
  | 'account'
  | 'appearance'
  | 'notifications'
  | 'preferences'
  | 'privacy'
  | 'storage'
  | 'help';

export const SettingsView: React.FC = () => {
  const { profile, updateProfile, clearAllAppData, currentUser, logout } = useStudy();

  const [activeSection, setActiveSection] = useState<SettingsSectionId>('account');
  const [searchQuery, setSearchQuery] = useState('');

  // Editable Profile State
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [nameInput, setNameInput] = useState(
    profile.name && profile.name !== 'Student' ? profile.name : currentUser?.displayName || 'Aarav Sharma'
  );
  const [emailInput, setEmailInput] = useState(
    currentUser?.email || 'aaravsharma@gmail.com'
  );
  const [accountPlan, setAccountPlan] = useState<'Free Plan' | 'Scholar Pro'>('Free Plan');

  // Theme & Notification State persisted via personDataStore
  const initialSettings = getPersonSettings(currentUser?.email);
  const [themeMode, setThemeMode] = useState<'Light' | 'Dark' | 'System'>(
    initialSettings.themeMode
  );
  const [studyRemindersNotif, setStudyRemindersNotif] = useState(
    initialSettings.notifications.studyReminders
  );
  const [testResultsNotif, setTestResultsNotif] = useState(
    initialSettings.notifications.testResults
  );
  const [dailyMotivationNotif, setDailyMotivationNotif] = useState(
    initialSettings.notifications.dailyMotivation
  );

  // Modals / Drawers for Quick Actions & Sub-dialogs
  const [activeModal, setActiveModal] = useState<
    | null
    | 'password'
    | 'devices'
    | 'delete'
    | 'about'
    | 'classPicker'
    | 'langPicker'
    | 'personDataFile'
  >(null);
  const [personDataSnapshot, setPersonDataSnapshot] =
    useState<PersonCompleteData | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

  const handleOpenPersonDataModal = async () => {
    const snap = await syncPersonDataToFile(currentUser?.email);
    setPersonDataSnapshot(snap);
    setActiveModal('personDataFile');
  };

  const handleImportPersonDataFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result || '{}'));
        const personPayload: PersonCompleteData =
          parsed.account && parsed.profile
            ? parsed
            : parsed.persons
            ? (Object.values(parsed.persons)[0] as PersonCompleteData)
            : parsed;
        if (!personPayload || !personPayload.profile) {
          showToast('Invalid person data JSON file.');
          return;
        }
        hydrateFromPersonData(personPayload);
        await syncPersonDataToFile(personPayload.account?.email || currentUser?.email);
        setPersonDataSnapshot(buildCompletePersonData(currentUser?.email));
        showToast('Person data file imported & restored successfully!');
      } catch {
        showToast('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const displayName =
    profile.name && profile.name !== 'Student'
      ? profile.name
      : currentUser?.displayName || 'Aarav Sharma';
  const displayEmail = currentUser?.email || emailInput || 'aaravsharma@gmail.com';
  const displayInitial = (displayName.trim()[0] || 'A').toUpperCase();
  const displayClass = profile.classLevel || 'Class 10';
  const displayLang = profile.language || 'English';

  const handleSaveAccountEdit = () => {
    updateProfile({
      name: nameInput.trim() || 'Aarav Sharma',
    });
    setIsEditingAccount(false);
    showToast('Account profile updated!');
  };

  const handleCycleClass = () => {
    setActiveModal('classPicker');
  };

  const handleCycleLanguage = () => {
    setActiveModal('langPicker');
  };

  const handleCyclePlan = () => {
    const next = accountPlan === 'Free Plan' ? 'Scholar Pro' : 'Free Plan';
    setAccountPlan(next);
    showToast(`Switched display plan to ${next}`);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 6) {
      showToast('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New password and confirmation do not match.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setActiveModal(null);
    showToast('Password updated successfully!');
  };

  const handleConfirmDeleteAccount = () => {
    clearAllAppData();
    setActiveModal(null);
    showToast('All account study data has been permanently cleared.');
    if (currentUser?.email) {
      setTimeout(() => logout(), 900);
    }
  };

  const subNavItems: { id: SettingsSectionId; label: string; icon: React.ElementType }[] = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Study Preferences', icon: BookOpen },
    { id: 'privacy', label: 'Privacy & Security', icon: ShieldCheck },
    { id: 'storage', label: 'Data & Storage', icon: Cloud },
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
  ];

  const scrollToCard = (id: SettingsSectionId) => {
    setActiveSection(id);
    const el = document.getElementById(`settings-card-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] font-['Sora'] text-white select-none pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-blue-400/40 bg-[#0d1c3a] px-4 py-3 text-xs font-semibold text-white shadow-[0_10px_30px_rgba(22,96,216,0.45)] animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar: Search + Notification Bell + User Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-[#182949]/80">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-[600px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6d86b0]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search anything... (chapters, topics, questions)"
            className="w-full rounded-full border border-[#1d325a] bg-[#0b1529] pl-11 pr-4 py-2.5 text-xs md:text-sm text-white placeholder-[#6d86b0] focus:border-blue-500 focus:outline-none shadow-inner transition-colors"
          />
        </div>

        {/* Right Controls: Notification Bell + User Profile Pill */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => scrollToCard('notifications')}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#1a2c4e] bg-[#0b1529] text-slate-200 hover:border-blue-500/50 hover:text-white transition-all cursor-pointer"
            title="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#0b1529]" />
          </button>

          <div className="h-6 w-[1px] bg-[#1a2c4e]" />

          <button
            type="button"
            onClick={() => setIsEditingAccount(true)}
            className="flex items-center gap-3 rounded-2xl border border-transparent hover:border-[#1e355e] bg-transparent hover:bg-[#0b1529]/60 px-2.5 py-1.5 transition-all cursor-pointer"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3b66f5] to-[#2547c8] text-sm font-bold text-white shadow-[0_0_15px_rgba(59,102,245,0.5)]">
              {displayInitial}
            </div>
            <div className="text-left">
              <div className="text-xs md:text-[13px] font-semibold text-white leading-tight">
                {displayName}
              </div>
              <div className="text-[11px] text-[#7b93bc] leading-tight mt-0.5">
                {displayClass}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-[#7b93bc] ml-1" />
          </button>
        </div>
      </div>

      {/* Main Grid Layout: Left/Center Main Settings Container + Right Sidebar Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Main Settings Container Card (8 Columns on xl) */}
        <div className="xl:col-span-8 rounded-[22px] border border-[#1b2f54] bg-gradient-to-b from-[#0b162c] to-[#081121] p-5 md:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
          {/* Settings Title Header */}
          <div className="flex items-center gap-3.5 pb-5 mb-5 border-b border-[#162746]">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#112347] border border-[#274885] text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
              <Settings className="h-6 w-6 text-sky-300" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                Settings
              </h1>
              <p className="text-xs md:text-[13px] text-[#839bc4] mt-0.5">
                Manage your account, preferences and app settings
              </p>
            </div>
          </div>

          {/* Inner 2-Column Layout: Sub-Sidebar + Cards */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* Left Sub-Sidebar (4 cols on md) */}
            <div className="md:col-span-4 rounded-2xl border border-[#172a4c] bg-[#070f20]/90 p-2.5 space-y-1">
              {subNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToCard(item.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-xs md:text-[13px] font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-[#1868e6] to-[#1350b8] text-white font-semibold shadow-[0_4px_16px_rgba(24,104,230,0.4)]'
                        : 'text-[#9bb0d4] hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-[#6c88b8]'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Center Settings Stack (8 cols on md) */}
            <div className="md:col-span-8 space-y-4">
              {/* 1. Account Settings Card */}
              <div
                id="settings-card-account"
                className={`rounded-2xl border transition-all p-5 bg-[#0a1529]/95 ${
                  activeSection === 'account'
                    ? 'border-[#25477e] shadow-[0_0_25px_rgba(29,78,216,0.12)]'
                    : 'border-[#182b4d]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#10203d] border border-[#223c6b] text-sky-400">
                      <User className="h-[18px] w-[18px]" />
                    </div>
                    <div>
                      <h2 className="text-sm md:text-[15px] font-bold text-white">
                        Account Settings
                      </h2>
                      <p className="text-[11.5px] text-[#7f97c0]">
                        Manage your profile and account information
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNameInput(displayName);
                      setIsEditingAccount(!isEditingAccount);
                    }}
                    className="rounded-xl border border-[#274272] bg-[#11203d] hover:bg-[#172b52] px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer"
                  >
                    {isEditingAccount ? 'Cancel' : 'Edit'}
                  </button>
                </div>

                {/* User Avatar + Name & Email */}
                {isEditingAccount ? (
                  <div className="mt-4 rounded-xl border border-[#243f6f] bg-[#071020] p-3.5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-[#7f97c0]">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-[#243f6f] bg-[#0b172e] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-[#7f97c0]">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-[#243f6f] bg-[#0b172e] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleSaveAccountEdit}
                        className="rounded-lg bg-[#1868e6] hover:bg-blue-500 px-4 py-1.5 text-xs font-bold text-white transition-all cursor-pointer"
                      >
                        Save Profile
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-3.5 pb-4 border-b border-[#162747]">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3d68f5] to-[#2647c4] text-lg font-bold text-white shadow-[0_0_20px_rgba(59,102,245,0.45)]">
                      {displayInitial}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm md:text-[15px] font-bold text-white truncate">
                        {displayName}
                      </div>
                      <div className="text-xs text-[#7f97c0] truncate mt-0.5">
                        {displayEmail}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3 Interactive Rows: Class, Preferred Language, Account Type */}
                <div className="divide-y divide-[#152645] mt-1">
                  <button
                    type="button"
                    onClick={handleCycleClass}
                    className="flex w-full items-center justify-between py-3 text-left hover:bg-white/[0.02] rounded-lg px-1.5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 text-xs md:text-[13px] text-slate-200 font-medium">
                      <GraduationCap className="h-4 w-4 text-[#6d8cc2]" />
                      <span>Class</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs md:text-[13px] font-semibold text-white">
                      <span>{displayClass}</span>
                      <ChevronRight className="h-4 w-4 text-[#6d8cc2]" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleCycleLanguage}
                    className="flex w-full items-center justify-between py-3 text-left hover:bg-white/[0.02] rounded-lg px-1.5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 text-xs md:text-[13px] text-slate-200 font-medium">
                      <Globe className="h-4 w-4 text-[#6d8cc2]" />
                      <span>Preferred Language</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs md:text-[13px] font-semibold text-white">
                      <span>{displayLang}</span>
                      <ChevronRight className="h-4 w-4 text-[#6d8cc2]" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleCyclePlan}
                    className="flex w-full items-center justify-between pt-3 pb-1 text-left hover:bg-white/[0.02] rounded-lg px-1.5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 text-xs md:text-[13px] text-slate-200 font-medium">
                      <Crown className="h-4 w-4 text-[#6d8cc2]" />
                      <span>Account Type</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs md:text-[13px] font-semibold text-white">
                      <span>{accountPlan}</span>
                      <ChevronRight className="h-4 w-4 text-[#6d8cc2]" />
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Appearance Card */}
              <div
                id="settings-card-appearance"
                className={`rounded-2xl border transition-all p-5 bg-[#0a1529]/95 ${
                  activeSection === 'appearance'
                    ? 'border-[#25477e] shadow-[0_0_25px_rgba(29,78,216,0.12)]'
                    : 'border-[#182b4d]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#10203d] border border-[#223c6b] text-sky-400">
                    <Palette className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <h2 className="text-sm md:text-[15px] font-bold text-white">
                      Appearance
                    </h2>
                    <p className="text-[11.5px] text-[#7f97c0]">
                      Customize the look and feel of the app
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs font-medium text-[#9bb0d4] mb-2.5">
                    Theme
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {(['Light', 'Dark', 'System'] as const).map((mode) => {
                      const isSelected = themeMode === mode;
                      const ModeIcon =
                        mode === 'Light' ? Sun : mode === 'Dark' ? Moon : Monitor;
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            setThemeMode(mode);
                            savePersonSettings(
                              { themeMode: mode },
                              currentUser?.email
                            );
                            syncPersonDataToFile(currentUser?.email);
                            showToast(`Theme set to ${mode} mode`);
                          }}
                          className={`relative flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-xs md:text-[13px] font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#2d7dff] bg-gradient-to-r from-[#122e66] to-[#102552] text-white shadow-[0_0_20px_rgba(45,125,255,0.28)]'
                              : 'border-[#1a2f54] bg-[#081122] text-[#9bb0d4] hover:border-[#2a477a] hover:text-white'
                          }`}
                        >
                          <ModeIcon
                            className={`h-4 w-4 shrink-0 ${
                              isSelected ? 'text-sky-300' : 'text-[#6c88b8]'
                            }`}
                          />
                          <span>{mode}</span>
                          {isSelected && (
                            <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-[#2575fc] text-white shadow">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Notifications Card */}
              <div
                id="settings-card-notifications"
                className={`rounded-2xl border transition-all p-5 bg-[#0a1529]/95 ${
                  activeSection === 'notifications'
                    ? 'border-[#25477e] shadow-[0_0_25px_rgba(29,78,216,0.12)]'
                    : 'border-[#182b4d]'
                }`}
              >
                <div className="flex items-center gap-3 pb-3 border-b border-[#162747]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#10203d] border border-[#223c6b] text-sky-400">
                    <Bell className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <h2 className="text-sm md:text-[15px] font-bold text-white">
                      Notifications
                    </h2>
                    <p className="text-[11.5px] text-[#7f97c0]">
                      Choose what you want to be notified about
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-[#152645] mt-1">
                  {/* Study Reminders */}
                  <div className="flex items-center justify-between py-3.5 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0e1c36] border border-[#1d345e] text-sky-400">
                        <AlarmClock className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs md:text-[13px] font-bold text-white">
                          Study Reminders
                        </div>
                        <div className="text-[11px] text-[#7f97c0]">
                          Get notified about your study plan and timers
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={studyRemindersNotif}
                      onClick={() => {
                        const nextVal = !studyRemindersNotif;
                        setStudyRemindersNotif(nextVal);
                        savePersonSettings(
                          {
                            notifications: {
                              studyReminders: nextVal,
                              testResults: testResultsNotif,
                              dailyMotivation: dailyMotivationNotif,
                            },
                          },
                          currentUser?.email
                        );
                        syncPersonDataToFile(currentUser?.email);
                        showToast(
                          `Study Reminders ${nextVal ? 'enabled' : 'disabled'}`
                        );
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                        studyRemindersNotif ? 'bg-[#2575fc]' : 'bg-[#1c2e4f]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          studyRemindersNotif ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Test Results */}
                  <div className="flex items-center justify-between py-3.5 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0e1c36] border border-[#1d345e] text-sky-400">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs md:text-[13px] font-bold text-white">
                          Test Results
                        </div>
                        <div className="text-[11px] text-[#7f97c0]">
                          Get notified when your mock test is completed
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={testResultsNotif}
                      onClick={() => {
                        const nextVal = !testResultsNotif;
                        setTestResultsNotif(nextVal);
                        savePersonSettings(
                          {
                            notifications: {
                              studyReminders: studyRemindersNotif,
                              testResults: nextVal,
                              dailyMotivation: dailyMotivationNotif,
                            },
                          },
                          currentUser?.email
                        );
                        syncPersonDataToFile(currentUser?.email);
                        showToast(
                          `Test Results notifications ${
                            nextVal ? 'enabled' : 'disabled'
                          }`
                        );
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                        testResultsNotif ? 'bg-[#2575fc]' : 'bg-[#1c2e4f]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          testResultsNotif ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Daily Motivation */}
                  <div className="flex items-center justify-between pt-3.5 pb-1 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0e1c36] border border-[#1d345e] text-sky-400">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs md:text-[13px] font-bold text-white">
                          Daily Motivation
                        </div>
                        <div className="text-[11px] text-[#7f97c0]">
                          Receive motivational quotes
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={dailyMotivationNotif}
                      onClick={() => {
                        const nextVal = !dailyMotivationNotif;
                        setDailyMotivationNotif(nextVal);
                        savePersonSettings(
                          {
                            notifications: {
                              studyReminders: studyRemindersNotif,
                              testResults: testResultsNotif,
                              dailyMotivation: nextVal,
                            },
                          },
                          currentUser?.email
                        );
                        syncPersonDataToFile(currentUser?.email);
                        showToast(
                          `Daily Motivation ${
                            nextVal ? 'enabled' : 'disabled'
                          }`
                        );
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                        dailyMotivationNotif ? 'bg-[#2575fc]' : 'bg-[#1c2e4f]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          dailyMotivationNotif ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Conditional Study Preferences Card when selected from left nav */}
              {activeSection === 'preferences' && (
                <div
                  id="settings-card-preferences"
                  className="rounded-2xl border border-[#25477e] bg-[#0a1529]/95 p-5 space-y-4 shadow-[0_0_25px_rgba(29,78,216,0.12)]"
                >
                  <div className="flex items-center gap-3 pb-2 border-b border-[#162747]">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#10203d] border border-[#223c6b] text-sky-400">
                      <BookOpen className="h-[18px] w-[18px]" />
                    </div>
                    <div>
                      <h2 className="text-sm md:text-[15px] font-bold text-white">
                        Study Preferences
                      </h2>
                      <p className="text-[11.5px] text-[#7f97c0]">
                        Customize your target exam, daily study hours, and AI tutor style
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#9bb0d4]">
                      Target Exam Goal
                    </label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {examOptions.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => {
                            updateProfile({ primaryExam: e });
                            showToast(`Target exam updated to ${e}`);
                          }}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            profile.primaryExam === e
                              ? 'border-[#2d7dff] bg-[#1660d8] text-white'
                              : 'border-[#1a2f54] bg-[#081122] text-[#9bb0d4] hover:text-white'
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-semibold text-[#9bb0d4]">
                      <span>Daily Target Study Hours</span>
                      <span className="text-sky-400 font-bold">
                        {profile.dailyHours || 3} Hours / day
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      value={profile.dailyHours || 3}
                      onChange={(e) =>
                        updateProfile({ dailyHours: Number(e.target.value) })
                      }
                      className="w-full mt-2 accent-[#2575fc] cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Conditional Data & Storage Card when selected from left nav */}
              {activeSection === 'storage' && (
                <div
                  id="settings-card-storage"
                  className="rounded-2xl border border-[#25477e] bg-[#0a1529]/95 p-5 space-y-4 shadow-[0_0_25px_rgba(29,78,216,0.12)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#10203d] border border-[#223c6b] text-sky-400">
                        <Database className="h-[18px] w-[18px]" />
                      </div>
                      <div>
                        <h2 className="text-sm md:text-[15px] font-bold text-white">
                          Person Complete Data File (person_data.json)
                        </h2>
                        <p className="text-[11.5px] text-[#7f97c0]">
                          All your profile, notes, mock tests, study plan, flashcards &amp; timers in one file
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        clearAllAppData();
                        showToast('Local study cache cleared!');
                      }}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-all cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Reset Cache
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[#162747]">
                    <button
                      type="button"
                      onClick={handleOpenPersonDataModal}
                      className="flex items-center gap-2 rounded-xl bg-[#1868e6] hover:bg-blue-500 px-3.5 py-2 text-xs font-bold text-white shadow cursor-pointer transition-all"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      View Data File (person_data.json)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        downloadPersonDataFile(currentUser?.email);
                        showToast('Downloaded personal data JSON file!');
                      }}
                      className="flex items-center gap-2 rounded-xl border border-[#274885] bg-[#102244] hover:bg-[#162d59] px-3.5 py-2 text-xs font-semibold text-sky-200 hover:text-white cursor-pointer transition-all"
                    >
                      <Download className="h-3.5 w-3.5 text-sky-400" />
                      Export JSON
                    </button>
                    <label className="flex items-center gap-2 rounded-xl border border-[#274885] bg-[#102244] hover:bg-[#162d59] px-3.5 py-2 text-xs font-semibold text-sky-200 hover:text-white cursor-pointer transition-all">
                      <Upload className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Import JSON</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleImportPersonDataFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Conditional Help & Support Card when selected from left nav */}
              {activeSection === 'help' && (
                <div
                  id="settings-card-help"
                  className="rounded-2xl border border-[#25477e] bg-[#0a1529]/95 p-5 space-y-2 shadow-[0_0_25px_rgba(29,78,216,0.12)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#10203d] border border-[#223c6b] text-sky-400">
                      <HelpCircle className="h-[18px] w-[18px]" />
                    </div>
                    <div>
                      <h2 className="text-sm md:text-[15px] font-bold text-white">
                        Help &amp; Support
                      </h2>
                      <p className="text-[11.5px] text-[#7f97c0]">
                        Need help with your study plan or AI Notes? Ask Study Bot AI Tutor anytime.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Privacy & Security Card */}
              <div
                id="settings-card-privacy"
                className={`rounded-2xl border transition-all p-5 bg-[#0a1529]/95 ${
                  activeSection === 'privacy'
                    ? 'border-[#25477e] shadow-[0_0_25px_rgba(29,78,216,0.12)]'
                    : 'border-[#182b4d]'
                }`}
              >
                <div className="flex items-center gap-3 pb-3 border-b border-[#162747]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#10203d] border border-[#223c6b] text-sky-400">
                    <ShieldCheck className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <h2 className="text-sm md:text-[15px] font-bold text-white">
                      Privacy &amp; Security
                    </h2>
                    <p className="text-[11.5px] text-[#7f97c0]">
                      Keep your account safe and secure
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModal('password')}
                  className="mt-3 flex w-full items-center justify-between rounded-xl p-2 hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0e1c36] border border-[#1d345e] text-sky-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs md:text-[13px] font-bold text-white">
                        Change Password
                      </div>
                      <div className="text-[11px] text-[#7f97c0]">
                        Update your account password
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#6d8cc2]" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar Column (4 Columns on xl) */}
        <div className="xl:col-span-4 space-y-5">
          {/* 1. Quick Actions Card */}
          <div className="rounded-[22px] border border-[#1b2f54] bg-gradient-to-b from-[#0b162c] to-[#081121] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-2.5 mb-4">
              <Zap className="h-[18px] w-[18px] text-sky-400 fill-sky-400/20" />
              <h3 className="text-sm md:text-[15px] font-bold text-white">
                Quick Actions
              </h3>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setActiveModal('password')}
                className="flex w-full items-center justify-between rounded-2xl border border-[#172a4c] bg-[#0a1529] hover:border-[#294c85] hover:bg-[#0e1c36] p-3.5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#112244] border border-[#223e72] text-sky-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs md:text-[13px] font-bold text-white">
                      Change Password
                    </div>
                    <div className="text-[11px] text-[#7f97c0] mt-0.5">
                      Update your password
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#6d8cc2]" />
              </button>

              <button
                type="button"
                onClick={() => setActiveModal('devices')}
                className="flex w-full items-center justify-between rounded-2xl border border-[#172a4c] bg-[#0a1529] hover:border-[#294c85] hover:bg-[#0e1c36] p-3.5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#112244] border border-[#223e72] text-sky-400">
                    <Monitor className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs md:text-[13px] font-bold text-white">
                      Manage Devices
                    </div>
                    <div className="text-[11px] text-[#7f97c0] mt-0.5">
                      See where you are logged in
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#6d8cc2]" />
              </button>

              <button
                type="button"
                onClick={() => setActiveModal('delete')}
                className="flex w-full items-center justify-between rounded-2xl border border-[#172a4c] bg-[#0a1529] hover:border-rose-500/40 hover:bg-[#161326] p-3.5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#112244] border border-[#223e72] text-sky-400">
                    <Trash2 className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs md:text-[13px] font-bold text-white">
                      Delete Account
                    </div>
                    <div className="text-[11px] text-[#7f97c0] mt-0.5">
                      Permanently delete your account
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#6d8cc2]" />
              </button>
            </div>
          </div>

          {/* 2. Storage Usage Card */}
          <div className="rounded-[22px] border border-[#1b2f54] bg-gradient-to-b from-[#0b162c] to-[#081121] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Cloud className="h-[18px] w-[18px] text-sky-400" />
                <h3 className="text-sm md:text-[15px] font-bold text-white">
                  Storage Usage
                </h3>
              </div>
              <button
                type="button"
                onClick={handleOpenPersonDataModal}
                className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
              >
                person_data.json →
              </button>
            </div>
            <p className="text-xs text-[#9bb0d4] mt-3">
              Your data is safely stored
            </p>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#122240]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2575fc] to-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.6)]"
                style={{ width: '48%' }}
              />
            </div>
            <div className="mt-2 text-right text-[11px] font-medium text-[#7f97c0]">
              2.4 GB of 5 GB used
            </div>
          </div>

          {/* 3. About Study Bot AI Card */}
          <div className="rounded-[22px] border border-[#1b2f54] bg-gradient-to-b from-[#0b162c] to-[#081121] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#14284e] text-sky-400">
                <Bot className="h-4 w-4" />
              </div>
              <h3 className="text-sm md:text-[15px] font-bold text-white">
                About Study Bot AI
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal('about')}
              className="flex w-full items-center justify-between rounded-2xl border border-[#172a4c] bg-[#0a1529] hover:border-[#294c85] p-3.5 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#112244] border border-[#223e72] text-sky-300">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="text-xs md:text-[13px] font-bold text-white">
                    Study Bot AI
                  </div>
                  <div className="text-[11px] text-[#7f97c0] mt-0.5">
                    Version 1.0.0
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#6d8cc2]" />
            </button>
          </div>

          {/* 4. Motivational Mascot Card: "Better Learning Brighter Future" */}
          <div className="relative overflow-hidden rounded-[22px] border border-[#1b2f54] bg-gradient-to-br from-[#0d1d3a] via-[#091428] to-[#060d1b] p-5 min-h-[175px] flex items-center justify-between shadow-[0_12px_35px_rgba(0,0,0,0.4)]">
            {/* Ambient radial glow */}
            <div className="pointer-events-none absolute -left-6 bottom-0 h-36 w-36 rounded-full bg-blue-500/20 blur-2xl" />
            <div className="pointer-events-none absolute right-6 top-4 h-24 w-24 rounded-full bg-sky-400/10 blur-xl" />

            {/* Decorative Stars */}
            <span className="pointer-events-none absolute left-6 top-4 text-amber-300/70 text-xs">
              ✦
            </span>
            <span className="pointer-events-none absolute left-[45%] top-5 text-amber-400 text-lg drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
              ★
            </span>
            <span className="pointer-events-none absolute right-5 bottom-4 text-amber-300/70 text-xs">
              ★
            </span>

            {/* Cute 3D-styled StudyBot Robot SVG */}
            <div className="relative z-10 flex items-center justify-center pl-2">
              <svg
                viewBox="0 0 140 140"
                className="h-32 w-32 drop-shadow-[0_10px_18px_rgba(37,117,252,0.45)]"
              >
                <defs>
                  <linearGradient id="botBodyGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#eff6ff" />
                    <stop offset="55%" stopColor="#bfdbfe" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                  <linearGradient id="botBlueAccent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                </defs>
                {/* Antenna */}
                <line
                  x1="70"
                  y1="14"
                  x2="70"
                  y2="28"
                  stroke="#60a5fa"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle cx="70" cy="12" r="6" fill="#38bdf8" />
                {/* Ears */}
                <rect x="20" y="46" width="10" height="22" rx="5" fill="url(#botBlueAccent)" />
                <rect x="110" y="46" width="10" height="22" rx="5" fill="url(#botBlueAccent)" />
                {/* Head */}
                <rect
                  x="28"
                  y="26"
                  width="84"
                  height="60"
                  rx="26"
                  fill="url(#botBodyGrad)"
                  stroke="#93c5fd"
                  strokeWidth="2"
                />
                {/* Face Screen */}
                <rect x="38" y="36" width="64" height="40" rx="18" fill="#08142c" />
                {/* Happy Eyes */}
                <path
                  d="M50 53 Q55 46 60 53"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M80 53 Q85 46 90 53"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Cute Smile */}
                <path
                  d="M62 63 Q70 70 78 63"
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Torso */}
                <rect
                  x="43"
                  y="89"
                  width="54"
                  height="38"
                  rx="18"
                  fill="url(#botBodyGrad)"
                />
                <rect
                  x="53"
                  y="96"
                  width="34"
                  height="22"
                  rx="10"
                  fill="url(#botBlueAccent)"
                />
                {/* Waving Left Arm */}
                <path
                  d="M42 96 Q24 84 26 68"
                  stroke="url(#botBodyGrad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Right Arm */}
                <path
                  d="M98 96 Q112 104 108 116"
                  stroke="url(#botBodyGrad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>

            {/* Tilted Motivational Copy */}
            <div className="relative z-10 pr-2 text-right -rotate-6">
              <div className="text-base md:text-lg font-semibold italic text-white/95 leading-snug tracking-wide drop-shadow">
                Better Learning
                <br />
                Brighter Future
              </div>
              <svg
                viewBox="0 0 120 14"
                className="mt-1 ml-auto w-28 text-[#38bdf8]"
                fill="none"
              >
                <path
                  d="M4 10 Q60 2 116 6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Change Password */}
      {activeModal === 'password' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#223c6b] bg-[#0b162c] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#192d52]">
              <div className="flex items-center gap-2.5">
                <Lock className="h-5 w-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">Change Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#9bb0d4]">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-xl border border-[#223c6b] bg-[#071020] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#9bb0d4]">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="mt-1 w-full rounded-xl border border-[#223c6b] bg-[#071020] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#9bb0d4]">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="mt-1 w-full rounded-xl border border-[#223c6b] bg-[#071020] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-xl border border-[#223c6b] px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#1868e6] hover:bg-blue-500 px-5 py-2 text-xs font-bold text-white shadow cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manage Devices */}
      {activeModal === 'devices' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#223c6b] bg-[#0b162c] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#192d52]">
              <div className="flex items-center gap-2.5">
                <Monitor className="h-5 w-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">Logged-in Devices</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-[#223c6b] bg-[#071020] p-3.5">
                <div className="flex items-center gap-3">
                  <Laptop className="h-5 w-5 text-sky-400" />
                  <div>
                    <div className="text-xs font-bold text-white">
                      Current Web Browser Session
                    </div>
                    <div className="text-[11px] text-emerald-400">
                      Active now • Study Bot AI Web
                    </div>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  This Device
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[#192d52] bg-[#071020]/60 p-3.5">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-[#6d8cc2]" />
                  <div>
                    <div className="text-xs font-bold text-slate-200">
                      Mobile Companion Sync
                    </div>
                    <div className="text-[11px] text-[#7f97c0]">
                      Synced via Cloud Storage
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Remote session signed out')}
                  className="text-[11px] font-semibold text-rose-400 hover:underline cursor-pointer"
                >
                  Revoke
                </button>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl bg-[#1868e6] px-5 py-2 text-xs font-bold text-white cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Account */}
      {activeModal === 'delete' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-[#0b162c] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#192d52]">
              <div className="flex items-center gap-2.5">
                <Trash2 className="h-5 w-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Delete Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-300">
              Are you sure you want to permanently delete your account data? This will erase your saved study plans, mock test history, and flashcards.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl border border-[#223c6b] px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                Keep Account
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 px-5 py-2 text-xs font-bold text-white shadow cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Class Picker */}
      {activeModal === 'classPicker' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#223c6b] bg-[#0b162c] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#192d52]">
              <h3 className="text-base font-bold text-white">Select Your Class</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              {classOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    updateProfile({ classLevel: c });
                    setActiveModal(null);
                    showToast(`Class updated to ${c}`);
                  }}
                  className={`rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                    displayClass === c
                      ? 'border-[#2d7dff] bg-[#1868e6] text-white'
                      : 'border-[#1d355e] bg-[#071020] text-slate-300 hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Language Picker */}
      {activeModal === 'langPicker' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#223c6b] bg-[#0b162c] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#192d52]">
              <h3 className="text-base font-bold text-white">Preferred Language</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 mt-4">
              {languages.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    updateProfile({ language: l });
                    setActiveModal(null);
                    showToast(`Language updated to ${l}`);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-xs font-bold transition-all cursor-pointer ${
                    displayLang === l
                      ? 'border-[#2d7dff] bg-[#1868e6] text-white'
                      : 'border-[#1d355e] bg-[#071020] text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{l}</span>
                  {displayLang === l && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: About Study Bot AI */}
      {activeModal === 'about' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#223c6b] bg-[#0b162c] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#192d52]">
              <div className="flex items-center gap-2.5">
                <Bot className="h-5 w-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">Study Bot AI • v1.0.0</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#9bb0d4]">
              Study Bot AI is your personal AI-powered learning companion built for CBSE &amp; NCERT students. Generate instant revision notes, custom mock tests, personalized exam study plans, and interactive explanations.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl bg-[#1868e6] px-5 py-2 text-xs font-bold text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Person Complete Data File (person_data.json) */}
      {activeModal === 'personDataFile' && personDataSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-[#25477e] bg-[#0b162c] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#192d52]">
              <div className="flex items-center gap-2.5">
                <Database className="h-5 w-5 text-sky-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Person Data File • /person_data.json
                  </h3>
                  <p className="text-[11px] text-[#7f97c0]">
                    Complete unified record for {personDataSnapshot.profile.name} ({personDataSnapshot.account.email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Summary Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3.5">
              <div className="rounded-xl border border-[#1b325c] bg-[#071020] p-2.5">
                <div className="text-[10px] text-[#7f97c0]">Class &amp; Exam</div>
                <div className="text-xs font-bold text-white mt-0.5">
                  {personDataSnapshot.profile.classLevel} • {personDataSnapshot.profile.primaryExam}
                </div>
              </div>
              <div className="rounded-xl border border-[#1b325c] bg-[#071020] p-2.5">
                <div className="text-[10px] text-[#7f97c0]">AI Notes &amp; Tests</div>
                <div className="text-xs font-bold text-sky-300 mt-0.5">
                  {personDataSnapshot.notes.length} Notes • {personDataSnapshot.mockTests.length} Tests
                </div>
              </div>
              <div className="rounded-xl border border-[#1b325c] bg-[#071020] p-2.5">
                <div className="text-[10px] text-[#7f97c0]">Planner Tasks</div>
                <div className="text-xs font-bold text-emerald-300 mt-0.5">
                  {personDataSnapshot.studyPlanner.timetable.length} Scheduled Slots
                </div>
              </div>
              <div className="rounded-xl border border-[#1b325c] bg-[#071020] p-2.5">
                <div className="text-[10px] text-[#7f97c0]">Study Time</div>
                <div className="text-xs font-bold text-amber-300 mt-0.5">
                  {personDataSnapshot.stats.studyTimeMinutes} mins • {personDataSnapshot.stats.starsEarned} ★
                </div>
              </div>
            </div>

            {/* Formatted JSON Viewer */}
            <div className="flex-1 overflow-y-auto rounded-xl border border-[#192d52] bg-[#050b16] p-4 font-mono text-[11px] leading-relaxed text-sky-200 select-text">
              <pre className="whitespace-pre-wrap break-words">
                {JSON.stringify(personDataSnapshot, null, 2)}
              </pre>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-[#192d52]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      JSON.stringify(personDataSnapshot, null, 2)
                    );
                    showToast('Copied person_data.json to clipboard!');
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-[#274885] bg-[#102244] hover:bg-[#162d59] px-3.5 py-2 text-xs font-semibold text-sky-200 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy JSON
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadPersonDataFile(currentUser?.email);
                    showToast('Downloaded personal data JSON file!');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-[#1868e6] hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white shadow cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download person_data.json
                </button>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl border border-[#223c6b] px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


