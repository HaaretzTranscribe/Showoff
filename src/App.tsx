import { Navigate, Route, Routes } from "react-router-dom";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { JoinPage } from "@/features/join/JoinPage";
import { QuestionnairePage } from "@/features/join/QuestionnairePage";
import { PresentationPage } from "@/features/presentation/PresentationPage";
import { StudioLayout } from "@/features/studio/StudioLayout";
import { CoursesPage } from "@/features/studio/CoursesPage";
import { LessonsPage } from "@/features/studio/LessonsPage";
import { QuestionsPage } from "@/features/studio/QuestionsPage";
import { InstructorAuthGate } from "@/features/auth/InstructorAuthGate";

export function App() {
  if (!isSupabaseConfigured) {
    return (
      <main>
        <h1>Live Classroom Data Lab</h1>
        <p>
          This deploy has no Supabase project connected yet. Set{" "}
          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your
          hosting provider's environment variables and redeploy.
        </p>
      </main>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/join" replace />} />

      {/* Student App */}
      <Route path="/join" element={<JoinPage />} />
      <Route path="/questionnaire" element={<QuestionnairePage />} />

      {/* Instructor Studio */}
      <Route
        path="/studio"
        element={
          <InstructorAuthGate>
            <StudioLayout />
          </InstructorAuthGate>
        }
      >
        <Route index element={<Navigate to="courses" replace />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:courseId/lessons" element={<LessonsPage />} />
        <Route path="lessons/:lessonId/questions" element={<QuestionsPage />} />
      </Route>

      {/* Live Presentation */}
      <Route
        path="/present/:classSessionId"
        element={
          <InstructorAuthGate>
            <PresentationPage />
          </InstructorAuthGate>
        }
      />

      <Route path="*" element={<Navigate to="/join" replace />} />
    </Routes>
  );
}
