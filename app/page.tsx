import Link from "next/link";

export default function WelcomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 py-16">
      <div className="w-full max-w-xl animate-slide-up motion-reduce:animate-none">
        <div className="mb-8 flex items-center gap-3">
          <span className="badge-square">RGS</span>
          <span className="font-display text-sm font-semibold uppercase tracking-wide text-ink/60">
            Revenue Growth Scan
          </span>
        </div>

        <h1 className="mb-4 font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">
          Waar lekt jouw marketing- en salesfabriek?
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-ink/70">
          Beantwoord 46 korte stellingen over hoe je klanten werft, overtuigt en behoudt. Je krijgt
          direct een persoonlijk rapport: jouw score per thema, vergeleken met het gemiddelde en de
          beste deelnemer tot nu toe — plus de 5 concrete verbeteringen die het meeste opleveren.
        </p>

        <dl className="mb-10 grid grid-cols-3 gap-4 text-sm">
          <div className="card !p-4">
            <dt className="text-ink/50">Tijd nodig</dt>
            <dd className="font-display text-lg font-bold">10–15 min</dd>
          </div>
          <div className="card !p-4">
            <dt className="text-ink/50">Stellingen</dt>
            <dd className="font-display text-lg font-bold">46</dd>
          </div>
          <div className="card !p-4">
            <dt className="text-ink/50">Thema&apos;s</dt>
            <dd className="font-display text-lg font-bold">12</dd>
          </div>
        </dl>

        <Link href="/scan" className="btn-primary w-full sm:w-auto">
          Start de scan
        </Link>

        <p className="mt-6 text-xs text-ink/40">
          Je vult eerst alle stellingen in; pas daarna vragen we je gegevens om het rapport te
          bekijken. Je voortgang wordt automatisch bewaard in je browser.
        </p>
      </div>
    </main>
  );
}
