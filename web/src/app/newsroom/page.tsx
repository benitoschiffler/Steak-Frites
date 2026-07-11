import { loadNewsroom } from "@/lib/data";

export const metadata = { title: "Newsroom — Steak Frites" };

const statusStyle = {
  confirmed: "badge-green",
  projected: "badge-gold",
  rumored: "",
  analysis: "",
} as const;

export default function NewsroomPage() {
  const news = loadNewsroom();
  const reporterById = new Map(news.reporters.map((reporter) => [reporter.id, reporter]));
  const lead = news.articles[0];
  const remaining = news.articles.slice(1);

  return (
    <div className="space-y-10">
      <header className="club-panel overflow-hidden rounded-xl">
        <div className="border-b border-white/10 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-[#f7d77d]">
          Steak Frites · Newsroom
        </div>
        <div className="grid gap-8 p-6 md:grid-cols-[1.4fr_.8fr] md:p-10">
          <div>
            <div className="badge badge-gold">{news.issue_label}</div>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight md:text-6xl">
              The league never sleeps.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#f7edda]/78">
              Keeper intelligence, power rankings, trade-market logic and weekly reporting—built from the actual Steak Frites record.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5 text-sm text-[#f7edda]/75">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f7d77d]">Editorial standard</div>
            <p className="mt-3 leading-6">{news.methodology.editorial}</p>
            <p className="mt-3 text-xs">Generated {new Date(news.generated_at).toLocaleString()} · {news.generation === "openai" ? "AI-polished" : "data edition"}</p>
          </div>
        </div>
      </header>

      {lead && <ArticleCard article={lead} reporter={reporterById.get(lead.reporter_id)} lead />}

      <section>
        <div className="kicker">Latest from the desks</div>
        <h2 className="mt-2 text-3xl font-black tracking-tight">Offseason notebook</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {remaining.map((article) => (
            <ArticleCard key={article.id} article={article} reporter={reporterById.get(article.reporter_id)} />
          ))}
        </div>
      </section>

      <section className="premium-panel rounded-xl p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="kicker">Model board</div>
            <h2 className="mt-1 text-3xl font-black">Final {news.season - 1} power index</h2>
          </div>
          <p className="max-w-xl text-xs leading-5 text-[#766d61] sm:text-right">{news.methodology.power_rankings}</p>
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {news.power_rankings.map((row) => (
            <div key={row.team_id} className="flex gap-4 rounded-lg border border-black/10 bg-white/55 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#123d35] text-lg font-black text-[#f7d77d]">{row.rank}</div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <h3 className="font-black">{row.team_name}</h3>
                  <span className="text-xs font-bold text-[#8a6a22]">{row.record} · {row.score}</span>
                </div>
                <p className="text-xs font-semibold text-[#766d61]">{row.owners.join(" & ")}</p>
                <p className="mt-2 text-sm leading-5 text-[#5f584d]">{row.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="kicker">Masthead</div>
        <h2 className="mt-2 text-3xl font-black">Meet the Newsroom</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {news.reporters.map((reporter) => (
            <div key={reporter.id} className="premium-panel rounded-lg p-4">
              <div className="font-black">{reporter.name}</div>
              <div className="mt-1 text-xs font-bold text-[#8a6a22]">{reporter.role}</div>
              <div className="mt-3 text-xs text-[#766d61]">{reporter.desk}</div>
              {reporter.tone === "playful" && <span className="badge mt-3">Back page</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

type Article = ReturnType<typeof loadNewsroom>["articles"][number];
type Reporter = ReturnType<typeof loadNewsroom>["reporters"][number];

function ArticleCard({ article, reporter, lead = false }: { article: Article; reporter?: Reporter; lead?: boolean }) {
  return (
    <article className={`${lead ? "border-[#8a6a22]/35 bg-[#fff7df] p-6 md:p-8" : "bg-white/65 p-5"} rounded-xl border shadow-sm`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="kicker">{article.label}</span>
        <span className={`badge ${statusStyle[article.status]}`}>{article.status}</span>
        {article.confidence != null && <span className="text-xs font-bold text-[#766d61]">{Math.round(article.confidence * 100)}% confidence</span>}
      </div>
      <h2 className={`${lead ? "text-3xl md:text-5xl" : "text-2xl"} mt-4 font-black leading-tight tracking-tight`}>{article.headline}</h2>
      <p className="mt-3 font-semibold leading-6 text-[#5f584d]">{article.dek}</p>
      <div className="mt-4 text-xs font-bold text-[#8a6a22]">By {reporter?.name ?? "Newsroom Staff"} · {reporter?.role ?? "Staff"}</div>
      <p className="mt-5 text-sm leading-7 text-[#4e493f]">{article.body}</p>
      <details className="mt-5 border-t border-black/10 pt-4 text-sm">
        <summary className="cursor-pointer font-black text-[#123d35]">Why we’re reporting this</summary>
        <ul className="mt-3 space-y-1.5 text-[#6f6a60]">
          {article.evidence.map((item) => <li key={item}>• {item}</li>)}
        </ul>
      </details>
    </article>
  );
}
