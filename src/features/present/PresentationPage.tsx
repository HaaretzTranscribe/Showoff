import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getQuestion } from "@/lib/questions";
import { fetchResponses, type ResponseTable } from "@/lib/responses";
import { useI18n } from "@/i18n/I18nProvider";
import { PresentationLayout } from "./PresentationLayout";
import { BarChartCard } from "./charts/BarChartCard";
import { BigNumberCard } from "./charts/BigNumberCard";
import { ScatterChartCard } from "./charts/ScatterChartCard";
import { WorstExperiencesCard } from "./charts/WorstExperiencesCard";
import * as viz from "./lesson1Visualizations";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

interface VizMeta {
  questionNumber: string;
  title: string;
}

// Bespoke per lesson, per the pedagogical plan for lesson 1 — see
// docs/phase_2_addendum_visualizations.md. Future lessons get their
// own registry as their visualization needs become concrete; this is
// deliberately not a generic sheet-driven engine.
const VIZ_META: Record<string, VizMeta> = {
  "1": { questionNumber: "1", title: "שאלה 1 — האם מרוצה?" },
  "2": { questionNumber: "2", title: "שאלה 2 — מידת שביעות רצון" },
  "3": { questionNumber: "2", title: "שאלה 2 — מרוצים ברמה כלשהי מול לא מרוצים כלל" },
  "4": { questionNumber: "2", title: "שאלה 2 — מרוצים מאוד מול לא מרוצים ברמה כלשהי" },
  "5": { questionNumber: "3", title: "שאלה 3 — איך מגיעים" },
  "6": { questionNumber: "3", title: "שאלה 3 — % לא מרוצים לפי אמצעי הגעה" },
  "7": { questionNumber: "4", title: "שאלה 4 — עלות חודשית ממוצעת" },
  "8": { questionNumber: "4", title: "שאלה 4 — עלות חודשית חציונית" },
  "9": { questionNumber: "4", title: "שאלה 4 — זמן הגעה חציוני" },
  "10": { questionNumber: "4", title: "שאלה 4 — % לא מרוצים לפי רבעון זמן" },
  "11": { questionNumber: "4", title: "שאלה 4 — זמן מול עלות" },
  "12": { questionNumber: "5", title: "שאלה 5 — שלוש החוויות הגרועות ביותר" },
};

const VIZ_ORDER = Object.keys(VIZ_META).sort((a, b) => Number(a) - Number(b));

export function PresentationPage() {
  const { sessionSlug = "", vizId = "" } = useParams();
  const { t } = useI18n();
  const [table, setTable] = useState<ResponseTable | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  const meta = VIZ_META[vizId];
  const currentIndex = VIZ_ORDER.indexOf(vizId);
  const prevHref =
    currentIndex > 0 ? `/present/${sessionSlug}/${VIZ_ORDER[currentIndex - 1]}` : null;
  const nextHref =
    currentIndex >= 0 && currentIndex < VIZ_ORDER.length - 1
      ? `/present/${sessionSlug}/${VIZ_ORDER[currentIndex + 1]}`
      : null;

  const load = useCallback(async () => {
    if (!meta) return;
    const question = await getQuestion(sessionSlug, meta.questionNumber);
    if (!question?.responsesCsvUrl) {
      setNotConfigured(true);
      return;
    }
    const data = await fetchResponses(question.responsesCsvUrl);
    if (data) {
      setTable(data);
      setLastUpdated(new Date());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionSlug, vizId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  if (!meta) {
    return <div className="p-8 text-center text-slate-500">Unknown visualization.</div>;
  }

  if (notConfigured) {
    return (
      <PresentationLayout
        title={meta.title}
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
      title={meta.title}
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
        <VizBody vizId={vizId} table={table} noDataLabel={t.present.noData} />
      )}
    </PresentationLayout>
  );
}

function VizBody({
  vizId,
  table,
  noDataLabel,
}: {
  vizId: string;
  table: ResponseTable;
  noDataLabel: string;
}) {
  const hasData = table.rows.length > 0;

  switch (vizId) {
    case "1":
      return hasData ? (
        <BarChartCard data={viz.viz1(table)} valueSuffix="%" />
      ) : (
        <Empty label={noDataLabel} />
      );
    case "2":
      return hasData ? (
        <BarChartCard data={viz.viz2(table)} valueSuffix="%" />
      ) : (
        <Empty label={noDataLabel} />
      );
    case "3":
      return hasData ? (
        <BarChartCard data={viz.viz3(table)} valueSuffix="%" />
      ) : (
        <Empty label={noDataLabel} />
      );
    case "4":
      return hasData ? (
        <BarChartCard data={viz.viz4(table)} valueSuffix="%" />
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
        <BarChartCard data={viz.viz6(table)} valueSuffix="%" />
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
        <BigNumberCard value={viz.viz9(table)} suffix="דקות" decimals={0} />
      ) : (
        <Empty label={noDataLabel} />
      );
    case "10":
      return hasData ? (
        <BarChartCard data={viz.viz10(table)} valueSuffix="%" />
      ) : (
        <Empty label={noDataLabel} />
      );
    case "11":
      return hasData ? (
        <ScatterChartCard groups={viz.viz11(table)} xLabel="זמן הגעה (דקות)" yLabel="עלות חודשית (₪)" />
      ) : (
        <Empty label={noDataLabel} />
      );
    case "12":
      return <WorstExperiencesCard texts={viz.viz12(table)} noDataLabel={noDataLabel} />;
    default:
      return null;
  }
}

function Empty({ label }: { label: string }) {
  return <div className="flex flex-1 items-center justify-center text-slate-400">{label}</div>;
}
