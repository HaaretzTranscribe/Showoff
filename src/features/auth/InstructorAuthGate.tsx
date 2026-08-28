import { useState, type FormEvent, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { errorMessage } from "@/lib/errorMessage";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useInstructorSession } from "./useInstructorSession";

export function InstructorAuthGate({ children }: { children: (userId: string) => ReactNode }) {
  const { loading, session, userId } = useInstructorSession();
  const { t } = useI18n();

  if (loading) {
    return <div className="p-6 text-center text-gray-500">{t.common.loading}</div>;
  }

  if (!session || !userId) {
    return <LoginPage />;
  }

  return <>{children(userId)}</>;
}

function LoginPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    setSending(false);
    if (signInError) {
      setError(errorMessage(signInError));
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex items-start justify-center px-4">
        <div className="w-full max-w-sm mt-8">
          <h1 className="text-2xl font-bold text-center mb-6">{t.studio.signInTitle}</h1>
          {sent ? (
            <p className="text-center text-gray-600">{t.studio.checkEmail}</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">{t.studio.emailLabel}</span>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.studio.emailPlaceholder}
                  className="border border-gray-300 rounded-xl px-4 py-3 text-lg"
                />
              </label>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={sending}
                className="bg-gray-900 text-white rounded-xl py-3 text-lg font-semibold disabled:opacity-50"
              >
                {t.studio.sendLink}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
