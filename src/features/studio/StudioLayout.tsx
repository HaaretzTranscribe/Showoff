import { Outlet } from "react-router-dom";
import { InstructorAuthGate } from "@/features/auth/InstructorAuthGate";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/lib/supabaseClient";

export interface StudioOutletContext {
  userId: string;
}

export function StudioLayout() {
  return <InstructorAuthGate>{(userId) => <StudioShell userId={userId} />}</InstructorAuthGate>;
}

function StudioShell({ userId }: { userId: string }) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <span className="font-bold text-lg">ShowOff Studio</span>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            {t.studio.signOut}
          </button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-6">
        <Outlet context={{ userId } satisfies StudioOutletContext} />
      </main>
    </div>
  );
}
