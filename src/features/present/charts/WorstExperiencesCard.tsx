/** Deliberately breaks the site's blue/white theme — black background, big red text, per spec. */
export function WorstExperiencesCard({ texts, noDataLabel }: { texts: string[]; noDataLabel: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-black px-8 py-8">
      {texts.length === 0 ? (
        <p className="text-2xl text-red-500">{noDataLabel}</p>
      ) : (
        texts.map((text, i) => (
          <p
            key={i}
            className="animate-fade-in-up text-center text-xl font-extrabold leading-snug text-red-500 opacity-0 sm:text-2xl lg:text-3xl"
            style={{ animationDelay: `${i * 1800}ms`, animationFillMode: "both" }}
          >
            "{text}"
          </p>
        ))
      )}
    </div>
  );
}
