"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  motion, AnimatePresence, useReducedMotion,
  useInView,
} from "framer-motion";
import {
  BookOpen, Menu, X, ArrowRight, CheckCircle2, Users, GraduationCap,
  Shield, Smartphone,
  FileText, Calendar, TrendingUp, ChevronRight,
  Globe, Zap, Award, Mail, ChevronDown,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle/ThemeToggle";

/* ─── Motion helpers ─────────────────────────────────────────────────────── */

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
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
  { label: "Contacto", href: "#contacto" },
];

const SOLUTIONS = [
  { icon: GraduationCap, title: "Estructura académica", desc: "Administra ciclos, niveles, grados, materias y grupos con datos separados por escuela.", color: "blue" },
  { icon: Users,         title: "Estudiantes y personal", desc: "Gestiona estudiantes, docentes, tutores y sus relaciones dentro del tenant correcto.", color: "indigo" },
  { icon: Calendar,      title: "Horarios", desc: "Crea y consulta bloques de horario por grupo, materia, profesor y salón.", color: "teal" },
  { icon: CheckCircle2,  title: "Asistencias", desc: "Registra asistencia por grupo y consulta historiales y resúmenes mensuales.", color: "green" },
  { icon: FileText,      title: "Calificaciones", desc: "Captura evaluaciones y consulta el historial académico con reglas configurables por escuela.", color: "orange" },
  { icon: Shield,        title: "Roles y permisos", desc: "Separa el acceso de Super Admin, dirección, docentes, estudiantes y tutores con permisos auditables.", color: "red" },
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
  { icon: Zap,        title: "Una escuela, un contexto", desc: "Cada operación conserva el tenant y los permisos del usuario que la ejecuta.", points: ["Aislamiento por escuela", "Acciones sensibles auditadas", "Módulos incompletos cerrados"] },
  { icon: TrendingUp, title: "Datos escolares reales", desc: "Los paneles consumen registros persistidos y muestran estados vacíos cuando todavía no existe información.", points: ["Sin métricas de demostración", "Errores visibles", "Filtros por ciclo y grupo"] },
  { icon: Smartphone, title: "Acceso desde navegador", desc: "La interfaz principal se adapta a teléfono, tableta y escritorio sin requerir una instalación.", points: ["Diseño responsivo", "Portales por rol", "Acceso interno o por subdominio"] },
];

const FAQS = [
  { q: "¿Cómo accede cada escuela?", a: "Cada escuela tiene un identificador propio y, cuando la integración de Hostinger está configurada, un subdominio individual. Los accesos también funcionan desde el portal interno." },
  { q: "¿Puedo importar estudiantes?", a: "Sí. El panel escolar incluye un flujo de importación con validación previa, mapeo de columnas y confirmación antes de guardar." },
  { q: "¿Cómo se separan los datos?", a: "Las operaciones escolares se filtran por tenant y rol. Las capacidades que aún no completan su auditoría permanecen desactivadas en lugar de mostrar datos simulados." },
  { q: "¿El sistema es accesible desde dispositivos móviles?", a: "Las pantallas principales son responsivas y se pueden abrir desde navegador en teléfono, tableta o computadora." },
  { q: "¿Qué incluye una demostración?", a: "Revisamos el flujo real disponible para dirección, estudiantes, grupos, horarios, asistencias y calificaciones, además de los requisitos de configuración de tu escuela." },
];

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

      {/* ── Video Block ─────────────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <AnimSection>
              <p className="text-xs text-blue-400 font-semibold uppercase tracking-widest mb-3">Transformación digital</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5 leading-tight">La transformación educativa comienza hoy</h2>
              <p className="text-slate-400 leading-relaxed mb-6">Conoce los flujos reales que ya operan con datos persistidos y revisa junto con nosotros qué configuración necesita tu escuela.</p>
              <ul className="space-y-3 mb-8">
                {["Alta de escuela y administrador", "Importación validada de estudiantes", "Configuración de ciclos, grupos y horarios", "Prueba guiada de roles y permisos"].map((p, i) => (
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

            {/* La demostración se agenda; no se muestra un reproductor vacío. */}
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
                <div className="relative z-10 flex max-w-sm flex-col items-center gap-3 px-6 text-center">
                  <BookOpen className="h-10 w-10 text-blue-300" />
                  <p className="font-semibold text-white">Demostración guiada con datos de prueba</p>
                  <p className="text-sm text-white/60">Sin video simulado: durante la sesión recorremos las funciones habilitadas y sus controles de acceso.</p>
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
                {[{ icon: Globe, label: "Acceso web para escuelas en México" }, { icon: Award, label: "Recorrido sobre funciones verificables" }, { icon: Shield, label: "Separación por escuela y rol" }, { icon: Users, label: "Revisión de necesidades con una persona" }].map((item, i) => (
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
        <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 border-b border-slate-800/60 pb-8 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-white">EduCore</span>
              </div>
              <p className="max-w-md text-xs leading-relaxed text-slate-500">Administración escolar modular con funciones incompletas cerradas por defecto.</p>
            </div>
            <nav aria-label="Enlaces del pie" className="flex flex-wrap gap-x-5 gap-y-3 text-xs">
              <a href="#soluciones" className="text-slate-500 hover:text-slate-300">Soluciones</a>
              <a href="#beneficios" className="text-slate-500 hover:text-slate-300">Beneficios</a>
              <a href="#contacto" className="text-slate-500 hover:text-slate-300">Contacto</a>
              <Link href="/login" className="text-slate-500 hover:text-slate-300">Iniciar sesión</Link>
            </nav>
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-slate-600">© 2026 EduCore. Todos los derechos reservados.</p>
            <a href="mailto:contacto@onlineu.mx" className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300"><Mail className="h-3.5 w-3.5" /> contacto@onlineu.mx</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Contact Form ──────────────────────────────────────────────────────── */
function ContactForm() {
  const rm = useReducedMotion();
  const [form, setForm] = useState({ name: "", school: "", email: "", phone: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "prepared" | "error">("idle");
  const configuredEndpoint = process.env.NEXT_PUBLIC_DEMO_FORM_ENDPOINT?.trim() ?? "";
  const demoFormEndpoint = configuredEndpoint.startsWith("https://") ? configuredEndpoint : "";
  const mailtoHref = `mailto:contacto@onlineu.mx?subject=${encodeURIComponent(`Solicitud de demo — ${form.school}`)}&body=${encodeURIComponent([
    `Nombre: ${form.name}`,
    `Institución: ${form.school}`,
    `Correo: ${form.email}`,
    `Teléfono: ${form.phone || "No proporcionado"}`,
    "",
    form.message || "Sin mensaje adicional.",
  ].join("\n"))}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    if (!demoFormEndpoint) {
      setStatus("prepared");
      window.location.assign(mailtoHref);
      return;
    }

    try {
      const response = await fetch(demoFormEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error(`Demo request failed with status ${response.status}`);
      }

      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent" || status === "prepared") {
    const wasSent = status === "sent";
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
        <h4 className="font-semibold text-white">{wasSent ? "Solicitud recibida" : "Correo preparado"}</h4>
        <p className="text-sm text-slate-400">
          {wasSent
            ? "El servicio de contacto confirmó la recepción de tu solicitud."
            : "Se abrió tu aplicación de correo. Revisa el mensaje y envíalo para completar la solicitud."}
        </p>
        <button onClick={() => setStatus("idle")} className="text-xs text-blue-400 hover:text-blue-300 transition-colors mt-2">Preparar otra solicitud</button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
      {status === "error" && (
        <p role="alert" className="text-xs text-red-400">
          El servicio no confirmó la solicitud. Puedes <a href={mailtoHref} className="underline hover:text-red-300">enviarla por correo</a> sin perder los datos capturados.
        </p>
      )}
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
            {demoFormEndpoint ? "Enviando…" : "Preparando…"}
          </span>
        ) : demoFormEndpoint ? "Enviar solicitud →" : "Preparar correo →"}
      </motion.button>
      <p className="text-center text-[10px] text-slate-600">No incluyas contraseñas, datos médicos ni información sensible en esta solicitud.</p>
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
