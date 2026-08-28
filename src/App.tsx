import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { isSheetConfigured } from "@/lib/sheetSessions";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { JoinPage } from "@/features/join/JoinPage";
import { LiveSessionPage } from "@/features/live/LiveSessionPage";
import { InstructorControlPage } from "@/features/instructor/InstructorControlPage";

// Lazy: pulls in Recharts, which is only ever needed on the
// instructor-facing presentation screen — keeping it out of the main
// bundle matters for the student-facing join/live pages on mobile.
const PresentationPage = lazy(() =>
  import("@/features/present/PresentationPage").then((m) => ({ default: m.PresentationPage }))
);

function NotConfiguredScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-center">
      <div className="animate-fade-in-up">
        <h1 className="mb-2 text-xl font-bold text-slate-900">Sessions sheet not connected</h1>
        <p className="text-slate-500">Set VITE_SESSIONS_SHEET_CSV_URL to run ShowOff.</p>
      </div>
    </div>
  );
}

function HomePage() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white text-slate-900">
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 text-center">
        <p className="animate-fade-in-up text-lg text-slate-500">{t.common.scanToJoin}</p>
      </div>
    </div>
  );
}

export function App() {
  if (!isSheetConfigured) {
    return <NotConfiguredScreen />;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/join/:sessionSlug" element={<JoinPage />} />
      <Route path="/live/:sessionSlug" element={<LiveSessionPage />} />
      <Route path="/control/:sessionSlug" element={<InstructorControlPage />} />
      <Route
        path="/present/:sessionSlug/:vizId"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-400">…</div>}>
            <PresentationPage />
          </Suspense>
        }
      />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}
