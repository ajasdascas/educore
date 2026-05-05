"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ArrowRight, BookOpen, Loader2, ChevronRight, GraduationCap } from "lucide-react";
import { API_URL } from "@/lib/api";

function formatSlug(s: string) {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface PortalDef {
  role: string;
  label: string;
  desc: string;
  icon: string;
  gradient: string;
  ring: string;
  badge: string;
}

const PORTALS: PortalDef[] = [
  {
    role: "school_admin",
    label: "Director / Coordinador",
    desc: "Gestión académica completa: alumnos, profesores, grupos, horarios y reportes.",
    icon: "🏫",
    gradient: "from-blue-600/20 to-indigo-600/20",
    ring: "ring-blue-500/30 hover:ring-blue-400/60",
    badge: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  },
  {
    role: "teacher",
    label: "Profesor",
    desc: "Registro de asistencias, captura de calificaciones y comunicación con padres.",
    icon: "👨‍🏫",
    gradient: "from-violet-600/20 to-purple-600/20",
    ring: "ring-violet-500/30 hover:ring-violet-400/60",
    badge: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  },
  {
    role: "parent",
    label: "Padre de familia",
    desc: "Seguimiento escolar de tus hijos: calificaciones, asistencia, pagos y mensajes.",
    icon: "👨‍👩‍👧",
    gradient: "from-emerald-600/20 to-teal-600/20",
    ring: "ring-emerald-500/30 hover:ring-emerald-400/60",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  },
];

const ROLE_LABELS: Record<string, string> = {
  school_admin: "Director / Coordinador",
  teacher: "Profesor",
  parent: "Padre de familia",
};

// --- Animation variants ---
const easeOutCubic = [0, 0, 0.2, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: easeOutCubic },
  }),
};

const cardVariant: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.25 + i * 0.1, duration: 0.38, ease: easeOutCubic },
  }),
};

// --- Sub-components ---
function SchoolLogo({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 20 }}
      className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl shadow-blue-900/50"
    >
      <GraduationCap className="h-10 w-10 text-white" strokeWidth={1.5} />
    </motion.div>
  );
}

// ─── Direct login card (when ?role= is set) ─────────────────────────────────
function DirectRoleCard({
  slug,
  role,
  displayName,
  loadingName,
}: {
  slug: string;
  role: string;
  displayName: string;
  loadingName: boolean;
}) {
  const portal = PORTALS.find((p) => p.role === role);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-64 -top-64 h-[560px] w-[560px] rounded-full bg-blue-600/8 blur-3xl" />
        <div className="absolute -bottom-64 -left-64 h-[560px] w-[560px] rounded-full bg-indigo-600/8 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0, 0, 0.2, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        <SchoolLogo name={displayName} />

        <div className="mb-1 text-center">
          {slug && (
            <p className="mb-1 font-mono text-[10px] tracking-widest text-slate-600">
              {slug}.onlineu.mx
            </p>
          )}
          <h1 className="text-2xl font-bold text-white">
            {loadingName ? (
              <span className="inline-flex items-center gap-1.5 text-slate-400 text-base">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
              </span>
            ) : (
              displayName
            )}
          </h1>
          {portal && (
            <p className="mt-1 text-sm text-slate-500">
              Portal — {portal.label}
            </p>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.18, duration: 0.35 }}
          className="mt-6 overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl"
        >
          {portal && (
            <div
              className={`mb-5 flex items-center gap-3 rounded-xl bg-gradient-to-br p-3 ${portal.gradient} ring-1 ${portal.ring}`}
            >
              <span className="text-3xl">{portal.icon}</span>
              <div>
                <p className="text-sm font-semibold text-white">{portal.label}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{portal.desc}</p>
              </div>
            </div>
          )}

          <Link
            href={`/login?slug=${slug}&role=${role}`}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            Iniciar sesión
            <ArrowRight className="h-4 w-4" />
          </Link>

          <div className="mt-4 text-center">
            <Link
              href={`/escuela/?slug=${slug}`}
              className="text-xs text-slate-600 transition-colors hover:text-slate-400"
            >
              ← Ver todos los portales
            </Link>
          </div>
        </motion.div>

        <p className="mt-6 text-center text-xs text-slate-700">
          Powered by{" "}
          <a
            href="https://onlineu.mx/educore/"
            className="transition-colors hover:text-slate-500"
          >
            EduCore
          </a>
        </p>
      </motion.div>
    </main>
  );
}

// ─── Full portal selector ────────────────────────────────────────────────────
function PortalSelector({
  slug,
  displayName,
  loadingName,
}: {
  slug: string;
  displayName: string;
  loadingName: boolean;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12">
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-72 -top-72 h-[640px] w-[640px] rounded-full bg-blue-600/6 blur-3xl" />
        <div className="absolute -bottom-72 -left-72 h-[640px] w-[640px] rounded-full bg-indigo-600/6 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/4 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <SchoolLogo name={displayName} />

        <motion.div
          className="mb-8 text-center"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
        >
          {slug && (
            <motion.p
              variants={fadeUp}
              custom={0}
              className="mb-1 font-mono text-[10px] tracking-widest text-slate-600"
            >
              {slug}.onlineu.mx
            </motion.p>
          )}
          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-3xl font-bold tracking-tight text-white"
          >
            {loadingName ? (
              <span className="inline-flex items-center gap-2 text-slate-400 text-xl">
                <Loader2 className="h-5 w-5 animate-spin" />
                Cargando...
              </span>
            ) : (
              displayName
            )}
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="mt-1.5 text-sm text-slate-500">
            Sistema de gestión escolar ·{" "}
            <span className="text-slate-600">EduCore</span>
          </motion.p>
        </motion.div>

        {/* Section label */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="mb-3 pl-1 text-[11px] font-semibold uppercase tracking-widest text-slate-600"
        >
          ¿Con qué perfil deseas ingresar?
        </motion.p>

        {/* Portal cards */}
        <motion.div
          className="space-y-3"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
        >
          {PORTALS.map((portal, i) => (
            <motion.div key={portal.role} variants={cardVariant} custom={i}>
              <Link
                href={`/login?slug=${slug}&role=${portal.role}`}
                className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-sm transition-all duration-200 ring-1 ${portal.ring} hover:bg-slate-800/60 hover:border-slate-700/80`}
              >
                {/* Gradient shimmer on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${portal.gradient}`}
                  aria-hidden
                />

                <span className="relative z-10 shrink-0 text-2xl" role="img" aria-hidden>
                  {portal.icon}
                </span>

                <div className="relative z-10 min-w-0 flex-1">
                  <p className="font-semibold text-white text-sm transition-colors group-hover:text-white/90">
                    {portal.label}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500 group-hover:text-slate-400 transition-colors">
                    {portal.desc}
                  </p>
                </div>

                <motion.div
                  className="relative z-10 shrink-0"
                  whileHover={{ x: 3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <ChevronRight className="h-4 w-4 text-slate-600 transition-colors group-hover:text-slate-300" />
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.4 }}
          className="mt-8 text-center"
        >
          <a
            href="https://onlineu.mx/educore/"
            className="text-xs text-slate-700 transition-colors hover:text-slate-500"
          >
            Powered by EduCore · onlineu.mx
          </a>
        </motion.div>
      </div>
    </main>
  );
}

// ─── Inner (reads URL params + detects subdomain) ───────────────────────────
function EscuelaInner() {
  const params = useSearchParams();
  const [slug, setSlug] = useState(params.get("slug") || "");
  const role = params.get("role") || "";
  const [schoolName, setSchoolName] = useState("");
  const [loadingName, setLoadingName] = useState(false);

  // Detect school slug from subdomain (kinder1.onlineu.mx)
  useEffect(() => {
    if (!slug && typeof window !== "undefined") {
      const host = window.location.hostname;
      const parts = host.split(".");
      if (
        parts.length >= 3 &&
        parts[parts.length - 2] === "onlineu" &&
        parts[parts.length - 1] === "mx"
      ) {
        const sub = parts[0];
        const excluded = ["www", "mail", "ftp", "api", "smtp", "webmail"];
        if (!excluded.includes(sub)) setSlug(sub);
      }
    }
  }, [slug]);

  // Fetch real school name
  useEffect(() => {
    if (!slug) return;
    setLoadingName(true);
    fetch(`${API_URL}/api/v1/public/school-info?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.data?.name) setSchoolName(d.data.name);
      })
      .catch(() => {})
      .finally(() => setLoadingName(false));
  }, [slug]);

  const displayName = schoolName || (slug ? formatSlug(slug) : "Tu Institución");

  if (role && ROLE_LABELS[role]) {
    return (
      <DirectRoleCard
        slug={slug}
        role={role}
        displayName={displayName}
        loadingName={loadingName}
      />
    );
  }

  return (
    <PortalSelector slug={slug} displayName={displayName} loadingName={loadingName} />
  );
}

// ─── Public export ───────────────────────────────────────────────────────────
export default function EscuelaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950">
          <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
        </div>
      }
    >
      <EscuelaInner />
    </Suspense>
  );
}
