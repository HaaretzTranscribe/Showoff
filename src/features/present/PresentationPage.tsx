import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchResponses, type ResponseTable } from "@/lib/responses";
import { useI18n } from "@/i18n/I18nProvider";
import { lessonBase, lessonLanguage } from "@/i18n/lessonLanguage";
import type { Language } from "@/i18n/translations";
import { PresentationLayout } from "./PresentationLayout";
import { BarChartCard } from "./charts/BarChartCard";
import { BigNumberCard } from "./charts/BigNumberCard";
import { ScatterChartCard } from "./charts/ScatterChartCard";
import { WorstExperiencesCard } from "./charts/WorstExperiencesCard";
import { RankedBarsCard } from "./charts/RankedBarsCard";
import { AnswerWallCard } from "./charts/AnswerWallCard";
import * as viz from "./lesson1Visualizations";
import * as viz2 from "./lesson2Visualizations";

// Responses are read live from the sheet (see netlify/functions/sheets.mts),
// so a short interval shows new answers during class within seconds.
const REFRESH_INTERVAL_MS = 15 * 1000;

interface VizMeta {
  questionNumber: string;
  title: Record<Language, string>;
}

interface VizBodyProps {
  vizId: string;
  table: ResponseTable;
  lang: Language;
  noDataLabel: string;
}

/** One lesson's slides: which question each reads and how it's drawn. */
interface LessonScreen {
  meta: Record<string, VizMeta>;
  Body: (props: VizBodyProps) => JSX.Element | null;
  /** Slides sharing a key keep one mounted viz between them (see lesson 1's 7-9). */
  remountKey?: (vizId: string) => string;
  darkVizIds?: string[];
}

// Bespoke per lesson, per the pedagogical plan for lesson 1 — see
// docs/phase_2_addendum_visualizations.md. Future lessons get their
// own registry as their visualization needs become concrete; this is
// deliberately not a generic sheet-driven engine.
const LESSON1_META: Record<string, VizMeta> = {
  "1": {
    questionNumber: "1",
    title: { he: "שאלה 1 — האם מרוצה?", en: "Question 1 — Are you satisfied?" },
  },
  "2": {
    questionNumber: "2",
    title: { he: "שאלה 2 — מידת שביעות רצון", en: "Question 2 — Level of satisfaction" },
  },
  "3": {
    questionNumber: "2",
    title: { he: "שאלה 2 — מרוצים ברמה כלשהי מול לא מרוצים כלל", en: "Question 2 — Satisfied to some degree vs. not satisfied at all" },
  },
  "4": {
    questionNumber: "2",
    title: { he: "שאלה 2 — מרוצים מאוד מול לא מרוצים ברמה כלשהי", en: "Question 2 — Very satisfied vs. not satisfied to some degree" },
  },
  "5": {
    questionNumber: "3",
    title: { he: "שאלה 3 — איך מגיעים", en: "Question 3 — How you get here" },
  },
  "6": {
    questionNumber: "3",
    title: { he: "שאלה 3 — % לא מרוצים לפי אמצעי הגעה", en: "Question 3 — % dissatisfied by mode of transport" },
  },
  "7": {
    questionNumber: "4",
    title: { he: "שאלה 4 — עלות חודשית ממוצעת", en: "Question 4 — Average monthly cost" },
  },
  "8": {
    questionNumber: "4",
    title: { he: "שאלה 4 — עלות חודשית חציונית", en: "Question 4 — Median monthly cost" },
  },
  "9": {
    questionNumber: "4",
    title: { he: "שאלה 4 — זמן הגעה חציוני", en: "Question 4 — Median commute time" },
  },
  "10": {
    questionNumber: "4",
    title: { he: "שאלה 4 — % לא מרוצים לפי רבעון זמן", en: "Question 4 — % dissatisfied by commute-time quartile" },
  },
  "11": {
    questionNumber: "4",
    title: { he: "שאלה 4 — זמן מול עלות", en: "Question 4 — Time vs. cost" },
  },
  "12": {
    questionNumber: "5",
    title: { he: "שאלה 5 — שלוש החוויות הגרועות ביותר", en: "Question 5 — The three worst experiences" },
  },
};

// Lesson 2 (Hebrew "2", English "2e"): one slide per question.
const LESSON2_META: Record<string, VizMeta> = {
  "1": {
    questionNumber: "1",
    title: {
      he: "שאלה 1 — האם לצעירים קשה לקנות דירה?",
      en: "Question 1 — Is it difficult for young people to buy a home?",
    },
  },
  "2": {
    questionNumber: "2",
    title: {
      he: "שאלה 2 — מה הנתון שיגלה אם לצעירים קשה לקנות דירה?",
      en: "Question 2 — What data would tell us whether young people struggle to buy a home?",
    },
  },
  "3": {
    questionNumber: "3",
    title: {
      he: "שאלה 3 — האם המדרכות בישראל מסוכנות להולכי רגל?",
      en: "Question 3 — Are sidewalks in Israel dangerous?",
    },
  },
  "4": {
    questionNumber: "4",
    title: {
      he: "שאלה 4 — מה הנתונים שצריך לאסוף כדי להבין אם תחושת הבטן נכונה?",
      en: "Question 4 — What data would help us?",
    },
  },
  "5": {
    questionNumber: "5",
    title: {
      he: "שאלה 5 — מה שאלות הדאטא שנשאלו בסרטון?",
      en: "Question 5 — What data questions are asked in the video?",
    },
  },
};

const LESSONS: Record<string, LessonScreen> = {
  "1": { meta: LESSON1_META, Body: Lesson1Body, remountKey: vizKey, darkVizIds: ["12"] },
  "2": { meta: LESSON2_META, Body: Lesson2Body },
};

function slideOrder(meta: Record<string, VizMeta>): string[] {
  return Object.keys(meta).sort((a, b) => Number(a) - Number(b));
}

/**
 * Remount key for the viz on screen: each chart slide gets a fresh chart so
 * its entrance animation plays, but the big-number slides (7-9) share one
 * card so the number runs from the previous slide's value to the new one.
 */
function vizKey(vizId: string): string {
  return ["7", "8", "9"].includes(vizId) ? "big-number" : vizId;
}

interface LoadedTable {
  table: ResponseTable;
  at: Date;
}

export function PresentationPage() {
  const { sessionSlug = "", vizId = "" } = useParams();
  const { t } = useI18n();
  // Tables cached per session+question. Prev/next navigation keeps this
  // component mounted; keying by question means a viz never renders from
  // another question's table, and all questions are fetched up front so
  // moving between slides doesn't wait on the network.
  const [tables, setTables] = useState<Record<string, LoadedTable>>({});
  const [notConfiguredKeys, setNotConfiguredKeys] = useState<Set<string>>(() => new Set());

  const screen = LESSONS[lessonBase(sessionSlug)];
  const meta = screen?.meta[vizId];
  const lang = lessonLanguage(sessionSlug);
  const vizOrder = screen ? slideOrder(screen.meta) : [];
  const dataKey = meta ? `${sessionSlug}/${meta.questionNumber}` : "";
  const table = tables[dataKey]?.table ?? null;
  const lastUpdated = tables[dataKey]?.at ?? null;
  const notConfigured = notConfiguredKeys.has(dataKey);
  const currentIndex = vizOrder.indexOf(vizId);
  const prevHref =
    currentIndex > 0 ? `/present/${sessionSlug}/${vizOrder[currentIndex - 1]}` : null;
  const nextHref =
    currentIndex >= 0 && currentIndex < vizOrder.length - 1
      ? `/present/${sessionSlug}/${vizOrder[currentIndex + 1]}`
      : null;

  const loadQuestion = useCallback(
    async (questionNumber: string) => {
      const key = `${sessionSlug}/${questionNumber}`;
      const data = await fetchResponses(sessionSlug, questionNumber);
      if (data === "not_configured") {
        setNotConfiguredKeys((prev) => new Set(prev).add(key));
        return;
      }
      if (!data) return;
      // Keep the same table object when nothing changed, so charts don't
      // re-render on every poll.
      setTables((prev) => {
        const existing = prev[key];
        const table =
          existing && JSON.stringify(existing.table) === JSON.stringify(data) ? existing.table : data;
        return { ...prev, [key]: { table, at: new Date() } };
      });
    },
    [sessionSlug]
  );

  // Prefetch every question of the lesson once, when the presentation opens.
  useEffect(() => {
    if (!screen) return;
    new Set(Object.values(screen.meta).map((m) => m.questionNumber)).forEach((q) => loadQuestion(q));
  }, [screen, loadQuestion]);

  // Keep the slide on screen fresh.
  const currentQuestion = meta?.questionNumber;
  const load = useCallback(async () => {
    if (currentQuestion) await loadQuestion(currentQuestion);
  }, [currentQuestion, loadQuestion]);

  useEffect(() => {
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  if (!screen || !meta) {
    return <div className="p-8 text-center text-slate-500">Unknown visualization.</div>;
  }

  if (notConfigured) {
    return (
      <PresentationLayout
        title={meta.title[lang]}
        lastUpdated={null}
        onRefresh={load}
        prevHref={prevHref}
        nextHref={nextHref}
      >
        <div className="flex flex-1 items-center justify-center text-slate-400">{t.present.noData}</div>
      </PresentationLayout>
    );
  }

  return (
    <PresentationLayout
      title={meta.title[lang]}
      lastUpdated={lastUpdated}
      onRefresh={load}
      dark={screen.darkVizIds?.includes(vizId) ?? false}
      respondentCount={table?.rows.length ?? null}
      prevHref={prevHref}
      nextHref={nextHref}
    >
      {!table ? (
        <p className="text-slate-400">{t.common.loading}</p>
      ) : (
        <screen.Body
          key={screen.remountKey?.(vizId) ?? vizId}
          vizId={vizId}
          table={table}
          lang={lang}
          noDataLabel={t.present.noData}
        />
      )}
    </PresentationLayout>
  );
}

function Lesson1Body({ vizId, table, lang, noDataLabel }: VizBodyProps) {
  const hasData = table.rows.length > 0;
  const minutes = lang === "en" ? "min" : "דקות";

  switch (vizId) {
    case "1":
      return hasData ? (
        <BarChartCard data={viz.viz1(table)} valueSuffix="%" />
      ) : (
        <Empty label={noDataLabel} />
      );
    case "2":
      return hasData ? (
        <BarChartCard data={viz.viz2(table, lang)} valueSuffix="%" />
      ) : (
        <Empty label={noDataLabel} />
      );
    case "3":
      return hasData ? (
        <BarChartCard data={viz.viz3(table, lang)} valueSuffix="%" />
      ) : (
        <Empty label={noDataLabel} />
      );
    case "4":
      return hasData ? (
        <BarChartCard data={viz.viz4(table, lang)} valueSuffix="%" />
      ) : (
        <Empty label={noDataLabel} />
      );
    case "5":
      return hasData ? (
        <BarChartCard data={viz.viz5(table)} valueSuffix="%" />
      ) : (
        <Empty label={noDataLabel} />
      );
    case "6":
      return hasData ? (
        <BarChartCard data={viz.viz6(table, lang)} valueSuffix="%" />
      ) : (
        <Empty label={noDataLabel} />
      );
    case "7":
      return hasData ? (
        <BigNumberCard value={viz.viz7(table)} suffix="₪" decimals={0} />
      ) : (
        <Empty label={noDataLabel} />
      );
    case "8":
      return hasData ? (
        <BigNumberCard value={viz.viz8(table)} suffix="₪" decimals={0} />
      ) : (
        <Empty label={noDataLabel} />
      );
    case "9":
      return hasData ? (
        <BigNumberCard value={viz.viz9(table)} suffix={minutes} decimals={0} />
      ) : (
        <Empty label={noDataLabel} />
      );
    case "10":
      return hasData ? (
        <BarChartCard data={viz.viz10(table, lang)} valueSuffix="%" />
      ) : (
        <Empty label={noDataLabel} />
      );
    case "11":
      return hasData ? (
        <ScatterChartCard
          groups={viz.viz11(table, lang)}
          xLabel={lang === "en" ? "Commute time (min)" : "זמן הגעה (דקות)"}
          yLabel={lang === "en" ? "Monthly cost (₪)" : "עלות חודשית (₪)"}
        />
      ) : (
        <Empty label={noDataLabel} />
      );
    case "12":
      return <WorstExperiencesCard texts={viz.viz12(table, lang)} noDataLabel={noDataLabel} />;
    default:
      return null;
  }
}

function Lesson2Body({ vizId, table, lang, noDataLabel }: VizBodyProps) {
  if (table.rows.length === 0) return <Empty label={noDataLabel} />;

  switch (vizId) {
    case "1":
    case "3":
      return <BarChartCard data={viz2.yesNoBars(table, lang)} valueSuffix="%" />;
    case "2":
    case "4":
      return <RankedBarsCard shares={viz2.choiceShares(table)} lang={lang} />;
    case "5":
      return <AnswerWallCard answers={viz2.textAnswers(table)} lang={lang} />;
    default:
      return null;
  }
}

function Empty({ label }: { label: string }) {
  return <div className="flex flex-1 items-center justify-center text-slate-400">{label}</div>;
}
