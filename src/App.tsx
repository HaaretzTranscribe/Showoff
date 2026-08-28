import { Navigate, Route, Routes } from "react-router-dom";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { JoinPage } from "@/features/join/JoinPage";
import { StudioLayout } from "@/features/studio/StudioLayout";
import { CoursesPage } from "@/features/studio/CoursesPage";
import { SessionsPage } from "@/features/studio/SessionsPage";
import { SessionDetailPage } from "@/features/studio/SessionDetailPage";

function NotConfiguredScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center p-6">
      <div>
        <h1 className="text-xl font-bold mb-2">Supabase project not connected</h1>
        <p className="text-gray-500">
          Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to run ShowOff.
        </p>
      </div>
    </div>
  );
}

export function App() {
  if (!isSupabaseConfigured) {
    return <NotConfiguredScreen />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/studio" replace />} />
      <Route path="/join/:sessionSlug" element={<JoinPage />} />
      <Route path="/studio" element={<StudioLayout />}>
        <Route index element={<CoursesPage />} />
        <Route path="courses/:courseId" element={<SessionsPage />} />
        <Route path="sessions/:sessionId" element={<SessionDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/studio" replace />} />
    </Routes>
  );
}
