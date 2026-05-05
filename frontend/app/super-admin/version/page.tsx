"use client";

import { useState, useEffect, useCallback } from "react";
import { GitCommit, Loader2, RefreshCw, ExternalLink, User, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { authFetch } from "@/lib/auth";

interface VersionMeta {
  commit_hash?: string;
  short_hash?: string;
  commit_url?: string;
  author?: string;
  repo?: string;
  description?: string;
  branch?: string;
}

interface Version {
  id: string;
  version: string;
  status: string;
  changelog: string;
  deployed_at: string;
  metadata?: VersionMeta;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    current: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    previous: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    rollback: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    failed: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  const cls = map[status] || "bg-slate-500/15 text-slate-400 border-slate-500/30";
  const icons: Record<string, React.ReactNode> = {
    current: <CheckCircle2 className="h-3 w-3" />,
    previous: <Clock className="h-3 w-3" />,
    failed: <XCircle className="h-3 w-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${cls}`}>
      {icons[status]}
      {status}
    </span>
  );
}

export default function VersionPage() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await authFetch("/api/v1/super-admin/version");
      if (r.success) {
        const raw = r.data?.versions || [];
        // Parse metadata if it comes as string
        setVersions(raw.map((v: Version & { metadata?: VersionMeta | string }) => ({
          ...v,
          metadata: typeof v.metadata === "string" ? JSON.parse(v.metadata) : (v.metadata || {}),
        })));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const current = versions.find(v => v.status === "current");

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Versioning & Deploys</h1>
          <p className="text-muted-foreground text-sm mt-1">Historial de actualizaciones desde GitHub</p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-accent transition disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </div>

      {/* Current version banner */}
      {current && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white">
                {current.metadata?.short_hash ? `#${current.metadata.short_hash}` : current.version}
              </span>
              <StatusBadge status="current" />
              {current.metadata?.branch && (
                <span className="text-xs text-slate-500 font-mono bg-slate-800/60 px-1.5 py-0.5 rounded">
                  {current.metadata.branch}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-300 mt-1">{current.changelog.split("\n")[0]}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
              {current.metadata?.author && (
                <span className="flex items-center gap-1"><User className="h-3 w-3" />{current.metadata.author}</span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(current.deployed_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
              </span>
              {current.metadata?.commit_url && (
                <a href={current.metadata.commit_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:underline">
                  <ExternalLink className="h-3 w-3" /> Ver en GitHub
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Webhook setup info */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-300 mb-1">Configuración del webhook de GitHub</p>
            <p className="text-xs text-amber-400/80 leading-relaxed">
              Para recibir deploys automáticamente: ve a tu repositorio en GitHub →{" "}
              <strong>Settings → Webhooks → Add webhook</strong> con:
            </p>
            <ul className="mt-2 space-y-1 text-xs text-amber-400/70">
              <li>• <strong>Payload URL:</strong> <code className="bg-amber-900/30 px-1 rounded font-mono">https://[tu-backend]/api/v1/webhooks/github</code></li>
              <li>• <strong>Content type:</strong> <code className="bg-amber-900/30 px-1 rounded font-mono">application/json</code></li>
              <li>• <strong>Secret:</strong> valor de <code className="bg-amber-900/30 px-1 rounded font-mono">GITHUB_WEBHOOK_SECRET</code> en Railway</li>
              <li>• <strong>Events:</strong> solo <code className="bg-amber-900/30 px-1 rounded font-mono">push</code></li>
            </ul>
          </div>
        </div>
      </div>

      {/* History list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando historial...
        </div>
      ) : versions.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl text-muted-foreground text-sm">
          Sin historial de deploys. Configura el webhook de GitHub para empezar.
        </div>
      ) : (
        <div className="space-y-2">
          {versions.map(v => {
            const meta = v.metadata || {};
            const lines = v.changelog.split("\n").filter(Boolean);
            const title = lines[0] || v.version;
            const desc = lines.slice(1).join(" ").trim() || meta.description || "";
            return (
              <div
                key={v.id}
                className={`rounded-xl border p-4 transition-colors ${
                  v.status === "current"
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-border hover:bg-muted/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
                    <GitCommit className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{title}</span>
                      <StatusBadge status={v.status} />
                      {meta.short_hash && (
                        <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                          {meta.short_hash}
                        </code>
                      )}
                    </div>
                    {desc && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{desc}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      {meta.author && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />{meta.author}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(v.deployed_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                      {meta.commit_url && (
                        <a
                          href={meta.commit_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-400 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> Ver commit
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
