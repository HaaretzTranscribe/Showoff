import { Route, Routes } from "react-router-dom";
import { isSheetConfigured } from "@/lib/sheetSessions";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { JoinPage } from "@/features/join/JoinPage";
import { LiveSessionPage } from "@/features/live/LiveSessionPage";

function NotConfiguredScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center p-6">
      <div>
        <h1 className="text-xl font-bold mb-2">Sessions sheet not connected</h1>
        <p className="text-gray-500">Set VITE_SESSIONS_SHEET_CSV_URL to run ShowOff.</p>
      </div>
    </div>
  );
}

function HomePage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 text-center">
        <p className="text-gray-500">{t.common.scanToJoin}</p>
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
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}
