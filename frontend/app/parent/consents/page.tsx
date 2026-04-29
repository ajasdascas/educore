"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

export default function ParentConsentsPage() {
  const [consents, setConsents] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const load = () => authFetch("/api/v1/parent/consents").then((res) => setConsents(res.success ? res.data || [] : []));
  useEffect(() => { load(); }, []);

  const update = async (id: string, action: "approved" | "rejected") => {
    const res = await authFetch(`/api/v1/parent/consents/${id}`, { method: "PATCH", body: JSON.stringify({ action, notes: notes[id] || "" }) });
    toast({ title: res.success ? "Permiso actualizado" : "No se pudo actualizar", description: res.message || "La escuela recibira tu respuesta." });
    if (res.success) load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Permisos Parentales</h1>
        <p className="text-muted-foreground">Autoriza o rechaza actividades escolares, permisos medicos y consentimientos.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" /> Solicitudes</CardTitle></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {consents.map((consent) => (
            <div key={consent.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{consent.title}</p>
                  <p className="text-sm text-muted-foreground">{consent.student_name} · vence {consent.due_date || "sin fecha"}</p>
                </div>
                <Badge variant={consent.status === "pending" ? "outline" : "secondary"}>{consent.status}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{consent.description}</p>
              {consent.status === "pending" ? (
                <div className="mt-4 space-y-3">
                  <Textarea placeholder="Notas opcionales para direccion" value={notes[consent.id] || ""} onChange={(e) => setNotes({ ...notes, [consent.id]: e.target.value })} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button onClick={() => update(consent.id, "approved")}>Autorizar</Button>
                    <Button variant="outline" onClick={() => update(consent.id, "rejected")}>Rechazar</Button>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">Respondido: {consent.signed_at ? new Date(consent.signed_at).toLocaleString("es-MX") : "registrado"}</p>
              )}
            </div>
          ))}
          {consents.length === 0 && <div className="col-span-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No hay permisos pendientes.</div>}
        </CardContent>
      </Card>
    </div>
  );
}
