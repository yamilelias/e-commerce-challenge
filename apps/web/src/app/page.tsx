import Link from "next/link";
import { CatalogResults } from "@/components/catalog/CatalogResults";
import { CategoryLinks } from "@/components/catalog/CategoryLinks";

export default function HomePage() {
  return <>
    <section className="hero-pattern text-white">
      <div className="mx-auto grid min-h-[420px] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:py-24">
        <div>
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.22em] text-[#dce7d8]">Everyday finds, all in one place</p>
          <h1 className="editorial max-w-2xl text-5xl leading-tight sm:text-6xl">Find something that fits your day.</h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/85">Explore the catalog across home, outdoors, food, and more. Browse what is available today.</p>
          <Link className="btn btn-accent mt-8 rounded-full px-8" href="/products">Shop the catalog <span aria-hidden="true">→</span></Link>
        </div>
        <div className="hidden min-h-72 items-center justify-center rounded-[2rem] border border-white/15 bg-white/10 p-8 lg:flex" aria-hidden="true">
          <div className="editorial flex h-60 w-60 rotate-[-12deg] items-center justify-center rounded-[3rem] border border-white/30 bg-white/10 text-8xl text-white/80 shadow-2xl">F</div>
        </div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6" aria-labelledby="featured-heading">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">The catalog</p><h2 id="featured-heading" className="editorial mt-2 text-3xl font-semibold sm:text-4xl">Explore the collection</h2></div><Link className="link link-primary font-semibold" href="/products">All products →</Link></div>
      <CatalogResults query={{ page: 1, per_page: 4 }} compact />
    </section>
    <CategoryLinks />
  </>;
}
