import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { lessonLanguage } from "@/i18n/lessonLanguage";
import { JoinPage } from "@/features/join/JoinPage";
import { LiveSessionPage } from "@/features/live/LiveSessionPage";
import { InstructorControlPage } from "@/features/instructor/InstructorControlPage";

// Lazy: pulls in Recharts, which is only ever needed on the
// instructor-facing presentation screen — keeping it out of the main
// bundle matters for the student-facing join/live pages on mobile.
const PresentationPage = lazy(() =>
  import("@/features/present/PresentationPage").then((m) => ({ default: m.PresentationPage }))
);

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

/**
 * Entering an English lesson (key ending in "en") switches the UI to
 * English once, so students whose phones are set to Hebrew still get an
 * English screen around the English Forms. Hebrew lessons keep the
 * existing detection; the language switcher still works either way.
 */
function LessonLanguageSync() {
  const { pathname } = useLocation();
  const { setLang } = useI18n();
  const lessonKey = pathname.match(/^\/(?:join|live|control|present)\/([^/]+)/)?.[1] ?? "";

  useEffect(() => {
    if (lessonKey && lessonLanguage(decodeURIComponent(lessonKey)) === "en") setLang("en");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonKey]);

  return null;
}

export function App() {
  return (
    <>
      <LessonLanguageSync />
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
    </>
  );
}
