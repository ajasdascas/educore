"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  Database,
  Menu,
  MessageCircle,
  Play,
  ClipboardCheck,
  FileText,
  GraduationCap,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle/ThemeToggle";
import { DemoFormModal } from "@/components/landing/demo-form-modal";
import { Logo } from "@/components/landing/logo";
import { EyebrowLabel, LandingBadge, LandingButton, MarketingCard } from "@/components/landing/ui";
import { landingCopy, LandingLocale } from "@/lib/landing-copy";
import { cn } from "@/lib/utils";

type Copy = (typeof landingCopy)[LandingLocale];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

const moduleIcons = [Building2, BookOpen, BarChart3, MessageCircle];
const moduleColors = ["#2563EB", "#0EA5E9", "#8B5CF6", "#10B981"];
const benefitIcons = [Zap, Sparkles, Clock3];
const serviceIcons = [Users, GraduationCap, Calendar, CreditCard, FileText, MessageCircle, BarChart3, Database, HeartHandshake, ClipboardCheck, Sparkles, ShieldCheck];
const integrationItems = [
  ["Google Workspace", "G", "#4285F4"],
  ["Microsoft 365", "M", "#2563EB"],
  ["Zoom", "Z", "#2D8CFF"],
  ["Stripe", "S", "#635BFF"],
  ["WhatsApp Business", "W", "#25D366"],
  ["Khan Academy", "K", "#14BF96"],
  ["Canva for Education", "C", "#00C4CC"],
  ["Moodle", "M", "#F98012"],
] as const;

export function LandingPage() {
  const [locale, setLocale] = useState<LandingLocale>("es");
  const [demoOpen, setDemoOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  const copy = landingCopy[locale];
  const activeTheme = mounted && (theme === "blue" || theme === "light" || theme === "dark") ? theme : "blue";

  const openDemo = () => setDemoOpen(true);
  const toggleLocale = () => setLocale((current) => (current === "es" ? "en" : "es"));

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main id="main-content" data-landing-theme={activeTheme} className="landing-page min-h-screen overflow-hidden bg-[var(--landing-page-bg)] text-[var(--landing-ink)]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-lg focus:bg-[var(--landing-card)] focus:px-4 focus:py-2 focus:text-[var(--landing-primary-strong)]">
        Saltar al contenido
      </a>
      <Navbar copy={copy} locale={locale} onToggleLocale={toggleLocale} onOpenDemo={openDemo} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <Hero copy={copy} onOpenDemo={openDemo} />
      <TrustBar copy={copy} />
      <Benefits copy={copy} />
      <ServicesSuite copy={copy} />
      <Modules copy={copy} />
      <EducationLevels copy={copy} />
      <Comparison copy={copy} />
      <Integrations copy={copy} />
      <Testimonials copy={copy} />
      <FinalCTA copy={copy} onOpenDemo={openDemo} />
      <Footer copy={copy} />
      <DemoFormModal open={demoOpen} locale={locale} onClose={() => setDemoOpen(false)} />
    </main>
  );
}

function Navbar({
  copy,
  locale,
  onToggleLocale,
  onOpenDemo,
  mobileOpen,
  setMobileOpen,
}: {
  copy: Copy;
  locale: LandingLocale;
  onToggleLocale: () => void;
  onOpenDemo: () => void;
  mobileOpen: boolean;
  setMobileOpen: (value: boolean) => void;
}) {
  const links = [
    [copy.nav.platform, "#plataforma"],
    [copy.nav.modules, "#modulos"],
    [copy.nav.levels, "#niveles"],
    [copy.nav.pricing, "#comparativa"],
    [copy.nav.resources, "#recursos"],
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[#E2E8F0] bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[70px] max-w-[1200px] items-center justify-between gap-4 px-5 lg:px-12">
        <Logo size="sm" />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegación principal">
          {links.map(([label, href]) => (
            <a key={label} href={href} className="text-sm font-semibold text-[#1E293B] transition hover:text-[#2563EB]">
              {label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <button type="button" onClick={onToggleLocale} className="rounded-full px-2 py-1 text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9]" aria-label="Cambiar idioma">
            {locale.toUpperCase()} · {locale === "es" ? "EN" : "ES"}
          </button>
          <Link href="/login" className="rounded-[10px] px-3 py-2 text-sm font-bold text-[#1E293B] hover:bg-[#F1F5F9]">
            {copy.nav.login}
          </Link>
          <LandingButton size="sm" onClick={onOpenDemo}>
            {copy.nav.demo} <ChevronRight className="h-4 w-4" />
          </LandingButton>
        </div>
        <button className="shrink-0 rounded-lg p-2 text-[#0F172A] md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Abrir menú">
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {mobileOpen && (
        <div className="border-t border-[#E2E8F0] bg-white px-5 py-5 md:hidden">
          <div className="grid gap-3">
            {links.map(([label, href]) => (
              <a key={label} href={href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#1E293B] hover:bg-[#F1F5F9]">
                {label}
              </a>
            ))}
            <button type="button" onClick={onToggleLocale} className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9]">
              {locale.toUpperCase()} · {locale === "es" ? "EN" : "ES"}
            </button>
            <div className="px-3 py-1"><ThemeToggle /></div>
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#1E293B] hover:bg-[#F1F5F9]">{copy.nav.login}</Link>
            <LandingButton onClick={onOpenDemo}>{copy.nav.demo}</LandingButton>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero({ copy, onOpenDemo }: { copy: Copy; onOpenDemo: () => void }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="plataforma" className="relative bg-white">
      <div className="absolute inset-x-0 top-0 h-px bg-[#E2E8F0]" />
      <div className="absolute inset-0 opacity-[0.28] [background-image:linear-gradient(#CBD5E1_1px,transparent_1px),linear-gradient(90deg,#CBD5E1_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-5 pb-20 pt-16 md:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:pb-24 lg:pt-[72px]">
        <motion.div
          initial={shouldReduceMotion ? false : "hidden"}
          animate="visible"
          transition={shouldReduceMotion ? { duration: 0 } : { staggerChildren: 0.1 }}
        >
          <motion.div variants={fadeUp}><LandingBadge>{copy.hero.badge}</LandingBadge></motion.div>
          <motion.h1 variants={fadeUp} className="mt-7 max-w-2xl break-words font-display text-[36px] font-extrabold leading-[1.06] text-[#0F172A] sm:text-6xl lg:text-[64px]">
            {copy.hero.titleA}
            <br />
            <span className="bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] bg-clip-text text-transparent">{copy.hero.titleB}</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-6 max-w-[560px] break-words text-base leading-8 text-[#334155] sm:text-[19px]">
            {copy.hero.subtitle}
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LandingButton size="lg" onClick={onOpenDemo} className="w-full sm:w-auto">
              {copy.hero.demo} <ChevronRight className="h-4 w-4" />
            </LandingButton>
            <LandingButton size="lg" variant="secondary" className="w-full sm:w-auto">
              <Play className="h-4 w-4 fill-[#0F172A]" /> {copy.hero.video} (2 min)
            </LandingButton>
          </motion.div>
          <motion.p variants={fadeUp} className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-medium text-[#64748B]">
            {copy.hero.trust.split(" · ").map((item) => (
              <span key={item} className="flex min-w-0 items-center gap-1.5"><Check className="h-3.5 w-3.5 shrink-0 text-[#10B981]" />{item}</span>
            ))}
          </motion.p>
        </motion.div>
        <HeroIllustration />
      </div>
    </section>
  );
}

function HeroIllustration() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.55, delay: 0.15, ease: "easeOut" }}
      className="relative mx-auto w-full max-w-[520px] overflow-visible"
    >
      <div className="absolute right-2 top-2 z-20 rounded-lg bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.16)] sm:-right-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D1FAE5] text-[#10B981]"><Check className="h-5 w-5" /></div>
          <div>
            <p className="text-xs font-bold text-[#0F172A]">Calificaciones publicadas</p>
            <p className="text-[11px] text-[#64748B]">3°A · Matemáticas</p>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-5 left-0 z-20 rounded-lg bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2563EB] text-xs font-bold text-white">MR</div>
          <div>
            <p className="text-xs font-bold text-[#0F172A]">Profa. Mariana</p>
            <p className="text-[11px] text-[#64748B]">¿Podemos mover la junta?</p>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18),0_8px_24px_rgba(15,23,42,0.08)]">
        <div className="flex h-11 items-center gap-2 border-b border-[#E2E8F0] bg-[#F8FAFC] px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-[#F87171]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FBBF24]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#34D399]" />
          <span className="ml-3 font-mono text-[11px] text-[#64748B]">educore.app</span>
        </div>
        <div className="p-5">
          <p className="text-xs text-[#64748B]">Buenos días, Director Ramírez</p>
          <h3 className="mt-1 font-display text-2xl font-extrabold text-[#0F172A]">Resumen del día</h3>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              ["Alumnos activos", "1,284", "+24"],
              ["Asistencia", "94.2%", "+1.8%"],
              ["Pagos al día", "87%", "+3%"],
            ].map(([label, value, delta]) => (
              <div key={label} className="rounded-xl bg-[#F8FAFC] p-3">
                <p className="text-[10px] font-semibold text-[#64748B]">{label}</p>
                <p className="mt-1 font-display text-xl font-extrabold text-[#0F172A]">{value}</p>
                <p className="text-[10px] font-bold text-[#10B981]">{delta}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 h-28 rounded-lg bg-[#EFF6FF] p-3">
            <svg viewBox="0 0 360 86" className="h-full w-full" aria-hidden="true">
              <path d="M2 70 C55 62 78 55 126 50 C171 44 197 30 242 34 C288 38 316 35 358 22" fill="none" stroke="#2563EB" strokeWidth="3" />
              <path d="M2 70 C55 62 78 55 126 50 C171 44 197 30 242 34 C288 38 316 35 358 22 L358 86 L2 86 Z" fill="url(#chartFill)" />
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="#2563EB" stopOpacity=".24" />
                  <stop offset="1" stopColor="#2563EB" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="mt-4 space-y-2 text-xs text-[#334155]">
            {["Tareas pendientes (12)", "Reunión 4°B · 11:00 am", "5 mensajes nuevos"].map((task) => (
              <div key={task} className="flex items-center justify-between rounded-lg bg-white px-2 py-2">
                <span>{task}</span><ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TrustBar({ copy }: { copy: Copy }) {
  return (
    <section className="border-y border-[#E2E8F0] bg-[#F8FAFC] py-9">
      <div className="mx-auto max-w-[1200px] px-5 text-center lg:px-12">
        <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-[#64748B]">{copy.trust.label}</p>
        <div className="mt-7 grid grid-cols-2 gap-5 text-left text-sm font-bold text-[#94A3B8] sm:grid-cols-3 lg:grid-cols-6">
          {copy.trust.schools.map((school) => (
            <div key={school} className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />{school}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Benefits({ copy }: { copy: Copy }) {
  return (
    <section className="bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-[1200px] px-5 lg:px-12">
        <EyebrowLabel>{copy.benefits.eyebrow}</EyebrowLabel>
        <h2 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-tight text-[#0F172A] lg:text-[44px]">{copy.benefits.title}</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {copy.benefits.items.map((item, index) => {
            const Icon = benefitIcons[index];
            const color = ["#2563EB", "#0EA5E9", "#10B981"][index];
            return (
              <Reveal key={item.title} delay={index * 0.08}>
                <MarketingCard className="h-full border-t-4 p-7" style={{ borderTopColor: color }}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}14`, color }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 font-display text-xl font-extrabold text-[#0F172A]">{item.title}</h3>
                  <p className="mt-3 leading-7 text-[#334155]">{item.text}</p>
                  <p className="mt-5 font-mono text-sm font-bold" style={{ color }}>→ {item.stat}</p>
                </MarketingCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ServicesSuite({ copy }: { copy: Copy }) {
  return (
    <section className="bg-[#F8FAFC] py-16 lg:py-24">
      <div className="mx-auto max-w-[1200px] px-5 lg:px-12">
        <div className="grid gap-8 md:grid-cols-[0.95fr_1.05fr] md:items-end">
          <div>
            <EyebrowLabel>{copy.services.eyebrow}</EyebrowLabel>
            <h2 className="mt-4 font-display text-4xl font-extrabold leading-tight text-[#0F172A] lg:text-[44px]">{copy.services.title}</h2>
          </div>
          <p className="max-w-lg leading-7 text-[#334155] md:ml-auto">{copy.services.intro}</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {copy.services.items.map((item, index) => {
            const Icon = serviceIcons[index % serviceIcons.length];
            const comingSoon = item.status === "soon";
            return (
              <Reveal key={item.title} delay={index * 0.035}>
                <MarketingCard className="flex h-full gap-4 p-5">
                  <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", comingSoon ? "bg-[#F1F5F9] text-[#64748B]" : "bg-[#DBEAFE] text-[#2563EB]")}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-extrabold text-[#0F172A]">{item.title}</h3>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em]", comingSoon ? "bg-[#F1F5F9] text-[#64748B]" : "bg-[#D1FAE5] text-emerald-700")}>
                        {comingSoon ? copy.services.soon : copy.services.available}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#334155]">{item.text}</p>
                  </div>
                </MarketingCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Modules({ copy }: { copy: Copy }) {
  return (
    <section id="modulos" className="bg-[#F8FAFC] py-16 lg:py-24">
      <div className="mx-auto max-w-[1200px] px-5 lg:px-12">
        <div className="grid gap-8 md:grid-cols-2 md:items-end">
          <div>
            <EyebrowLabel>{copy.modules.eyebrow}</EyebrowLabel>
            <h2 className="mt-4 font-display text-4xl font-extrabold leading-tight text-[#0F172A] lg:text-[44px]">{copy.modules.title}</h2>
          </div>
          <p className="max-w-md leading-7 text-[#334155] md:ml-auto">{copy.modules.intro}</p>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {copy.modules.items.map((item, index) => {
            const Icon = moduleIcons[index];
            const color = moduleColors[index];
            return (
              <Reveal key={item.title} delay={index * 0.08}>
                <MarketingCard className="h-full p-8">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-white shadow-lg" style={{ background: color }}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">Módulo</p>
                      <h3 className="font-display text-2xl font-extrabold text-[#0F172A]">{item.title}</h3>
                    </div>
                  </div>
                  <p className="mt-5 leading-7 text-[#334155]">{item.text}</p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {item.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-sm font-medium text-[#1E293B]">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: `${color}16`, color }}>
                          <Check className="h-3 w-3" />
                        </span>
                        {feature}
                      </div>
                    ))}
                  </div>
                </MarketingCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function EducationLevels({ copy }: { copy: Copy }) {
  return (
    <section id="niveles" className="bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-[1200px] px-5 lg:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <EyebrowLabel>{copy.levels.eyebrow}</EyebrowLabel>
          <h2 className="mt-4 font-display text-4xl font-extrabold text-[#0F172A] lg:text-[44px]">{copy.levels.title}</h2>
          <p className="mt-4 text-lg leading-8 text-[#334155]">{copy.levels.intro}</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {copy.levels.items.map(([label, icon, status], index) => {
            const active = status === "active";
            return (
              <Reveal key={label} delay={index * 0.04}>
                <div className={cn("rounded-lg border p-5 transition hover:-translate-y-0.5", active ? "border-[#BFDBFE] bg-[#EFF6FF]" : "border-[#E2E8F0] bg-[#F8FAFC]")}>
                  <div className="text-3xl" aria-hidden="true">{icon}</div>
                  <h3 className="mt-4 font-display text-lg font-extrabold text-[#0F172A]">{label}</h3>
                  <p className={cn("mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold", active ? "bg-[#D1FAE5] text-emerald-700" : "bg-white text-[#64748B]")}>
                    {active ? copy.levels.active : copy.levels.upcoming}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Comparison({ copy }: { copy: Copy }) {
  return (
    <section id="comparativa" className="bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-[1200px] px-5 lg:px-12">
        <div className="text-center">
          <EyebrowLabel>{copy.comparison.eyebrow}</EyebrowLabel>
          <h2 className="mt-4 font-display text-4xl font-extrabold text-[#0F172A] lg:text-[44px]">{copy.comparison.title}</h2>
        </div>
        <div className="mt-12 overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white shadow-sm">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] text-left">
                {copy.comparison.headers.map((header, index) => (
                  <th key={header} className={cn("px-6 py-5 font-display text-sm font-extrabold", index === 1 ? "bg-[#2563EB] text-center text-white" : "text-[#334155]")}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {copy.comparison.rows.map((row) => (
                <tr key={String(row[0])} className="border-t border-[#F1F5F9]">
                  <td className="px-6 py-4 font-bold text-[#0F172A]">{row[0]}</td>
                  {row.slice(1).map((value, index) => (
                    <td key={`${row[0]}-${index}`} className={cn("px-6 py-4 text-center", index === 0 && "bg-[#EFF6FF]")}>
                      <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full", value ? "bg-[#D1FAE5] text-[#10B981]" : "bg-[#F1F5F9] text-[#94A3B8]", index === 0 && value && "bg-[#2563EB] text-white")}>
                        {value ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Integrations({ copy }: { copy: Copy }) {
  return (
    <section id="recursos" className="bg-[#F8FAFC] py-16 lg:py-24">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:px-12">
        <div>
          <EyebrowLabel>{copy.integrations.eyebrow}</EyebrowLabel>
          <h2 className="mt-4 max-w-md font-display text-4xl font-extrabold text-[#0F172A] lg:text-[44px]">{copy.integrations.title}</h2>
          <p className="mt-5 max-w-md leading-7 text-[#334155]">{copy.integrations.text}</p>
          <div className="mt-7 flex flex-wrap gap-7">
            {copy.integrations.stats.map((stat) => {
              const [big, ...rest] = stat.split(" ");
              return (
                <div key={stat}>
                  <p className="font-display text-2xl font-extrabold text-[#0F172A]">{big}</p>
                  <p className="text-xs text-[#64748B]">{rest.join(" ")}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {integrationItems.map(([name, initial, color]) => (
            <MarketingCard key={name} className="flex min-h-[126px] flex-col items-center justify-center p-4 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-extrabold text-white" style={{ backgroundColor: color }}>{initial}</div>
              <p className="mt-3 text-[11.5px] font-extrabold leading-tight text-[#0F172A]">{name}</p>
            </MarketingCard>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials({ copy }: { copy: Copy }) {
  return (
    <section className="bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-[1200px] px-5 lg:px-12">
        <div className="text-center">
          <EyebrowLabel>{copy.testimonials.eyebrow}</EyebrowLabel>
          <h2 className="mx-auto mt-4 max-w-4xl font-display text-4xl font-extrabold text-[#0F172A] lg:text-[44px]">{copy.testimonials.title}</h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {copy.testimonials.items.map(([name, role, quote], index) => (
            <MarketingCard key={name} className="bg-[#F8FAFC] p-7">
              <p className="font-display text-3xl font-extrabold text-[#2563EB]">&ldquo;</p>
              <p className="mt-2 min-h-[112px] leading-7 text-[#0F172A]">{quote}</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-extrabold text-white" style={{ backgroundColor: moduleColors[index] }}>{initials(name)}</div>
                <div>
                  <p className="text-sm font-extrabold text-[#0F172A]">{name}</p>
                  <p className="text-xs text-[#64748B]">{role}</p>
                </div>
              </div>
            </MarketingCard>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ copy, onOpenDemo }: { copy: Copy; onOpenDemo: () => void }) {
  return (
    <section className="bg-white px-5 pb-16 lg:pb-24">
      <div className="relative mx-auto grid max-w-[1080px] overflow-hidden rounded-lg bg-[#0F172A] p-8 shadow-[0_30px_80px_rgba(15,23,42,0.18)] md:grid-cols-[1.25fr_0.75fr] md:p-14">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-[#1D4ED8]/30" />
        <div className="relative">
          <EyebrowLabel className="text-[#7DD3FC]">{copy.cta.eyebrow}</EyebrowLabel>
          <h2 className="mt-4 max-w-xl font-display text-4xl font-extrabold leading-tight text-white lg:text-[44px]">{copy.cta.title}</h2>
          <p className="mt-4 max-w-md leading-7 text-white/75">{copy.cta.text}</p>
        </div>
        <div className="relative mt-8 grid content-center gap-3 md:mt-0">
          <LandingButton variant="white" onClick={onOpenDemo}>{copy.cta.demo} <ChevronRight className="h-4 w-4" /></LandingButton>
          <LandingButton variant="outline">{copy.cta.sales}</LandingButton>
          <p className="text-center text-xs text-white/70">{copy.cta.caption}</p>
        </div>
      </div>
    </section>
  );
}

function Footer({ copy }: { copy: Copy }) {
  const columns = [
    ["Plataforma", copy.footer.platform],
    ["Soluciones", copy.footer.solutions],
    ["Recursos", copy.footer.resources],
    ["Compañía", copy.footer.company],
  ];
  return (
    <footer className="bg-[#0F172A] px-5 py-16 text-white lg:px-12">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Logo variant="dark" size="sm" />
            <p className="mt-6 max-w-xs leading-7 text-white/60">{copy.footer.tagline}</p>
            <div className="mt-6 flex gap-2">
              {["X", "in", "IG", "YT"].map((item) => (
                <a key={item} href="#" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-xs font-bold text-white/70 hover:bg-white/10" aria-label={item}>{item}</a>
              ))}
            </div>
          </div>
          {columns.map(([title, items]) => (
            <div key={String(title)}>
              <h3 className="font-display text-sm font-extrabold uppercase tracking-[0.08em] text-white">{title}</h3>
              <ul className="mt-5 space-y-3">
                {(items as readonly string[]).map((item) => (
                  <li key={item}><a href="#" className="text-sm text-white/60 hover:text-white">{item}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-8 text-xs text-white/50 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Educore. Todos los derechos reservados.</p>
          <div className="flex flex-wrap gap-5">
            {["Privacidad", "Términos", "Seguridad", "ES · EN"].map((item) => <a key={item} href="#" className="hover:text-white">{item}</a>)}
          </div>
        </div>
      </div>
    </footer>
  );
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div>{children}</div>;
  }

  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} transition={{ duration: 0.4, delay, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
