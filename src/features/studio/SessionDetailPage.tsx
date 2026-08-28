import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { errorMessage } from "@/lib/errorMessage";
import type { ClassSession, SessionStatus } from "@/domain/types";
import { getSession, updateAttendanceCode, updateGoogleFormUrl, updateSessionStatus } from "./api";
import { StatusBadge } from "./SessionsPage";

export function SessionDetailPage() {
  const { sessionId = "" } = useParams();
  const { t } = useI18n();

  const [session, setSession] = useState<ClassSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editingCode, setEditingCode] = useState(false);
  const [codeDraft, setCodeDraft] = useState("");
  const [editingFormUrl, setEditingFormUrl] = useState(false);
  const [formUrlDraft, setFormUrlDraft] = useState("");
  const [copyLabel, setCopyLabel] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, [sessionId]);

  async function refresh() {
    try {
      const s = await getSession(sessionId);
      setSession(s);
      if (s) {
        setCodeDraft(s.attendanceCode);
        setFormUrlDraft(s.googleFormUrl ?? "");
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleSetStatus(status: SessionStatus) {
    if (!session) return;
    setError(null);
    try {
      const updated = await updateSessionStatus(session.id, status);
      setSession(updated);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleSaveCode(e: FormEvent) {
    e.preventDefault();
    if (!session || !codeDraft.trim()) return;
    setError(null);
    try {
      const updated = await updateAttendanceCode(session.id, codeDraft.trim().toUpperCase());
      setSession(updated);
      setEditingCode(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleSaveFormUrl(e: FormEvent) {
    e.preventDefault();
    if (!session || !formUrlDraft.trim()) return;
    setError(null);
    try {
      const updated = await updateGoogleFormUrl(session.id, formUrlDraft.trim());
      setSession(updated);
      setEditingFormUrl(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleCopyJoinUrl() {
    if (!session) return;
    const url = `${window.location.origin}/join/${session.sessionSlug}`;
    await navigator.clipboard.writeText(url);
    setCopyLabel(t.studio.copied);
    setTimeout(() => setCopyLabel(null), 1500);
  }

  if (!session) {
    return <p className="text-gray-500">{t.common.loading}</p>;
  }

  const joinUrl = `${window.location.origin}/join/${session.sessionSlug}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to={`/studio/courses/${session.courseId}`} className="text-sm text-gray-500 hover:text-gray-800">
          &larr; {t.common.back}
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-2xl font-bold">{session.title}</h1>
          <StatusBadge status={session.status} />
        </div>
        <p className="text-gray-500">{session.sessionDate}</p>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="border border-gray-200 rounded-lg p-4 bg-white flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{t.studio.status}:</span>
          {session.status !== "open" && (
            <button
              type="button"
              onClick={() => handleSetStatus("open")}
              className="text-sm bg-green-600 text-white rounded-lg px-3 py-1.5"
            >
              {t.studio.openAttendance}
            </button>
          )}
          {session.status !== "closed" && (
            <button
              type="button"
              onClick={() => handleSetStatus("closed")}
              className="text-sm bg-gray-800 text-white rounded-lg px-3 py-1.5"
            >
              {t.studio.closeAttendance}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{t.studio.attendanceCodeLabel}:</span>
          {editingCode ? (
            <form onSubmit={handleSaveCode} className="flex items-center gap-2">
              <input
                autoFocus
                value={codeDraft}
                onChange={(e) => setCodeDraft(e.target.value.toUpperCase())}
                className="border border-gray-300 rounded-lg px-2 py-1 tracking-widest w-28"
              />
              <button type="submit" className="text-sm bg-gray-900 text-white rounded-lg px-3 py-1.5">
                {t.studio.save}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingCode(false);
                  setCodeDraft(session.attendanceCode);
                }}
                className="text-sm text-gray-500"
              >
                {t.studio.cancel}
              </button>
            </form>
          ) : (
            <>
              <span className="font-mono tracking-widest">{session.attendanceCode}</span>
              <button
                type="button"
                onClick={() => setEditingCode(true)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                {t.studio.changeCode}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{t.studio.googleFormUrlLabel}:</span>
          {editingFormUrl ? (
            <form onSubmit={handleSaveFormUrl} className="flex items-center gap-2 flex-1 min-w-0">
              <input
                autoFocus
                type="url"
                value={formUrlDraft}
                onChange={(e) => setFormUrlDraft(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1 flex-1 min-w-0"
              />
              <button type="submit" className="text-sm bg-gray-900 text-white rounded-lg px-3 py-1.5">
                {t.studio.save}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingFormUrl(false);
                  setFormUrlDraft(session.googleFormUrl ?? "");
                }}
                className="text-sm text-gray-500"
              >
                {t.studio.cancel}
              </button>
            </form>
          ) : (
            <>
              <code className="text-xs bg-gray-100 rounded px-2 py-1 break-all">
                {session.googleFormUrl ?? t.studio.googleFormUrlMissing}
              </code>
              <button
                type="button"
                onClick={() => setEditingFormUrl(true)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                {t.studio.changeFormUrl}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{t.studio.joinUrlLabel}:</span>
          <code className="text-xs bg-gray-100 rounded px-2 py-1 break-all">{joinUrl}</code>
          <button
            type="button"
            onClick={handleCopyJoinUrl}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            {copyLabel ?? t.studio.copyJoinUrl}
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500">{t.studio.rollCallNote}</p>
    </div>
  );
}
