import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/i18n/I18nProvider";
import { errorMessage } from "@/lib/errorMessage";
import type { Lesson, RosterPolicy } from "@/domain/types";
import { createLesson, listLessons } from "./api";
import { listAttendance, openResponses, openSession, type AttendanceRow } from "./sessions";

export function LessonsPage() {
  const { t } = useI18n();
  const { courseId } = useParams<{ courseId: string }>();
  const queryClient = useQueryClient();

  const [titleHe, setTitleHe] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [rosterPolicy, setRosterPolicy] = useState<RosterPolicy>("optional");

  const lessonsQuery = useQuery({
    queryKey: ["lessons", courseId],
    queryFn: () => listLessons(courseId!),
    enabled: Boolean(courseId),
  });

  const createMutation = useMutation({
    mutationFn: createLesson,
    onSuccess: () => {
      setTitleHe("");
      setTitleEn("");
      queryClient.invalidateQueries({ queryKey: ["lessons", courseId] });
    },
  });

  if (!courseId) return null;

  return (
    <section>
      <h1>{t("studio.lessons.title")}</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate({
            courseId,
            title: { he: titleHe, en: titleEn },
            plannedAt: null,
            internalNotes: null,
            config: {
              identityFieldLabel: { he: "שם מלא", en: "Full name" },
              rosterPolicy,
              attendanceCodePolicy: "static",
              rotatingCodeTtlSeconds: 600,
              lateJoinUntilMinutes: null,
              editUntilLock: true,
            },
          });
        }}
      >
        <label>
          {t("studio.lessons.titleLabelHe")}
          <input value={titleHe} onChange={(e) => setTitleHe(e.target.value)} dir="rtl" />
        </label>
        <label>
          {t("studio.lessons.titleLabelEn")}
          <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} dir="ltr" />
        </label>
        <label>
          {t("studio.lessons.rosterPolicy")}
          <select value={rosterPolicy} onChange={(e) => setRosterPolicy(e.target.value as RosterPolicy)}>
            <option value="required">required</option>
            <option value="optional">optional</option>
            <option value="off">off</option>
          </select>
        </label>
        <button type="submit" disabled={createMutation.isPending || (!titleHe.trim() && !titleEn.trim())}>
          {t("studio.lessons.newLesson")}
        </button>
        {createMutation.isError && <p role="alert">{errorMessage(createMutation.error)}</p>}
      </form>

      {lessonsQuery.isLoading && <p>{t("common.loading")}</p>}
      {lessonsQuery.isError && <p role="alert">{t("common.error")}</p>}
      {lessonsQuery.data && lessonsQuery.data.length === 0 && <p>{t("studio.lessons.empty")}</p>}

      <ul>
        {lessonsQuery.data?.map((lesson) => (
          <LessonRow key={lesson.id} lesson={lesson} />
        ))}
      </ul>
    </section>
  );
}

function downloadAttendanceCsv(rows: AttendanceRow[], filename: string) {
  const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = ["name,joined_at", ...rows.map((r) => `${escapeCell(r.displayName)},${r.joinedAt}`)];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function LessonRow({ lesson }: { lesson: Lesson }) {
  const { t } = useI18n();
  const [opened, setOpened] = useState<{ classSessionId: string; code: string } | null>(null);

  const [responsesOpen, setResponsesOpen] = useState(false);

  const openMutation = useMutation({
    mutationFn: () => openSession(lesson.id),
    onSuccess: ({ session, code }) => setOpened({ classSessionId: session.id, code }),
  });

  const openResponsesMutation = useMutation({
    mutationFn: () => openResponses(opened!.classSessionId),
    onSuccess: () => setResponsesOpen(true),
  });

  const exportAttendanceMutation = useMutation({
    mutationFn: () => listAttendance(opened!.classSessionId),
    onSuccess: (rows) => downloadAttendanceCsv(rows, `attendance-${opened!.classSessionId}.csv`),
  });

  const joinUrl = opened ? `${window.location.origin}/join?s=${opened.classSessionId}` : null;

  return (
    <li>
      <Link to={`/studio/lessons/${lesson.id}/questions`}>{lesson.title.he || lesson.title.en}</Link>
      {" — "}
      <button type="button" onClick={() => openMutation.mutate()} disabled={openMutation.isPending}>
        {t("studio.lessons.openSession")}
      </button>
      {openMutation.isError && <span role="alert">{errorMessage(openMutation.error)}</span>}
      {opened && (
        <div>
          <p>
            {t("studio.lessons.sessionCode")}: <strong>{opened.code}</strong>
          </p>
          <p>
            {t("studio.lessons.joinUrlHint")} <code>{joinUrl}</code>
          </p>
          {!responsesOpen && (
            <button
              type="button"
              onClick={() => openResponsesMutation.mutate()}
              disabled={openResponsesMutation.isPending}
            >
              {t("studio.lessons.openResponses")}
            </button>
          )}
          {openResponsesMutation.isError && (
            <span role="alert">{errorMessage(openResponsesMutation.error)}</span>
          )}
          <Link to={`/present/${opened.classSessionId}`}>{t("studio.lessons.openPresentation")}</Link>
          {" — "}
          <button
            type="button"
            onClick={() => exportAttendanceMutation.mutate()}
            disabled={exportAttendanceMutation.isPending}
          >
            {t("studio.lessons.exportAttendance")}
          </button>
          {exportAttendanceMutation.isError && (
            <span role="alert">{errorMessage(exportAttendanceMutation.error)}</span>
          )}
        </div>
      )}
    </li>
  );
}
