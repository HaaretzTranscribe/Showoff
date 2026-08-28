import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { errorMessage } from "@/lib/errorMessage";
import { randomAttendanceCode } from "@/lib/slug";
import type { ClassSession } from "@/domain/types";
import { createSession, getCourse, listSessions } from "./api";

export function SessionsPage() {
  const { courseId = "" } = useParams();
  const { t } = useI18n();
  const [courseName, setCourseName] = useState("");
  const [sessions, setSessions] = useState<ClassSession[] | null>(null);
  const [title, setTitle] = useState("");
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendanceCode, setAttendanceCode] = useState(() => randomAttendanceCode());
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getCourse(courseId).then((course) => setCourseName(course?.name ?? ""));
    listSessions(courseId)
      .then(setSessions)
      .catch((e) => setError(errorMessage(e)));
  }, [courseId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const session = await createSession({
        courseId,
        courseName,
        title: title.trim(),
        sessionDate,
        attendanceCode,
      });
      setSessions((prev) => [session, ...(prev ?? [])]);
      setTitle("");
      setAttendanceCode(randomAttendanceCode());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/studio" className="text-sm text-gray-500 hover:text-gray-800">
          &larr; {t.common.back}
        </Link>
        <h1 className="text-2xl font-bold">{courseName || t.studio.sessionsTitle}</h1>
      </div>

      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 border border-gray-200 rounded-lg p-4 bg-white"
      >
        <h2 className="font-semibold">{t.studio.newSessionTitle}</h2>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t.studio.sessionTitleLabel}</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.studio.sessionTitlePlaceholder}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t.studio.sessionDateLabel}</span>
          <input
            required
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t.studio.attendanceCodeLabel}</span>
          <input
            required
            value={attendanceCode}
            onChange={(e) => setAttendanceCode(e.target.value.toUpperCase())}
            className="border border-gray-300 rounded-lg px-3 py-2 tracking-widest"
          />
        </label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={creating}
          className="self-start bg-gray-900 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50"
        >
          {t.studio.createSession}
        </button>
      </form>

      {sessions === null ? (
        <p className="text-gray-500">{t.common.loading}</p>
      ) : sessions.length === 0 ? (
        <p className="text-gray-500">{t.studio.noSessions}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((session) => (
            <li key={session.id}>
              <Link
                to={`/studio/sessions/${session.id}`}
                className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 bg-white hover:bg-gray-50"
              >
                <span>
                  {session.title} — {session.sessionDate}
                </span>
                <StatusBadge status={session.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: ClassSession["status"] }) {
  const { t } = useI18n();
  const label =
    status === "draft"
      ? t.studio.statusDraft
      : status === "open"
        ? t.studio.statusOpen
        : t.studio.statusClosed;
  const color =
    status === "draft"
      ? "bg-gray-200 text-gray-700"
      : status === "open"
        ? "bg-green-100 text-green-800"
        : "bg-gray-800 text-white";
  return <span className={`text-xs px-2 py-1 rounded-full ${color}`}>{label}</span>;
}
