/** Deliberately breaks the site's blue/white theme — black background, big red text, per spec. */
export function WorstExperiencesCard({ texts, noDataLabel }: { texts: string[]; noDataLabel: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-black px-8 py-12">
      {texts.length === 0 ? (
        <p className="text-2xl text-red-500">{noDataLabel}</p>
      ) : (
        texts.map((text, i) => (
          <p
            key={i}
            className="animate-fade-in-up text-center text-5xl font-extrabold leading-snug text-red-500 sm:text-6xl lg:text-7xl"
            style={{ animationDelay: `${i * 150}ms` }}
          >
            "{text}"
          </p>
        ))
      )}
    </div>
  );
}
