import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { errorMessage } from "@/lib/errorMessage";
import type { AttendanceRecord, ClassSession, SessionStatus } from "@/domain/types";
import {
  addManualAttendee,
  attendanceToCsv,
  downloadCsv,
  getSession,
  listAttendance,
  removeAttendanceRecord,
  updateAttendanceCode,
  updateSessionStatus,
} from "./api";
import { StatusBadge } from "./SessionsPage";

export function SessionDetailPage() {
  const { sessionId = "" } = useParams();
  const { t } = useI18n();

  const [session, setSession] = useState<ClassSession | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editingCode, setEditingCode] = useState(false);
  const [codeDraft, setCodeDraft] = useState("");
  const [manualName, setManualName] = useState("");
  const [copyLabel, setCopyLabel] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, [sessionId]);

  async function refresh() {
    try {
      const [s, records] = await Promise.all([getSession(sessionId), listAttendance(sessionId)]);
      setSession(s);
      setAttendance(records);
      if (s) setCodeDraft(s.attendanceCode);
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

  async function handleAddManual(e: FormEvent) {
    e.preventDefault();
    if (!manualName.trim()) return;
    setError(null);
    try {
      const record = await addManualAttendee(sessionId, manualName.trim());
      setAttendance((prev) => [...(prev ?? []), record]);
      setManualName("");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleRemove(recordId: string) {
    setError(null);
    try {
      await removeAttendanceRecord(recordId);
      setAttendance((prev) => (prev ?? []).filter((r) => r.id !== recordId));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function handleExport() {
    if (!attendance || !session) return;
    downloadCsv(`attendance-${session.sessionSlug}.csv`, attendanceToCsv(attendance));
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

      <div className="border border-gray-200 rounded-lg p-4 bg-white flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            {t.studio.attendanceListTitle} ({attendance?.length ?? 0} {t.studio.attendeeCount})
          </h2>
          <button
            type="button"
            onClick={handleExport}
            disabled={!attendance || attendance.length === 0}
            className="text-sm bg-gray-100 rounded-lg px-3 py-1.5 disabled:opacity-50"
          >
            {t.studio.exportCsv}
          </button>
        </div>

        <form onSubmit={handleAddManual} className="flex gap-2">
          <input
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder={t.studio.addAttendeePlaceholder}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
          />
          <button type="submit" className="bg-gray-900 text-white rounded-lg px-4 py-2 font-medium">
            {t.studio.add}
          </button>
        </form>

        {attendance === null ? (
          <p className="text-gray-500">{t.common.loading}</p>
        ) : attendance.length === 0 ? (
          <p className="text-gray-500">{t.studio.noAttendees}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-100">
            {attendance.map((record) => (
              <li key={record.id} className="flex items-center justify-between py-2">
                <span>{record.fullName}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(record.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  {t.studio.remove}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
