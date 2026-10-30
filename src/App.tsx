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
import { SignInView } from './components/SignInView';
import { LovableModalView } from './components/LovableModalView';
import { OnboardingModal } from './components/OnboardingModal';
import { CustomizeProfileModal, SettingsView } from './components/CustomizeProfileModal';
import { FocusWidget } from './components/FocusWidget';
import { NotesView } from './components/NotesView';
import { MistakeBookView } from './components/MistakeBookView';
import { NCERTBooksView } from './components/NCERTBooksView';
import { StudyPlannerView } from './components/StudyPlannerView';
import { ProblemScannerView } from './components/ProblemScannerView';
import { ProgressRoadmapView } from './components/ProgressRoadmapView';
import { AchievementsView } from './components/AchievementsView';
import { StudyTimerView } from './components/StudyTimerView';

const MainContent: React.FC = () => {
  const { activeTab, isSignedIn, currentUser } = useStudy();

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
      case '/planner':
        return <StudyPlannerView />;
      case '/scanner':
        return <ProblemScannerView />;
      case '/progress':
        return <ProgressRoadmapView />;
      case '/achievements':
        return <AchievementsView />;
      case '/timer':
        return <StudyTimerView />;
      case '/settings':
        return <SettingsView />;
      case '/':
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppShell key={currentUser?.email || 'guest'}>
      {renderActiveView()}
      <LovableModalView />
      <OnboardingModal />
      <CustomizeProfileModal />
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
