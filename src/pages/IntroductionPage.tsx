import { Link } from 'react-router-dom';
import { Activity, ArrowRight, BarChart3, CloudSun, MapPin, ShieldCheck } from 'lucide-react';

const featureHighlights = [
  {
    icon: MapPin,
    title: 'Community Map',
    description: 'Find nearby health, food, housing, transport, library, and community support services.',
  },
  {
    icon: CloudSun,
    title: 'Weather & Heat Safety',
    description: 'Check local weather guidance and discover cooler indoor places during hot conditions.',
  },
  {
    icon: Activity,
    title: 'Wellbeing Activities',
    description: 'Access gentle exercise resources and entertainment options designed for older adults.',
  },
  {
    icon: BarChart3,
    title: 'Population Insights',
    description: 'Explore ageing population trends that help explain community support needs.',
  },
];

export default function IntroductionPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold text-teal-800">SafeConnect</p>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Project Introduction</p>
            </div>
          </div>
          <Link
            to="/senior"
            className="hidden rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 sm:inline-flex"
          >
            Enter SafeConnect
          </Link>
        </header>

        <div className="flex flex-1 flex-col justify-center gap-6 py-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 shadow-xl">
            <img
              src="https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1600&q=80"
              alt="A welcoming community group gathered together"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/62 to-teal-900/18" />
            <div className="relative max-w-3xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-100">Older adult support platform</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                Connecting older adults with safer, simpler community support.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-100 sm:text-lg">
                SafeConnect helps older adults and support workers find nearby services, plan visits, respond to weather
                risks, and access practical wellbeing resources in one calm digital experience.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/senior"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-teal-400"
                >
                  Enter SafeConnect <ArrowRight className="h-5 w-5" />
                </Link>
                <a
                  href="/iteration1/"
                  className="inline-flex items-center justify-center rounded-xl border border-white/40 bg-white/12 px-5 py-3 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  View Iteration 1
                </a>
              </div>
            </div>
          </div>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featureHighlights.map(feature => (
              <article key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-slate-900">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
              </article>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}
