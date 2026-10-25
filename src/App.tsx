/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StudyProvider, useStudy } from './context/StudyContext';
import { AppShell } from './components/AppShell';
import { Dashboard } from './components/Dashboard';
import { StudyChat } from './components/StudyChat';
import { MockTestView } from './components/MockTestView';
import { FlashcardsView } from './components/FlashcardsView';
import { SignInView } from './components/SignInView';
import { LovableModalView } from './components/LovableModalView';
import { OnboardingModal } from './components/OnboardingModal';
import { CustomizeProfileModal } from './components/CustomizeProfileModal';
import { FormulaVaultModal } from './components/FormulaVaultModal';
import { FocusWidget } from './components/FocusWidget';
import { NotesView } from './components/NotesView';
import { MistakeBookView } from './components/MistakeBookView';
import { NCERTBooksView } from './components/NCERTBooksView';
import { StudyPlannerView } from './components/StudyPlannerView';
import { ProblemScannerView } from './components/ProblemScannerView';
import { ProgressRoadmapView } from './components/ProgressRoadmapView';
import { AchievementsView } from './components/AchievementsView';

const MainContent: React.FC = () => {
  const { activeTab, isSignedIn } = useStudy();

  if (!isSignedIn) {
    return <SignInView />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case '/mistakes':
        return <MistakeBookView />;
      case '/notes':
        return <NotesView />;
      case '/tutor':
        return (
          <StudyChat
            mode="tutor"
            title="AI Tutor"
            subtitle="Ask any question — get a clear, step-by-step explanation."
            placeholder="Ask a question… e.g. How does photosynthesis work?"
            suggestions={[
              "Explain Newton's 3 laws",
              'What is a derivative?',
              'Causes of World War I',
              'How do vaccines work?',
              'Explain Doppler Effect with formula',
              'Why does sky appear blue?',
            ]}
          />
        );
      case '/ncert':
        return <NCERTBooksView />;
      case '/mock-test':
        return <MockTestView />;
      case '/practice':
        return (
          <StudyChat
            mode="practice"
            title="Practice"
            subtitle="One problem at a time. Answer, get feedback, level up."
            placeholder="What do you want to practice? e.g. Quadratic equations"
            suggestions={[
              'Quadratic equations',
              'Chemistry balancing',
              'English grammar',
              'Physics: motion',
              'Trigonometric heights & distances',
              'Genetics Punnett squares',
            ]}
          />
        );
      case '/revision':
        return (
          <StudyChat
            mode="revision"
            title="Revision"
            subtitle="Quick revision sheets: key ideas, formulas, mnemonics and rapid-fire questions."
            placeholder="Chapter to revise… e.g. Class 10 Light – Reflection"
            suggestions={[
              'Class 10 Chemical Reactions',
              'Class 12 Electrostatics',
              'Class 9 French Revolution',
              'Trigonometry formulas',
              'Carbon and its Compounds',
              'Cell Structure & Functions',
            ]}
          />
        );
      case '/flashcards':
        return <FlashcardsView />;
      case '/summarize':
        return (
          <StudyChat
            mode="summarize"
            multiline={true}
            title="Notes Summarizer"
            subtitle="Paste your notes — get a TL;DR, key points and review questions."
            placeholder="Paste your notes here, then press the send button…"
            suggestions={[
              'Summarize: The mitochondria is the powerhouse of the cell. It produces ATP through cellular respiration, generating chemical energy for biochemical reactions…',
              "Summarize: Newton's First Law states an object remains in rest or uniform motion unless acted upon by an external force…",
              'Summarize: The French Revolution began in 1789, overthrowing the monarchy and establishing principles of liberty, equality, and fraternity…',
            ]}
          />
        );
      case '/planner':
        return <StudyPlannerView />;
      case '/scanner':
        return <ProblemScannerView />;
      case '/progress':
        return <ProgressRoadmapView />;
      case '/achievements':
        return <AchievementsView />;
      case '/':
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppShell>
      {renderActiveView()}
      <LovableModalView />
      <OnboardingModal />
      <CustomizeProfileModal />
      <FormulaVaultModal />
      <FocusWidget />
    </AppShell>
  );
};

export default function App() {
  return (
    <StudyProvider>
      <MainContent />
    </StudyProvider>
  );
}
