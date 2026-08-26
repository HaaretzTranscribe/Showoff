import { useState, type FormEvent, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/i18n/I18nProvider";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useInstructorSession } from "./useInstructorSession";

export function InstructorAuthGate({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { session, loading } = useInstructorSession();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOtp({ email });
    if (signInError) {
      setError(signInError.message);
      return;
    }
    setSent(true);
  }

  if (loading) return <p>{t("common.loading")}</p>;

  if (session) return <>{children}</>;

  return (
    <main>
      <LanguageSwitcher />
      <h1>{t("common.appName")}</h1>
      {sent ? (
        <p role="status">Check {email} for a sign-in link.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <button type="submit">Send magic link</button>
          {error && <p role="alert">{error}</p>}
        </form>
      )}
    </main>
  );
}
