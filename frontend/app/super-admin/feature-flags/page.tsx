"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, ToggleLeft, ToggleRight, Pencil, Trash2, Loader2, X, Check } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/components/ui/use-toast";

interface Flag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rollout_percentage: number;
  created_at: string;
  updated_at: string;
}

const emptyForm = { key: "", name: "", description: "", enabled: false, rollout_percentage: 100 };

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Flag | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await authFetch("/api/v1/super-admin/feature-flags");
      if (r.success) setFlags(r.data?.flags || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  }

  function openEdit(flag: Flag) {
    setEditing(flag);
    setForm({ key: flag.key, name: flag.name, description: flag.description, enabled: flag.enabled, rollout_percentage: flag.rollout_percentage });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.key.trim() || !form.name.trim()) return;
    setSaving(true);
    try {
      const endpoint = editing
        ? `/api/v1/super-admin/feature-flags/${editing.key}`
        : "/api/v1/super-admin/feature-flags";
      const method = editing ? "PUT" : "POST";
      const r = await authFetch(endpoint, { method, body: JSON.stringify(form) });
      if (r.success) {
        toast({ title: editing ? "Flag actualizada" : "Flag creada exitosamente" });
        setShowModal(false);
        load();
      } else {
        toast({ variant: "destructive", title: "Error", description: r.message || "No se pudo guardar" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(flag: Flag) {
    setTogglingKey(flag.key);
    try {
      const r = await authFetch(`/api/v1/super-admin/feature-flags/${flag.key}`, {
        method: "PUT",
        body: JSON.stringify({ ...flag, enabled: !flag.enabled }),
      });
      if (r.success) {
        setFlags(prev => prev.map(f => f.key === flag.key ? { ...f, enabled: !f.enabled } : f));
      } else {
        toast({ variant: "destructive", title: "Error al cambiar estado" });
      }
    } finally {
      setTogglingKey(null);
    }
  }

  async function handleDelete(key: string) {
    if (!confirm(`¿Eliminar la flag "${key}"? Esta acción no se puede deshacer.`)) return;
    setDeletingKey(key);
    try {
      const r = await authFetch(`/api/v1/super-admin/feature-flags/${key}`, { method: "DELETE" });
      if (r.success) {
        toast({ title: "Flag eliminada" });
        setFlags(prev => prev.filter(f => f.key !== key));
      } else {
        toast({ variant: "destructive", title: "Error al eliminar" });
      }
    } finally {
      setDeletingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feature Flags</h1>
          <p className="text-muted-foreground text-sm mt-1">Activa o desactiva funciones por plataforma, institución, plan o usuario.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition">
          <Plus className="h-4 w-4" /> Nueva Flag
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando flags...
        </div>
      ) : flags.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <p className="text-muted-foreground text-sm mb-3">No hay feature flags configuradas.</p>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition">
            <Plus className="h-4 w-4" /> Crear primera flag
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Feature</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Key</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Rollout</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Actualizada</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {flags.map(flag => (
                <tr key={flag.key} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{flag.name}</p>
                    {flag.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{flag.description}</p>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded font-mono text-muted-foreground">{flag.key}</code>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(flag)} disabled={togglingKey === flag.key} className="flex items-center gap-1.5 transition hover:opacity-80" title={flag.enabled ? "Desactivar" : "Activar"}>
                      {togglingKey === flag.key ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : flag.enabled ? (
                        <><ToggleRight className="h-5 w-5 text-emerald-500" /><span className="text-xs text-emerald-500 font-medium">Activa</span></>
                      ) : (
                        <><ToggleLeft className="h-5 w-5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Inactiva</span></>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell">{flag.rollout_percentage}%</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                    {flag.updated_at ? new Date(flag.updated_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button onClick={() => openEdit(flag)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition" title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(flag.key)} disabled={deletingKey === flag.key} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition" title="Eliminar">
                        {deletingKey === flag.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg">{editing ? "Editar feature flag" : "Nueva feature flag"}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Key <span className="text-red-400">*</span></label>
                <input type="text" value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") }))} disabled={!!editing} placeholder="mi_feature_key" className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-mono disabled:opacity-50 focus:outline-none focus:border-primary transition" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nombre <span className="text-red-400">*</span></label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Mi Nueva Feature" className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-primary transition" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Descripción</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="¿Qué hace esta feature?" rows={2} className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none transition" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Rollout % (0–100)</label>
                <input type="number" min={0} max={100} value={form.rollout_percentage} onChange={e => setForm(f => ({ ...f, rollout_percentage: Number(e.target.value) }))} className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:border-primary transition" />
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.enabled ? "bg-emerald-500" : "bg-slate-600"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.enabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
                <span className="text-sm">{form.enabled ? "Activa al guardar" : "Inactiva al guardar"}</span>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-border py-2.5 text-sm hover:bg-accent transition">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {editing ? "Guardar cambios" : "Crear flag"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
