"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  motion, AnimatePresence, useReducedMotion,
  useMotionValue, useTransform, animate as motionAnimate,
  useInView,
} from "framer-motion";
import {
  BookOpen, Menu, X, ArrowRight, CheckCircle2, Users, GraduationCap,
  BarChart3, MessageSquare, Bell, CreditCard, Shield, Smartphone,
  FileText, Calendar, TrendingUp, Star, Play, ChevronRight,
  Building2, Globe, Zap, Award, Mail, Phone, Twitter, Linkedin,
  Instagram, Facebook, Youtube, ChevronDown,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle/ThemeToggle";

/* ─── Motion helpers ─────────────────────────────────────────────────────── */

// Respeta prefers-reduced-motion en toda la app
function useMotionSafe() {
  const rm = useReducedMotion();
  return (v: object) => (rm ? {} : v);
}

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const fadeIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
};

const stagger = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const staggerItem = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0, 0, 0.2, 1] as const } },
};

/* ─── Data ──────────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: "Soluciones", href: "#soluciones" },
  { label: "Beneficios", href: "#beneficios" },
  { label: "Testimonios", href: "#testimonios" },
  { label: "Blog", href: "#blog" },
  { label: "Contacto", href: "#contacto" },
];

const SOLUTIONS = [
  { icon: GraduationCap, title: "Gestión de Cursos",    desc: "Crea, organiza y administra materias, unidades y recursos didácticos desde un solo lugar.", color: "blue" },
  { icon: Users,         title: "Aula Virtual",         desc: "Espacio colaborativo para clases en vivo, tareas, foros y retroalimentación en tiempo real.", color: "indigo" },
  { icon: CreditCard,    title: "Pagos y Cobranza",     desc: "Gestiona inscripciones, colegiaturas y pagos con seguimiento automático de adeudos.", color: "green" },
  { icon: BarChart3,     title: "Reportes y Analytics", desc: "Dashboards con KPIs académicos, asistencia, calificaciones y métricas financieras.", color: "purple" },
  { icon: MessageSquare, title: "Comunicaciones",       desc: "Mensajería interna, comunicados grupales y canal directo entre escuela, docentes y padres.", color: "cyan" },
  { icon: Bell,          title: "Notificaciones",       desc: "Alertas automáticas por email y push para eventos, adeudos, calificaciones y avisos.", color: "yellow" },
  { icon: Shield,        title: "Control de Acceso",    desc: "Roles granulares: Super Admin, Director, Docente, Alumno y Padre con permisos precisos.", color: "red" },
  { icon: Calendar,      title: "Horarios y Asistencia",desc: "Generación de horarios, registro diario de asistencia y detección de ausencias.", color: "teal" },
  { icon: FileText,      title: "Boletas y Expedientes",desc: "Generación automática de boletas de calificaciones y expediente digital del alumno.", color: "orange" },
];

const SOL_COLORS: Record<string, { bg: string; icon: string; border: string }> = {
  blue:   { bg: "bg-blue-500/10",   icon: "text-blue-400",   border: "border-blue-500/20" },
  indigo: { bg: "bg-indigo-500/10", icon: "text-indigo-400", border: "border-indigo-500/20" },
  green:  { bg: "bg-emerald-500/10",icon: "text-emerald-400",border: "border-emerald-500/20" },
  purple: { bg: "bg-purple-500/10", icon: "text-purple-400", border: "border-purple-500/20" },
  cyan:   { bg: "bg-cyan-500/10",   icon: "text-cyan-400",   border: "border-cyan-500/20" },
  yellow: { bg: "bg-amber-500/10",  icon: "text-amber-400",  border: "border-amber-500/20" },
  red:    { bg: "bg-rose-500/10",   icon: "text-rose-400",   border: "border-rose-500/20" },
  teal:   { bg: "bg-teal-500/10",   icon: "text-teal-400",   border: "border-teal-500/20" },
  orange: { bg: "bg-orange-500/10", icon: "text-orange-400", border: "border-orange-500/20" },
};

const DIFFERENTIATORS = [
  { icon: Zap,        title: "Centralización total",            desc: "Un solo sistema para toda la operación escolar. Sin duplicidad de datos, sin integraciones complicadas.", points: ["Base de datos unificada", "Acceso desde cualquier dispositivo", "Sincronización en tiempo real"] },
  { icon: TrendingUp, title: "Decisiones basadas en datos",     desc: "Dashboards ejecutivos con métricas académicas y financieras para que directivos tomen decisiones informadas.", points: ["KPIs en tiempo real", "Reportes exportables", "Alertas de riesgo académico"] },
  { icon: Smartphone, title: "Experiencia móvil nativa",        desc: "Padres, docentes y alumnos acceden desde cualquier dispositivo con una experiencia óptima.", points: ["Portal responsive", "Notificaciones push", "Sin instalación adicional"] },
];

const STATS = [
  { value: 500,  suffix: "+", label: "Instituciones activas" },
  { value: 98,   suffix: "%", label: "Satisfacción de clientes" },
  { value: 12,   suffix: " años", label: "Experiencia en EdTech" },
  { value: 24,   suffix: "/7", label: "Soporte técnico" },
];

const TESTIMONIALS = [
  { name: "Lic. María Fernández", role: "Directora General",    school: "Colegio Montserrat",    quote: "EduCore transformó por completo la gestión de nuestra institución. Los procesos administrativos se redujeron a la mitad y los padres ahora tienen visibilidad total.", stars: 5 },
  { name: "Prof. Carlos Méndez",  role: "Coordinador Académico",school: "Instituto San Ignacio", quote: "La facilidad para registrar asistencias, calificaciones y comunicarse con padres desde una sola plataforma ha mejorado enormemente nuestra productividad.", stars: 5 },
  { name: "Ing. Patricia López",  role: "Administradora",       school: "Escuela Primaria Juárez",quote: "La gestión de cobranza era nuestro mayor dolor de cabeza. Con EduCore automatizamos todo y ahora tenemos visibilidad completa de los ingresos en tiempo real.", stars: 5 },
];

const BLOG_POSTS = [
  { title: "Cómo la automatización escolar reduce el trabajo administrativo en un 60%", excerpt: "Descubre cómo las instituciones líderes están usando tecnología para liberar tiempo valioso que antes se perdía en tareas manuales.", date: "2 May 2026", category: "Gestión Escolar", readTime: "5 min" },
  { title: "Guía completa: comunicación efectiva entre escuela y padres de familia", excerpt: "Los canales digitales modernos y cómo usarlos para mantener a las familias informadas y comprometidas con el proceso educativo.", date: "28 Abr 2026", category: "Comunicación", readTime: "7 min" },
  { title: "Métricas que todo director escolar debe monitorear en 2026", excerpt: "Los KPIs académicos y financieros esenciales para tomar decisiones estratégicas y mejorar los resultados de tu institución.", date: "22 Abr 2026", category: "Analytics", readTime: "4 min" },
];

const FAQS = [
  { q: "¿Cuánto tiempo toma implementar EduCore?", a: "La implementación estándar toma entre 2 y 4 semanas, incluyendo migración de datos, configuración y capacitación del personal." },
  { q: "¿Puedo importar los datos de mi sistema actual?", a: "Sí. Contamos con herramientas de migración para los principales sistemas del mercado y asistencia personalizada para casos especiales." },
  { q: "¿Cómo se maneja la seguridad de los datos?", a: "Los datos se almacenan con cifrado en reposo y en tránsito, con backups automáticos diarios y cumplimiento de las mejores prácticas de privacidad." },
  { q: "¿El sistema es accesible desde dispositivos móviles?", a: "EduCore es completamente responsive. Padres, docentes y alumnos pueden acceder desde cualquier smartphone, tablet o computadora sin instalar nada." },
  { q: "¿Ofrecen soporte después de la implementación?", a: "Contamos con soporte técnico 24/7 vía chat, email y teléfono, además de capacitación continua y actualizaciones sin costo adicional." },
];

const FOOTER_LINKS = {
  Plataforma: ["Soluciones", "Funcionalidades", "Precios", "Integraciones", "Seguridad"],
  Empresa:    ["Nosotros", "Blog", "Casos de éxito", "Prensa", "Empleos"],
  Soporte:    ["Centro de ayuda", "Documentación", "Estado del sistema", "Contacto"],
  Legal:      ["Privacidad", "Términos de uso", "Cookies"],
};

/* ─── Animated counter ──────────────────────────────────────────────────── */
function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const count  = useMotionValue(0);
  const rounded = useTransform(count, Math.round);
  const ref    = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!inView) return;
    const controls = motionAnimate(count, value, { duration: 1.2, ease: "easeOut" });
    return controls.stop;
  }, [inView, value, count]);

  return <span ref={ref}><motion.span>{rounded}</motion.span>{suffix}</span>;
}

/* ─── Animated section wrapper ──────────────────────────────────────────── */
function AnimSection({ children, className = "", delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  const rm  = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={rm ? false : "hidden"}
      animate={inView ? "visible" : "hidden"}
      variants={fadeUp}
      transition={{ duration: 0.5, delay, ease: [0, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Solutions stagger grid ─────────────────────────────────────────────── */
function SolutionsGrid({ rm }: { rm: boolean | null }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      variants={stagger}
      initial={rm ? false : "hidden"}
      animate={inView ? "visible" : "hidden"}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {SOLUTIONS.map((s) => {
        const c = SOL_COLORS[s.color];
        const Icon = s.icon;
        return (
          <motion.div
            key={s.title}
            variants={staggerItem}
            whileHover={rm ? {} : { y: -4, boxShadow: "0 20px 40px -12px rgba(0,0,0,.4)" }}
            transition={{ duration: 0.2 }}
            className={`group p-6 rounded-2xl bg-slate-800/40 border ${c.border} cursor-default`}
          >
            <motion.div
              whileHover={rm ? {} : { scale: 1.12, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center mb-4`}
            >
              <Icon className={`w-5 h-5 ${c.icon}`} />
            </motion.div>
            <h3 className="font-semibold text-white mb-2">{s.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [menuOpen, setMenuOpen]     = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const [videoModal, setVideoModal] = useState(false);
  const [activeFaq, setActiveFaq]   = useState<number | null>(null);
  const rm = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest("header")) setMenuOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  const scrollTo = (id: string) => {
    document.getElementById(id.replace("#", ""))?.scrollIntoView({ behavior: rm ? "auto" : "smooth" });
    setMenuOpen(false);
  };

  return (
    <div className="claude-landing min-h-screen bg-slate-950 text-slate-100 antialiased overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <motion.header
        initial={rm ? false : { y: -64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
        className={`landing-nav fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? "landing-nav--scrolled bg-slate-950/95 backdrop-blur-md shadow-lg shadow-black/20 border-b border-slate-800/60" : "landing-nav--top bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <motion.div
              whileHover={rm ? {} : { scale: 1.08, rotate: -3 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md"
            >
              <BookOpen className="w-4 h-4 text-white" />
            </motion.div>
            <span className="landing-brand-text text-lg font-bold text-white tracking-tight">EduCore</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6" aria-label="Navegación principal">
            {NAV_LINKS.map((l, i) => (
              <motion.button
                key={l.label}
                initial={rm ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.07, duration: 0.3 }}
                onClick={() => scrollTo(l.href)}
                className="landing-nav-link text-sm text-slate-400 hover:text-white transition-colors focus:outline-none focus-visible:underline"
              >
                {l.label}
              </motion.button>
            ))}
          </nav>

          <motion.div
            initial={rm ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="hidden md:flex items-center gap-3"
          >
            <ThemeToggle />
            <Link href="/login" className="landing-nav-link text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800">
              Iniciar sesión
            </Link>
            <motion.button
              whileHover={rm ? {} : { scale: 1.03 }}
              whileTap={rm ? {} : { scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              onClick={() => scrollTo("#contacto")}
              className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition-colors shadow-md shadow-blue-900/30"
            >
              Solicitar demo
            </motion.button>
          </motion.div>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            <AnimatePresence mode="wait" initial={false}>
              {menuOpen ? (
                <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <X className="w-5 h-5" />
                </motion.span>
              ) : (
                <motion.span key="m" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Menu className="w-5 h-5" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              key="mobile-menu"
              initial={rm ? { opacity: 1 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={rm ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
              className="landing-mobile-menu md:hidden bg-slate-900/98 backdrop-blur-xl border-t border-slate-800 overflow-hidden"
            >
              <div className="px-4 py-4 space-y-1">
                {NAV_LINKS.map((l) => (
                  <button key={l.label} onClick={() => scrollTo(l.href)} className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                    {l.label}
                  </button>
                ))}
                <div className="pt-2 flex flex-col gap-2">
                  <div className="px-3 py-1">
                    <ThemeToggle />
                  </div>
                  <Link href="/login" className="px-3 py-2.5 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
                    Iniciar sesión
                  </Link>
                  <button onClick={() => scrollTo("#contacto")} className="px-3 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-center">
                    Solicitar demo
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background particles */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900" />
          <motion.div
            animate={rm ? {} : { scale: [1, 1.15, 1], opacity: [0.08, 0.14, 0.08] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600 rounded-full blur-3xl"
          />
          <motion.div
            animate={rm ? {} : { scale: [1.1, 1, 1.1], opacity: [0.06, 0.12, 0.06] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600 rounded-full blur-3xl"
          />
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          {/* Badge */}
          <motion.div
            initial={rm ? false : { opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-semibold tracking-wider uppercase mb-8"
          >
            <motion.span animate={rm ? {} : { scale: [1, 1.5, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Plataforma de gestión escolar integral
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={rm ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0, 0, 0.2, 1] }}
            className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white leading-[1.08] tracking-tight mb-6 max-w-5xl mx-auto"
          >
            Administra tu institución{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              con inteligencia
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={rm ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22, ease: [0, 0, 0.2, 1] }}
            className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            EduCore centraliza la gestión académica, administrativa y financiera de tu escuela en una plataforma moderna, segura y fácil de usar.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={rm ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.34 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <motion.button
              whileHover={rm ? {} : { scale: 1.04, y: -2 }}
              whileTap={rm ? {} : { scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              onClick={() => scrollTo("#contacto")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xl shadow-blue-900/40 transition-colors"
            >
              Solicitar demo gratuita
              <motion.span animate={rm ? {} : { x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            </motion.button>
            <motion.button
              whileHover={rm ? {} : { scale: 1.03 }}
              whileTap={rm ? {} : { scale: 0.97 }}
              onClick={() => scrollTo("#soluciones")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white font-medium transition-all hover:bg-slate-800/50"
            >
              Ver soluciones <ChevronRight className="w-4 h-4" />
            </motion.button>
          </motion.div>

          {/* Stats mini */}
          <motion.div
            initial={rm ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.6 }}
            className="mt-14 flex flex-wrap justify-center gap-8"
          >
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold text-white">
                  <AnimatedCounter value={s.value} suffix={s.suffix} />
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Scroll cue */}
          <motion.div
            initial={rm ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-slate-600"
          >
            <span className="text-[10px] uppercase tracking-widest">Explorar</span>
            <motion.div animate={rm ? {} : { y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Solutions ──────────────────────────────────────────────────── */}
      <section id="soluciones" className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimSection className="text-center mb-16">
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-widest mb-3">Nuestras soluciones</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Todo lo que tu escuela necesita</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Cada módulo fue diseñado pensando en las necesidades reales de directivos, docentes, alumnos y padres de familia.</p>
          </AnimSection>

          {/* Staggered cards */}
          <SolutionsGrid rm={rm} />

          <AnimSection className="text-center mt-10" delay={0.2}>
            <button onClick={() => scrollTo("#contacto")} className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors group">
              Ver todas las funcionalidades
              <motion.span animate={rm ? {} : { x: [0, 3, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            </button>
          </AnimSection>
        </div>
      </section>

      {/* ── Differentiators ────────────────────────────────────────────── */}
      <section id="beneficios" className="py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimSection className="text-center mb-16">
            <p className="text-xs text-indigo-400 font-semibold uppercase tracking-widest mb-3">Por qué EduCore</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Diseñado para la excelencia institucional</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Más que un software, un aliado estratégico que crece con tu institución.</p>
          </AnimSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {DIFFERENTIATORS.map((d, i) => {
              const Icon = d.icon;
              return (
                <AnimSection key={d.title} delay={i * 0.12}>
                  <motion.div
                    whileHover={rm ? {} : { y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="h-full p-8 rounded-2xl bg-gradient-to-b from-slate-800/60 to-slate-800/20 border border-slate-700/50"
                  >
                    <motion.div
                      whileHover={rm ? {} : { rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}
                      className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5"
                    >
                      <Icon className="w-6 h-6 text-blue-400" />
                    </motion.div>
                    <h3 className="text-lg font-bold text-white mb-3">{d.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed mb-5">{d.desc}</p>
                    <ul className="space-y-2">
                      {d.points.map((p, pi) => (
                        <motion.li
                          key={p}
                          initial={rm ? false : { opacity: 0, x: -8 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.12 + pi * 0.08 }}
                          className="flex items-center gap-2 text-sm text-slate-300"
                        >
                          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                          {p}
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                </AnimSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Social Proof ───────────────────────────────────────────────── */}
      <section id="testimonios" className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Animated stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {STATS.map((s, i) => (
              <AnimSection key={s.label} delay={i * 0.1}>
                <div className="text-center p-6 rounded-2xl bg-slate-800/40 border border-slate-700/40">
                  <p className="text-3xl lg:text-4xl font-extrabold text-white mb-1">
                    <AnimatedCounter value={s.value} suffix={s.suffix} />
                  </p>
                  <p className="text-sm text-slate-400">{s.label}</p>
                </div>
              </AnimSection>
            ))}
          </div>

          <AnimSection className="text-center mb-12">
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-widest mb-3">Testimonios</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Lo que dicen nuestros clientes</h2>
          </AnimSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <AnimSection key={t.name} delay={i * 0.12}>
                <motion.div
                  whileHover={rm ? {} : { y: -4 }}
                  className="h-full p-6 rounded-2xl bg-slate-800/40 border border-slate-700/40"
                >
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.stars }).map((_, si) => (
                      <motion.div
                        key={si}
                        initial={rm ? false : { opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.12 + si * 0.06, type: "spring", stiffness: 400 }}
                      >
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      </motion.div>
                    ))}
                  </div>
                  <blockquote className="text-sm text-slate-300 leading-relaxed mb-5 italic">&ldquo;{t.quote}&rdquo;</blockquote>
                  <div>
                    <p className="font-semibold text-white text-sm">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role} · {t.school}</p>
                  </div>
                </motion.div>
              </AnimSection>
            ))}
          </div>

          {/* Trusted by */}
          <AnimSection className="mt-16 text-center" delay={0.1}>
            <p className="text-xs text-slate-600 uppercase tracking-widest mb-6">Confiado por instituciones de toda la república</p>
            <div className="flex flex-wrap justify-center gap-3">
              {["Colegio Montserrat", "Instituto San Ignacio", "Esc. Primaria Juárez", "Colegio Bolívar", "Centro Educativo Norte", "Prep. Oriente"].map((name, i) => (
                <motion.div
                  key={name}
                  initial={rm ? false : { opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  whileHover={rm ? {} : { scale: 1.05, borderColor: "rgba(148,163,184,0.3)" }}
                  className="px-4 py-2 rounded-lg bg-slate-800/40 border border-slate-700/30 text-xs text-slate-500 font-medium cursor-default"
                >
                  {name}
                </motion.div>
              ))}
            </div>
          </AnimSection>
        </div>
      </section>

      {/* ── Video Block ─────────────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <AnimSection>
              <p className="text-xs text-blue-400 font-semibold uppercase tracking-widest mb-3">Transformación digital</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5 leading-tight">La transformación educativa comienza hoy</h2>
              <p className="text-slate-400 leading-relaxed mb-6">Miles de directores ya dejaron atrás las hojas de cálculo y los procesos manuales. Con EduCore, tu equipo gana tiempo para lo que realmente importa.</p>
              <ul className="space-y-3 mb-8">
                {["Implementación en 2–4 semanas", "Migración de datos incluida", "Capacitación y soporte continuo", "Actualizaciones sin costo adicional"].map((p, i) => (
                  <motion.li
                    key={p}
                    initial={rm ? false : { opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.35 }}
                    className="flex items-center gap-2.5 text-sm text-slate-300"
                  >
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    {p}
                  </motion.li>
                ))}
              </ul>
              <motion.button
                whileHover={rm ? {} : { scale: 1.03, y: -2 }}
                whileTap={rm ? {} : { scale: 0.97 }}
                onClick={() => scrollTo("#contacto")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-blue-900/30"
              >
                Agenda una llamada <ArrowRight className="w-4 h-4" />
              </motion.button>
            </AnimSection>

            {/* Video placeholder with ripple animation */}
            <AnimSection delay={0.15}>
              <motion.div
                whileHover={rm ? {} : { scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="relative rounded-2xl overflow-hidden bg-slate-800/50 border border-slate-700/50 aspect-video flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 to-indigo-900/20" />
                {/* Ripple rings */}
                {!rm && [0, 0.6, 1.2].map((delay) => (
                  <motion.div
                    key={delay}
                    animate={{ scale: [1, 2.2], opacity: [0.3, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, delay, ease: "easeOut" }}
                    className="absolute w-16 h-16 rounded-full border border-white/20"
                  />
                ))}
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <motion.button
                    whileHover={rm ? {} : { scale: 1.12 }}
                    whileTap={rm ? {} : { scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 350, damping: 20 }}
                    onClick={() => setVideoModal(true)}
                    aria-label="Reproducir video de EduCore"
                    className="w-16 h-16 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors shadow-xl"
                  >
                    <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                  </motion.button>
                  <p className="text-white/70 text-sm font-medium">Ver cómo funciona EduCore</p>
                </div>
                <div className="absolute inset-0 opacity-25 pointer-events-none">
                  <div className="absolute top-6 left-6 w-32 h-32 rounded-xl bg-blue-500/30 blur-xl" />
                  <div className="absolute bottom-6 right-6 w-32 h-32 rounded-xl bg-indigo-500/30 blur-xl" />
                </div>
              </motion.div>
            </AnimSection>
          </div>
        </div>
      </section>

      {/* ── Blog ───────────────────────────────────────────────────────── */}
      <section id="blog" className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimSection className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <p className="text-xs text-blue-400 font-semibold uppercase tracking-widest mb-3">Recursos</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">Noticias y artículos</h2>
            </div>
            <a href="#blog" className="text-sm text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 shrink-0">Ver todos <ArrowRight className="w-4 h-4" /></a>
          </AnimSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BLOG_POSTS.map((post, i) => (
              <AnimSection key={post.title} delay={i * 0.12}>
                <motion.article
                  whileHover={rm ? {} : { y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="h-full flex flex-col rounded-2xl overflow-hidden bg-slate-800/40 border border-slate-700/40 hover:border-slate-600/60 transition-colors cursor-pointer"
                >
                  <div className="h-44 bg-gradient-to-br from-blue-900/40 via-indigo-900/30 to-slate-800 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="w-12 h-12 text-slate-600" />
                    </div>
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-semibold uppercase tracking-wider">
                        {post.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col flex-1 p-5">
                    <h3 className="font-semibold text-white text-sm leading-snug mb-2 group-hover:text-blue-300 line-clamp-2">{post.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed flex-1 line-clamp-3">{post.excerpt}</p>
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-700/40">
                      <span className="text-xs text-slate-600">{post.date}</span>
                      <span className="text-slate-700">·</span>
                      <span className="text-xs text-slate-600">{post.readTime} de lectura</span>
                    </div>
                  </div>
                </motion.article>
              </AnimSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-slate-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimSection className="text-center mb-12">
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-widest mb-3">Preguntas frecuentes</p>
            <h2 className="text-3xl font-bold text-white">Resolvemos tus dudas</h2>
          </AnimSection>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <AnimSection key={i} delay={i * 0.06}>
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                  <motion.button
                    onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left bg-slate-800/40 hover:bg-slate-800/70 transition-colors"
                    aria-expanded={activeFaq === i}
                  >
                    <span className="text-sm font-medium text-white">{faq.q}</span>
                    <motion.span
                      animate={{ rotate: activeFaq === i ? 180 : 0 }}
                      transition={{ duration: 0.25 }}
                      className="shrink-0"
                    >
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </motion.span>
                  </motion.button>
                  <AnimatePresence initial={false}>
                    {activeFaq === i && (
                      <motion.div
                        key="answer"
                        initial={rm ? { opacity: 1 } : { height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={rm ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
                        className="overflow-hidden bg-slate-800/20"
                      >
                        <p className="px-5 pb-5 pt-3 text-sm text-slate-400 leading-relaxed">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </AnimSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ──────────────────────────────────────────────────── */}
      <section id="contacto" className="py-24 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
            <AnimSection>
              <p className="text-xs text-blue-400 font-semibold uppercase tracking-widest mb-3">Contáctanos</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">¿Listo para transformar tu institución?</h2>
              <p className="text-slate-400 leading-relaxed mb-8">Agenda una demostración personalizada sin compromiso. Nuestro equipo analizará las necesidades de tu escuela y te mostrará cómo EduCore puede ayudarte.</p>
              <div className="space-y-4">
                {[{ icon: Globe, label: "Cobertura nacional en México" }, { icon: Award, label: "Implementación garantizada" }, { icon: Shield, label: "Datos seguros y privados" }, { icon: Users, label: "Soporte humano dedicado" }].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={rm ? false : { opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                    className="flex items-center gap-3 text-sm text-slate-300"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-blue-400" />
                    </div>
                    {item.label}
                  </motion.div>
                ))}
              </div>
            </AnimSection>
            <AnimSection delay={0.15}>
              <div className="p-8 rounded-2xl bg-slate-800/40 border border-slate-700/50">
                <h3 className="text-lg font-bold text-white mb-6">Solicitar demo gratuita</h3>
                <ContactForm />
              </div>
            </AnimSection>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 border-t border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white">EduCore</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">La plataforma integral de administración escolar para instituciones que buscan la excelencia.</p>
              <div className="flex gap-3 mt-5">
                {[Twitter, Linkedin, Instagram, Facebook, Youtube].map((Icon, i) => (
                  <motion.a
                    key={i} href="#"
                    whileHover={rm ? {} : { scale: 1.15, y: -2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
                    aria-label="Red social"
                  >
                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                  </motion.a>
                ))}
              </div>
            </div>
            {Object.entries(FOOTER_LINKS).map(([cat, links]) => (
              <div key={cat}>
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">{cat}</h4>
                <ul className="space-y-2.5">
                  {links.map((l) => (
                    <li key={l}><a href="#" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-6 mb-10 pb-10 border-b border-slate-800/60">
            <a href="mailto:contacto@educore.mx" className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"><Mail className="w-3.5 h-3.5" /> contacto@educore.mx</a>
            <a href="tel:+525512345678" className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"><Phone className="w-3.5 h-3.5" /> +52 (55) 1234-5678</a>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-600">© 2026 EduCore. Todos los derechos reservados.</p>
            <div className="flex gap-5">
              {["Privacidad", "Términos", "Cookies"].map((l) => (
                <a key={l} href="#" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ── Video modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {videoModal && (
          <motion.div
            key="video-overlay"
            initial={rm ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setVideoModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            role="dialog" aria-modal="true" aria-label="Video de EduCore"
          >
            <motion.div
              initial={rm ? false : { scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-2xl"
            >
              <button
                onClick={() => setVideoModal(false)}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                aria-label="Cerrar video"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                <Play className="w-10 h-10" />
                <p className="text-sm">Video de demostración — Próximamente</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Contact Form ──────────────────────────────────────────────────────── */
function ContactForm() {
  const rm = useReducedMotion();
  const [form, setForm] = useState({ name: "", school: "", email: "", phone: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    await new Promise((r) => setTimeout(r, 1200));
    setStatus("sent");
  };

  if (status === "sent") {
    return (
      <motion.div
        initial={rm ? false : { scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="flex flex-col items-center justify-center gap-4 py-10 text-center"
      >
        <motion.div
          initial={rm ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 350, damping: 20, delay: 0.1 }}
          className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center"
        >
          <CheckCircle2 className="w-7 h-7 text-green-400" />
        </motion.div>
        <h4 className="font-semibold text-white">¡Mensaje enviado!</h4>
        <p className="text-sm text-slate-400">Un asesor se pondrá en contacto contigo en las próximas 24 horas.</p>
        <button onClick={() => setStatus("idle")} className="text-xs text-blue-400 hover:text-blue-300 transition-colors mt-2">Enviar otro mensaje</button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CField label="Nombre completo" id="cf-name" type="text" placeholder="Lic. María García" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <CField label="Institución"     id="cf-school" type="text" placeholder="Colegio Ejemplo"  value={form.school} onChange={(v) => setForm({ ...form, school: v })} required />
      </div>
      <CField label="Correo electrónico" id="cf-email" type="email" placeholder="maria@colegio.mx" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
      <CField label="Teléfono" id="cf-phone" type="tel" placeholder="+52 (55) 0000-0000" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
      <div className="space-y-1.5">
        <label htmlFor="cf-msg" className="block text-xs font-medium text-slate-400">¿Cómo podemos ayudarte? <span className="text-slate-600">(opcional)</span></label>
        <textarea id="cf-msg" rows={3} placeholder="Cuéntanos sobre tu institución…" value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 resize-none transition-colors" />
      </div>
      {status === "error" && <p role="alert" className="text-xs text-red-400">Ocurrió un error. Intenta de nuevo.</p>}
      <motion.button
        type="submit"
        disabled={status === "sending"}
        whileHover={rm ? {} : { scale: 1.02 }}
        whileTap={rm ? {} : { scale: 0.98 }}
        className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-900/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        {status === "sending" ? (
          <span className="flex items-center justify-center gap-2">
            <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            Enviando…
          </span>
        ) : "Solicitar demo gratuita →"}
      </motion.button>
      <p className="text-center text-[10px] text-slate-600">Al enviar aceptas nuestra <a href="#" className="underline hover:text-slate-400 transition-colors">política de privacidad</a>.</p>
    </form>
  );
}

function CField({ label, id, type, placeholder, value, onChange, required }: {
  label: string; id: string; type: string; placeholder: string;
  value: string; onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-slate-400">{label}{required && <span className="text-slate-600"> *</span>}</label>
      <input id={id} type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full h-10 px-3 rounded-lg bg-slate-900/60 border border-slate-700 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors" />
    </div>
  );
}
