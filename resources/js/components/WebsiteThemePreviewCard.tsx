import { WebsiteThemeKey, WebsiteTemplateKey, websiteThemes, WebsiteContent } from '../utils/websiteCmsContent';
import { Check, Eye } from 'lucide-react';

const templateLabels: Record<WebsiteTemplateKey, string> = {
  template1: 'Classic Admissions',
  template2: '3D Modern',
  template3: 'Heritage Editorial',
  template4: 'Colorful Classic',
  template5: 'Classic Institutional',
};

/* ── Template 1: Classic Admissions ─────────────────────────────── */

function TemplateOneMiniPreview() {
  return (
    <div className="bg-[linear-gradient(180deg,#f0f9ff,#f8fbff)]">
      {/* Nav */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-md bg-slate-800" />
          <span className="text-[5px] font-bold uppercase tracking-wider text-slate-700">Gurukul</span>
        </div>
        <div className="flex gap-1.5 rounded-full border border-slate-200/80 bg-white/85 px-2 py-0.5 text-[4.5px] text-slate-600">
          <span>About</span>
          <span>Programs</span>
          <span>Contact</span>
        </div>
        <div className="rounded-full bg-gradient-to-br from-slate-900 to-blue-600 px-1.5 py-0.5 text-[4px] font-semibold text-white">Apply</div>
      </div>

      {/* Hero */}
      <div className="grid grid-cols-[1.1fr_0.9fr] gap-2 px-3 pb-2 pt-1">
        <div>
          <div className="inline-block rounded-full border border-sky-200 bg-white/90 px-1.5 py-0.5 text-[4px] font-medium text-sky-800">Admissions Open 2026</div>
          <h3 className="mt-1 text-[7px] font-black leading-tight text-slate-950">
            A modern learning
            <span className="block bg-clip-text text-transparent bg-[linear-gradient(135deg,#0f172a,#2563eb,#2563EB)]">destination for all</span>
          </h3>
          <p className="mt-0.5 text-[4.5px] leading-relaxed text-slate-500">Building future leaders through excellence.</p>
          <div className="mt-1.5 flex gap-1">
            <div className="rounded-full bg-gradient-to-br from-slate-900 to-blue-600 px-2 py-0.5 text-[4px] font-semibold text-white">Explore</div>
            <div className="rounded-full border border-slate-200 bg-white/90 px-2 py-0.5 text-[4px] font-semibold text-slate-700">Portal</div>
          </div>
          {/* Stat cards */}
          <div className="mt-2 grid grid-cols-3 gap-1">
            {['500+', '50+', '98%'].map((v) => (
              <div key={v} className="rounded-lg border border-slate-200/80 bg-white/80 p-1 text-center backdrop-blur">
                <p className="text-[6px] font-black text-slate-900">{v}</p>
                <p className="text-[3.5px] text-slate-400">students</p>
              </div>
            ))}
          </div>
        </div>
        {/* 3D Spotlight panel */}
        <div className="relative" style={{ perspective: '400px' }}>
          <div className="rounded-xl border border-slate-200/80 bg-[linear-gradient(160deg,rgba(255,255,255,0.94),rgba(239,246,255,0.92),rgba(239,246,255,0.88))] p-2 shadow-lg backdrop-blur-2xl" style={{ transform: 'rotateY(-12deg) rotateX(6deg)' }}>
            <div className="rounded-lg border border-slate-200/70 bg-white/80 p-1.5">
              <p className="text-[4px] font-bold uppercase tracking-widest text-sky-700">Spotlight</p>
              <div className="mt-1 grid grid-cols-2 gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-md border border-slate-200/80 bg-white/88 p-1">
                    <div className="h-2 w-2 rounded-sm bg-gradient-to-br from-blue-100 to-blue-100" />
                    <div className="mt-0.5 h-0.5 w-4 rounded bg-slate-800" />
                    <div className="mt-0.5 h-0.5 w-3 rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-1 rounded-md bg-gradient-to-br from-sky-100 to-blue-50 p-1">
              <p className="text-[3.5px] font-semibold text-slate-700">Live Overview</p>
            </div>
          </div>
        </div>
      </div>

      {/* Programs row */}
      <div className="grid grid-cols-4 gap-1 px-3 pb-2">
        {['Pre-K', 'Primary', 'Middle', 'Senior'].map((p, i) => (
          <div key={p} className={`rounded-md border p-1 ${i % 2 === 0 ? 'border-blue-200/70 bg-[linear-gradient(180deg,rgba(239,246,255,0.96),rgba(255,255,255,0.92))]' : 'border-sky-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.96),rgba(255,255,255,0.92))]'}`}>
            <div className="text-[4px] font-bold text-slate-800">{p}</div>
            <div className="mt-0.5 h-0.5 w-3 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between bg-slate-50 px-3 py-1">
        <div className="h-0.5 w-6 rounded bg-slate-200" />
        <div className="h-0.5 w-4 rounded bg-slate-200" />
      </div>
    </div>
  );
}

/* ── Template 2: 3D Modern ─────────────────────────────────────── */

function TemplateTwoMiniPreview() {
  return (
    <div className="bg-[radial-gradient(circle_at_top_left,#1a2744,#0b1223)]">
      {/* Nav */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-md bg-white/20" />
          <span className="text-[5px] font-bold uppercase tracking-wider text-slate-200">Gurukul</span>
        </div>
        <div className="flex gap-1.5 rounded-full border border-white/12 bg-white/6 px-2 py-0.5 text-[4.5px] text-slate-300">
          <span>About</span>
          <span>Gallery</span>
          <span>Contact</span>
        </div>
        <div className="rounded-full bg-[linear-gradient(135deg,#67e8f9,#a78bfa,#93c5fd)] px-1.5 py-0.5 text-[4px] font-semibold text-slate-950">Apply</div>
      </div>

      {/* Hero */}
      <div className="grid grid-cols-[0.88fr_1.12fr] gap-2 px-3 pb-2 pt-1">
        <div>
          <div className="inline-block rounded-full border border-cyan-300/20 bg-cyan-300/10 px-1.5 py-0.5 text-[4px] font-medium text-cyan-200">Welcome 2026</div>
          <h3 className="mt-1 text-[7px] font-black leading-tight text-white">
            Future of
            <span className="block bg-clip-text text-transparent bg-[linear-gradient(135deg,#67e8f9,#93c5fd,#bfdbfe)]">learning starts</span>
          </h3>
          <p className="mt-0.5 text-[4.5px] leading-relaxed text-slate-400">Innovation meets tradition.</p>
          <div className="mt-1.5 flex gap-1">
            <div className="rounded-full bg-[linear-gradient(135deg,#22d3ee,#60a5fa)] px-2 py-0.5 text-[4px] font-semibold text-slate-950">Explore</div>
            <div className="rounded-full border border-white/15 bg-white/6 px-2 py-0.5 text-[4px] font-semibold text-white">Portal</div>
          </div>
          {/* Stats */}
          <div className="mt-2 grid grid-cols-2 gap-1">
            {['1200+', '99%'].map((v, i) => (
              <div key={v} className={`rounded-lg border border-white/10 bg-white/5 p-1 text-center ${i % 2 === 1 ? 'translate-x-1' : ''}`}>
                <p className="text-[6px] font-black text-white">{v}</p>
                <p className="text-[3.5px] text-slate-400">{i === 0 ? 'students' : 'results'}</p>
              </div>
            ))}
          </div>
        </div>
        {/* 3D Carousel */}
        <div className="relative" style={{ perspective: '600px' }}>
          <div className="rounded-xl border border-white/12 bg-[linear-gradient(160deg,rgba(23,51,94,0.8),rgba(15,23,42,0.9))] p-2 shadow-xl backdrop-blur" style={{ transform: 'rotateY(-6deg) rotateX(4deg)' }}>
            <div className="rounded-lg bg-[radial-gradient(circle_at_top_right,rgba(103,232,249,0.16),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(244,114,182,0.12),transparent_40%)] p-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[4px] font-bold uppercase tracking-widest text-cyan-200">Campus</p>
                  <p className="text-[5px] font-bold text-white">3D Experience</p>
                </div>
                <div className="h-4 w-4 rounded-full bg-gradient-to-br from-cyan-300 to-pink-300 opacity-30" />
              </div>
              {/* Progress bar */}
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-3/5 rounded-full bg-[linear-gradient(90deg,#67e8f9,#a78bfa,#93c5fd)]" />
              </div>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-md border border-white/10 bg-white/5 p-1">
                  <div className="h-2 w-2 rounded-sm bg-gradient-to-br from-pink-300 to-blue-200 opacity-70" />
                  <div className="mt-0.5 h-0.5 w-4 rounded bg-white/20" />
                </div>
              ))}
            </div>
          </div>
          {/* Floating shape */}
          <div className="absolute -right-1 top-0 h-3 w-3 rounded-lg border border-cyan-300/15 bg-cyan-300/10" style={{ animation: 'float 4s ease-in-out infinite' }} />
        </div>
      </div>

      {/* Gallery */}
      <div className="grid grid-cols-3 gap-1 px-3 pb-2">
        {['#1a2744', '#172350', '#0f1d3a'].map((c, i) => (
          <div key={i} className={`rounded-md border border-white/10 bg-white/5 ${i === 0 ? 'row-span-2' : ''}`}>
            <div className="h-3 w-full rounded-t-md" style={{ background: `linear-gradient(135deg, ${c}, #0b1223)` }} />
            <div className="p-1">
              <div className="h-0.5 w-3 rounded bg-white/20" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between bg-[#070b16] px-3 py-1">
        <div className="h-0.5 w-6 rounded bg-white/10" />
        <div className="h-0.5 w-4 rounded bg-white/10" />
      </div>
    </div>
  );
}

/* ── Template 3: Heritage Editorial ─────────────────────────────── */

function TemplateThreeMiniPreview() {
  return (
    <div className="bg-[linear-gradient(180deg,#f0f4ff,#e0e7ff,#f0f9ff,#e9eef5)]">
      {/* Nav */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-1">
          <div className="flex h-3 w-3 items-center justify-center rounded-full border border-stone-300 bg-white/90 text-blue-800">
            <span className="text-[4px]">🎓</span>
          </div>
          <span className="font-serif text-[5.5px] font-semibold tracking-wide text-stone-950">Gurukul</span>
        </div>
        <div className="flex gap-1.5 rounded-full border border-white/70 bg-white/70 px-2 py-0.5 text-[4.5px] text-stone-600 backdrop-blur">
          <span>About</span>
          <span>Programs</span>
          <span>Contact</span>
        </div>
        <div className="rounded-full bg-[linear-gradient(135deg,#1e3a5f,#1d4ed8,#1e40af)] px-1.5 py-0.5 text-[4px] font-semibold text-white">Apply</div>
      </div>

      {/* Hero */}
      <div className="grid grid-cols-[0.94fr_1.06fr] gap-2 px-3 pb-2 pt-1">
        <div>
          <div className="inline-flex items-center gap-0.5 rounded-full border border-blue-200 bg-white/80 px-1.5 py-0.5 text-[4px] font-semibold text-blue-900">✦ Admissions Open</div>
          <h3 className="mt-1 font-serif text-[7.5px] font-semibold leading-tight text-stone-950">
            Nurturing
            <span className="mt-0.5 block text-blue-800">Minds of Tomorrow</span>
          </h3>
          <p className="mt-0.5 text-[4.5px] leading-relaxed text-stone-600">A legacy of academic excellence.</p>
          <div className="mt-1.5 flex gap-1">
            <div className="rounded-full bg-stone-950 px-2 py-0.5 text-[4px] font-semibold text-white">Explore</div>
            <div className="rounded-full border border-stone-300 bg-white/80 px-2 py-0.5 text-[4px] font-semibold text-stone-800">Portal</div>
          </div>
          {/* Highlight cards */}
          <div className="mt-2 grid grid-cols-2 gap-1">
            {['500+', '98%'].map((v) => (
              <div key={v} className="rounded-xl border border-white/70 bg-white/75 p-1 backdrop-blur">
                <p className="font-serif text-[6px] font-semibold text-stone-950">{v}</p>
                <p className="text-[3.5px] uppercase tracking-wider text-stone-500">{v === '500+' ? 'students' : 'pass rate'}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Hero image placeholder */}
        <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/40 p-1 shadow-lg backdrop-blur-2xl">
          <div className="relative h-full min-h-[5rem] overflow-hidden rounded-xl bg-gradient-to-br from-blue-100 via-orange-50 to-sky-100">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(30,58,95,0.15),transparent_60%)]" />
            {/* Overlay panels at bottom */}
            <div className="absolute bottom-1 left-1 right-1 flex gap-1">
              <div className="flex-1 rounded-md border border-white/70 bg-white/80 p-1 backdrop-blur">
                <p className="text-[3.5px] font-semibold text-stone-700">Open House</p>
                <p className="text-[3px] text-stone-500">Mar 15, 2026</p>
              </div>
              <div className="flex-1 rounded-md bg-stone-900/90 p-1">
                <p className="text-[3.5px] font-semibold text-white">Overview</p>
                <p className="text-[3px] text-stone-400">25+ acres</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Programs */}
      <div className="grid grid-cols-4 gap-1 px-3 pb-2">
        {['Pre-K', 'Primary', 'Middle', 'Senior'].map((p, i) => (
          <div key={p} className={`rounded-lg border p-1 ${i % 2 === 0 ? 'border-blue-200/60 bg-[#f0f4ff]' : 'border-sky-200/60 bg-[#f8fbff]'}`}>
            <div className="font-serif text-[4px] font-semibold text-stone-800">{p}</div>
            <div className="mt-0.5 h-0.5 w-3 rounded bg-stone-200" />
          </div>
        ))}
      </div>

      {/* Dark stats band */}
      <div className="mx-3 mb-2 rounded-xl bg-gradient-to-br from-stone-800 via-stone-700 to-stone-900 p-2">
        <div className="grid grid-cols-3 gap-1">
          {['25+', '500+', '100%'].map((v) => (
            <div key={v} className="text-center">
              <p className="font-serif text-[6px] font-semibold text-white">{v}</p>
              <p className="text-[3px] text-stone-400">{v === '25+' ? 'years' : v === '500+' ? 'students' : 'care'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between bg-stone-100 px-3 py-1">
        <div className="h-0.5 w-6 rounded bg-stone-200" />
        <div className="h-0.5 w-4 rounded bg-stone-200" />
      </div>
    </div>
  );
}

/* ── Template 4: Colorful Classic ─────────────────────────────── */

function TemplateFourMiniPreview() {
  return (
    <div className="bg-[linear-gradient(180deg,#f0f9ff,#f0f9ff,#e0e7ff,#edf4ff)]">
      {/* Top info bar */}
      <div className="bg-[linear-gradient(90deg,#1e3a5f,#1e40af,#1d4ed8)] px-3 py-0.5">
        <div className="flex items-center justify-between text-[3.5px] text-white">
          <span>📞 +91 98765 43210</span>
          <span>✉ info@gurukul.edu</span>
        </div>
      </div>

      {/* Nav with tabs */}
      <div className="flex items-center justify-between border-b border-blue-200/70 bg-white/90 px-3 py-1.5 backdrop-blur">
        <div className="flex items-center gap-1">
          <div className="flex h-3 w-3 items-center justify-center rounded-full border border-blue-300 bg-gradient-to-br from-blue-50 to-blue-200 text-blue-900">
            <span className="text-[4px]">🎓</span>
          </div>
          <span className="font-serif text-[5.5px] font-semibold tracking-wide text-stone-950">Gurukul</span>
        </div>
        <div className="flex gap-0.5">
          <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[3.5px] font-semibold text-white">About</span>
          <span className="rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[3.5px] text-slate-600">Gallery</span>
          <span className="rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[3.5px] text-slate-600">Events</span>
        </div>
        <div className="rounded-full bg-[linear-gradient(135deg,#1e3a5f,#1e40af)] px-1.5 py-0.5 text-[4px] font-semibold text-white">Apply</div>
      </div>

      {/* Hero */}
      <div className="grid grid-cols-[1fr_0.95fr] gap-2 px-3 pb-2 pt-1.5">
        <div>
          <div className="inline-flex items-center gap-0.5 rounded-full border border-blue-200 bg-white px-1.5 py-0.5 text-[4px] font-semibold text-blue-900">✦ Admissions Open</div>
          <h3 className="mt-1 font-serif text-[7.5px] font-semibold leading-tight text-stone-950">
            Building Futures
            <span className="mt-0.5 block text-blue-800">With Excellence</span>
          </h3>
          <p className="mt-0.5 text-[4.5px] leading-relaxed text-stone-600">Where every child matters.</p>
          <div className="mt-1.5 flex gap-1">
            <div className="rounded-full bg-stone-950 px-2 py-0.5 text-[4px] font-semibold text-white">Explore</div>
            <div className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[4px] font-semibold text-blue-900">Contact</div>
          </div>
          {/* Notice */}
          <div className="mt-1.5 rounded-md border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-50 p-1">
            <p className="text-[3.5px] font-semibold text-blue-800">📢 Notice: Admissions 2026-27 are now open!</p>
          </div>
          {/* Highlight cards in rose/blue/sky */}
          <div className="mt-1.5 grid grid-cols-3 gap-0.5">
            <div className="rounded-md border border-rose-200 bg-rose-50/90 p-0.5 text-center">
              <p className="text-[5px] font-bold text-rose-800">500+</p>
              <p className="text-[3px] text-rose-500">students</p>
            </div>
            <div className="rounded-md border border-blue-200 bg-blue-50/90 p-0.5 text-center">
              <p className="text-[5px] font-bold text-blue-800">50+</p>
              <p className="text-[3px] text-blue-500">staff</p>
            </div>
            <div className="rounded-md border border-sky-200 bg-sky-50/90 p-0.5 text-center">
              <p className="text-[5px] font-bold text-sky-800">98%</p>
              <p className="text-[3px] text-sky-500">results</p>
            </div>
          </div>
        </div>
        {/* Hero image area */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50 to-sky-50 p-1 shadow-md">
          <div className="h-full min-h-[5rem] rounded-xl bg-gradient-to-br from-blue-100 via-blue-50 to-sky-100" />
          <div className="absolute bottom-1 left-1 right-1 rounded-md border border-blue-200 bg-white/90 p-1 backdrop-blur">
            <p className="text-[3.5px] font-semibold text-blue-900">Campus Admissions</p>
            <p className="text-[3px] text-stone-500">Walk-in inquiries welcome</p>
          </div>
        </div>
      </div>

      {/* Color-coded sections */}
      <div className="mx-3 mb-1 grid grid-cols-3 gap-1">
        {/* About - blue */}
        <div className="rounded-lg border border-blue-200 bg-white/80 p-1">
          <div className="mb-0.5 flex items-center gap-0.5">
            <div className="h-1.5 w-1.5 rounded-sm bg-rose-100 text-rose-600" />
            <span className="text-[4px] font-bold text-stone-800">About</span>
          </div>
          <div className="h-0.5 w-full rounded bg-blue-100" />
          <div className="mt-0.5 h-0.5 w-3/4 rounded bg-stone-200" />
        </div>
        {/* Gallery - sky */}
        <div className="rounded-lg border border-sky-200 bg-white/80 p-1">
          <div className="mb-0.5 flex items-center gap-0.5">
            <div className="h-1.5 w-1.5 rounded-sm bg-sky-100 text-sky-600" />
            <span className="text-[4px] font-bold text-stone-800">Gallery</span>
          </div>
          <div className="grid grid-cols-2 gap-0.5">
            <div className="h-2 rounded bg-sky-100" />
            <div className="h-2 rounded bg-sky-50" />
          </div>
        </div>
        {/* Events - emerald */}
        <div className="rounded-lg border border-emerald-200 bg-white/80 p-1">
          <div className="mb-0.5 flex items-center gap-0.5">
            <div className="h-1.5 w-1.5 rounded-sm bg-emerald-100 text-emerald-600" />
            <span className="text-[4px] font-bold text-stone-800">Events</span>
          </div>
          <div className="space-y-0.5">
            <div className="h-1 rounded bg-emerald-50" />
            <div className="h-1 rounded bg-emerald-50" />
          </div>
        </div>
      </div>

      {/* Contact section - rose */}
      <div className="mx-3 mb-2 rounded-lg border border-rose-200 bg-white/80 p-1">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-0.5">
              <div className="h-1 w-1 rounded-full bg-rose-100" />
              <span className="text-[3.5px] text-stone-600">📞 Contact</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="h-1 w-1 rounded-full bg-rose-100" />
              <span className="text-[3.5px] text-stone-600">✉ Email</span>
            </div>
          </div>
          {/* Map placeholder */}
          <div className="h-4 w-8 rounded border border-sky-200 bg-sky-50" />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between bg-stone-100 px-3 py-1">
        <div className="h-0.5 w-6 rounded bg-stone-200" />
        <div className="h-0.5 w-4 rounded bg-stone-200" />
      </div>
    </div>
  );
}

/* ── Template 5: Classic Institutional ───────────────────────── */

function TemplateFiveMiniPreview() {
  return (
    <div className="bg-[linear-gradient(180deg,#f0f4f8,#ffffff)]">
      {/* Top bar */}
      <div className="bg-[#002147] px-3 py-0.5">
        <div className="flex items-center justify-between text-[3.5px] text-white">
          <span>📞 +91 98765 43210</span>
          <span>✉ info@gurukul.edu</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-1.5">
        <div className="flex items-center gap-1">
          <div className="flex h-3 w-3 items-center justify-center rounded-full border-2 border-[#2563EB] bg-white text-[#002147]">
            <span className="text-[4px]">🎓</span>
          </div>
          <span className="font-serif text-[5.5px] font-bold tracking-wide text-[#002147]">Gurukul</span>
        </div>
        <div className="rounded bg-[#2563EB] px-1.5 py-0.5 text-[3.5px] font-semibold text-white">Accredited</div>
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between bg-[#2563EB] px-3 py-1">
        <div className="flex gap-1.5 text-[4px] font-semibold text-white">
          <span>Home</span>
          <span>About</span>
          <span>Admissions</span>
          <span>Departments</span>
        </div>
      </div>

      {/* Marquee */}
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-0.5">
        <p className="text-[3px] text-[#002147]">📢 Admissions are open for 2026-27 academic year</p>
      </div>

      {/* Hero */}
      <div className="bg-[linear-gradient(135deg,#002147,#003366)] px-3 py-3">
        <h3 className="font-serif text-[7px] font-bold leading-tight text-white">
          Empowering Minds,
          <span className="mt-0.5 block text-[#2563EB]">Shaping Futures</span>
        </h3>
        <p className="mt-0.5 text-[4px] leading-relaxed text-slate-300">A Legacy of Academic Excellence Since 1979</p>
        <div className="mt-1.5 flex gap-1">
          <div className="rounded bg-[#2563EB] px-2 py-0.5 text-[3.5px] font-semibold text-white">Apply Now</div>
          <div className="rounded border border-white/30 px-2 py-0.5 text-[3.5px] font-semibold text-white">Learn More</div>
        </div>
      </div>

      {/* Achievements bar */}
      <div className="grid grid-cols-4 gap-0.5 bg-[#2563EB] px-3 py-1">
        {['3200+', '120+', '96%', '45+'].map((v) => (
          <div key={v} className="text-center">
            <p className="text-[5px] font-black text-white">{v}</p>
            <p className="text-[2.5px] text-white/70">students</p>
          </div>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-1 px-3 py-2">
        <div className="rounded border border-slate-200 bg-white p-1">
          <div className="h-1 w-1 rounded-sm bg-[#002147]" />
          <p className="mt-0.5 text-[3.5px] font-bold text-[#002147]">Arts</p>
          <div className="mt-0.5 h-0.5 w-3 rounded bg-slate-200" />
        </div>
        <div className="rounded border border-slate-200 bg-white p-1">
          <div className="h-1 w-1 rounded-sm bg-[#2563EB]" />
          <p className="mt-0.5 text-[3.5px] font-bold text-[#002147]">Commerce</p>
          <div className="mt-0.5 h-0.5 w-3 rounded bg-slate-200" />
        </div>
        <div className="rounded border border-slate-200 bg-white p-1">
          <div className="h-1 w-1 rounded-sm bg-emerald-500" />
          <p className="mt-0.5 text-[3.5px] font-bold text-[#002147]">Science</p>
          <div className="mt-0.5 h-0.5 w-3 rounded bg-slate-200" />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-[#2563EB] bg-[#002147] px-3 py-1">
        <div className="flex items-center justify-between">
          <div className="h-0.5 w-6 rounded bg-white/20" />
          <div className="h-0.5 w-4 rounded bg-white/20" />
        </div>
      </div>
    </div>
  );
}

/* ── Theme Preview Card (for Preview tab) ───────────────────────── */

export function WebsiteThemePreviewCard({
  templateKey,
  themeKey,
  isActive,
  content,
  onSelect,
}: {
  templateKey: WebsiteTemplateKey;
  themeKey: WebsiteThemeKey;
  isActive: boolean;
  content: WebsiteContent;
  onSelect: (template: WebsiteTemplateKey, theme: WebsiteThemeKey) => void;
}) {
  const theme = websiteThemes[themeKey];
  const isLight = true;

  return (
    <button
      type="button"
      onClick={() => onSelect(templateKey, themeKey)}
      className={`group relative overflow-hidden rounded-2xl border-2 text-left transition-all duration-200 ${
        isActive
          ? 'border-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.35)]'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-lg dark:border-[var(--border)] dark:hover:border-slate-600'
      }`}
    >
      <div className="relative overflow-hidden">
        <MiniNavbar isLight={isLight} theme={theme} />
        <MiniHero isLight={isLight} theme={theme} />
        <MiniCards isLight={isLight} theme={theme} />
        <MiniFooter isLight={isLight} />
      </div>

      <div className="border-t border-slate-100 bg-white px-3 py-2.5 dark:border-[var(--border)] dark:bg-[var(--card)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-[var(--foreground)]">
              {templateLabels[templateKey]}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-[var(--muted-foreground)]">
              {theme.name} Theme
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {isActive && (
              <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                <Check className="h-2.5 w-2.5" />
                Active
              </span>
            )}
            <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${
              isActive ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 text-slate-400'
            }`}>
              {isActive ? (
                <Check className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ── Template Card Selector (for Publish Controls) ──────────────── */

const templatePreviewMap: Record<WebsiteTemplateKey, React.FC> = {
  template1: TemplateOneMiniPreview,
  template2: TemplateTwoMiniPreview,
  template3: TemplateThreeMiniPreview,
  template4: TemplateFourMiniPreview,
  template5: TemplateFiveMiniPreview,
};

const templateDescriptions: Record<WebsiteTemplateKey, string> = {
  template1: 'Glassmorphism panels, spotlight hero, programs grid',
  template2: 'Dark theme, 3D carousel, tri-color accents',
  template3: 'Serif fonts, warm tones, editorial layout',
  template4: 'Color-coded sections, tab nav, events & map',
  template5: 'Navy & blue, mega menu, institutional layout',
};

export function TemplateCardSelector({
  activeTemplate,
  onSelect,
}: {
  activeTemplate: WebsiteTemplateKey;
  onSelect: (template: WebsiteTemplateKey) => void;
}) {
  const templates: WebsiteTemplateKey[] = ['template1', 'template2', 'template3', 'template4', 'template5'];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((templateKey) => {
        const isActive = activeTemplate === templateKey;
        const PreviewComponent = templatePreviewMap[templateKey];

        return (
          <button
            key={templateKey}
            type="button"
            onClick={() => onSelect(templateKey)}
            className={`group relative overflow-hidden rounded-2xl border-2 text-left transition-all duration-200 ${
              isActive
                ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.25)]'
                : 'border-slate-200 hover:border-slate-300 hover:shadow-md dark:border-[var(--border)] dark:hover:border-slate-600'
            }`}
          >
            <div className="relative overflow-hidden">
              <PreviewComponent />
            </div>

            <div className="border-t border-slate-100 bg-white px-3 py-2.5 dark:border-[var(--border)] dark:bg-[var(--card)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-[var(--foreground)]">
                    {templateLabels[templateKey]}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-slate-500 dark:text-[var(--muted-foreground)]">
                    {templateDescriptions[templateKey]}
                  </p>
                </div>
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                  isActive ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 text-slate-400 dark:border-[var(--border)]'
                }`}>
                  {isActive && <Check className="h-3.5 w-3.5" />}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ── Theme Selector (for Preview tab) ───────────────────────────── */

// Shared mini components for the theme selector grid (theme-aware previews)
function MiniNavbar({ isLight, theme }: { isLight: boolean; theme: any }) {
  return (
    <div className={`flex items-center justify-between rounded-t-lg px-3 py-1.5 text-[6px] font-semibold ${
      isLight ? 'bg-white/90 text-slate-700' : 'bg-white/5 text-slate-300'
    }`}>
      <div className="flex items-center gap-1">
        <div className={`h-2 w-2 rounded-sm ${isLight ? 'bg-slate-800' : 'bg-white/20'}`} />
        <span className="tracking-wider uppercase">Gurukul</span>
      </div>
      <div className="flex gap-2">
        <span>About</span>
        <span>Programs</span>
        <span>Contact</span>
      </div>
    </div>
  );
}

function MiniHero({ isLight, theme }: { isLight: boolean; theme: any }) {
  return (
    <div className={`px-3 py-3 ${
      isLight ? 'bg-[linear-gradient(180deg,#f0f9ff,#f8fbff)]' : 'bg-[radial-gradient(circle_at_top_left,#17335e,#0b1223)]'
    }`}>
      <div className={`inline-block rounded-full px-2 py-0.5 text-[5px] font-medium ${
        isLight ? 'bg-sky-100 text-sky-800' : 'bg-cyan-300/10 text-cyan-200'
      }`}>
        Admissions open 2026-27
      </div>
      <h3 className={`mt-1 text-[8px] font-bold leading-tight ${
        isLight ? 'text-slate-950' : 'text-white'
      }`}>
        A modern learning
      </h3>
      <p className={`mt-0.5 text-[6px] leading-relaxed ${
        isLight ? 'text-slate-500' : 'text-slate-400'
      }`}>
        destination with depth, energy, and ambition.
      </p>
      <div className="mt-2 flex gap-1">
        <div className={`rounded-full px-2 py-0.5 text-[5px] font-semibold ${theme.primaryButton}`} style={{boxShadow: 'none'}}>
          Explore
        </div>
        <div className={`rounded-full border px-2 py-0.5 text-[5px] font-semibold ${
          isLight ? 'border-slate-200 text-slate-700' : 'border-white/20 text-slate-300'
        }`}>
          Portal
        </div>
      </div>
    </div>
  );
}

function MiniCards({ isLight, theme }: { isLight: boolean; theme: any }) {
  return (
    <div className={`grid grid-cols-2 gap-1.5 px-3 py-2 ${
      isLight ? 'bg-[#f8fbff]' : 'bg-[#0b1223]'
    }`}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`rounded-md border p-1.5 ${
          isLight ? 'border-slate-200/80 bg-white/88' : 'border-white/10 bg-white/5'
        }`}>
          <div className={`h-3 w-3 rounded-sm ${theme.featureIcon}`} />
          <div className={`mt-1 h-1 w-8 rounded ${isLight ? 'bg-slate-800' : 'bg-white/20'}`} />
          <div className={`mt-0.5 h-0.5 w-6 rounded ${isLight ? 'bg-slate-300' : 'bg-white/10'}`} />
        </div>
      ))}
    </div>
  );
}

function MiniFooter({ isLight }: { isLight: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-b-lg px-3 py-1.5 ${
      isLight ? 'bg-slate-50' : 'bg-[#070b16]'
    }`}>
      <div className={`h-0.5 w-8 rounded ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />
      <div className={`h-0.5 w-6 rounded ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />
    </div>
  );
}

export function WebsiteThemeSelector({
  activeTemplate,
  activeTheme,
  content,
  onSelect,
}: {
  activeTemplate: WebsiteTemplateKey;
  activeTheme: WebsiteThemeKey;
  content: WebsiteContent;
  onSelect: (template: WebsiteTemplateKey, theme: WebsiteThemeKey) => void;
}) {
  const templates: WebsiteTemplateKey[] = ['template1', 'template2', 'template3', 'template4', 'template5'];
  const themes: WebsiteThemeKey[] = ['white', 'aurora', 'sunrise', 'emerald'];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-[var(--foreground)]">
          Template & Theme Preview
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-[var(--muted-foreground)]">
          Select a template and theme combination. Each card shows a live preview of how your public website will look.
        </p>
      </div>

      <div className="space-y-4">
        {templates.map((templateKey) => (
          <div key={templateKey} className="space-y-3">
            <h4 className="text-sm font-medium text-slate-700 dark:text-[var(--foreground)]">
              {templateLabels[templateKey]}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {themes.map((themeKey) => (
                <WebsiteThemePreviewCard
                  key={`${templateKey}-${themeKey}`}
                  templateKey={templateKey}
                  themeKey={themeKey}
                  isActive={activeTemplate === templateKey && activeTheme === themeKey}
                  content={content}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
