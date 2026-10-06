import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchResponses, type ResponseTable } from "@/lib/responses";
import { useI18n } from "@/i18n/I18nProvider";
import { lessonLanguage } from "@/i18n/lessonLanguage";
import type { Language } from "@/i18n/translations";
import { PresentationLayout } from "./PresentationLayout";
import { BarChartCard } from "./charts/BarChartCard";
import { BigNumberCard } from "./charts/BigNumberCard";
import { ScatterChartCard } from "./charts/ScatterChartCard";
import { WorstExperiencesCard } from "./charts/WorstExperiencesCard";
import * as viz from "./lesson1Visualizations";

// Responses are read live from the sheet (see netlify/functions/sheets.mts),
// so a short interval shows new answers during class within seconds.
const REFRESH_INTERVAL_MS = 15 * 1000;

interface VizMeta {
  questionNumber: string;
  title: Record<Language, string>;
}

// Bespoke per lesson, per the pedagogical plan for lesson 1 — see
// docs/phase_2_addendum_visualizations.md. Future lessons get their
// own registry as their visualization needs become concrete; this is
// deliberately not a generic sheet-driven engine.
const VIZ_META: Record<string, VizMeta> = {
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

const VIZ_ORDER = Object.keys(VIZ_META).sort((a, b) => Number(a) - Number(b));
const QUESTION_NUMBERS = Array.from(new Set(Object.values(VIZ_META).map((m) => m.questionNumber)));

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

  const meta = VIZ_META[vizId];
  const lang = lessonLanguage(sessionSlug);
  const dataKey = meta ? `${sessionSlug}/${meta.questionNumber}` : "";
  const table = tables[dataKey]?.table ?? null;
  const lastUpdated = tables[dataKey]?.at ?? null;
  const notConfigured = notConfiguredKeys.has(dataKey);
  const currentIndex = VIZ_ORDER.indexOf(vizId);
  const prevHref =
    currentIndex > 0 ? `/present/${sessionSlug}/${VIZ_ORDER[currentIndex - 1]}` : null;
  const nextHref =
    currentIndex >= 0 && currentIndex < VIZ_ORDER.length - 1
      ? `/present/${sessionSlug}/${VIZ_ORDER[currentIndex + 1]}`
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
    QUESTION_NUMBERS.forEach((q) => loadQuestion(q));
  }, [loadQuestion]);

  // Keep the slide on screen fresh.
  const currentQuestion = meta?.questionNumber;
  const load = useCallback(async () => {
    if (currentQuestion) await loadQuestion(currentQuestion);
  }, [currentQuestion, loadQuestion]);

  useEffect(() => {
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  if (!meta) {
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
      dark={vizId === "12"}
      respondentCount={table?.rows.length ?? null}
      prevHref={prevHref}
      nextHref={nextHref}
    >
      {!table ? (
        <p className="text-slate-400">{t.common.loading}</p>
      ) : (
        <VizBody key={vizKey(vizId)} vizId={vizId} table={table} lang={lang} noDataLabel={t.present.noData} />
      )}
    </PresentationLayout>
  );
}

function VizBody({
  vizId,
  table,
  lang,
  noDataLabel,
}: {
  vizId: string;
  table: ResponseTable;
  lang: Language;
  noDataLabel: string;
}) {
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

function Empty({ label }: { label: string }) {
  return <div className="flex flex-1 items-center justify-center text-slate-400">{label}</div>;
}
