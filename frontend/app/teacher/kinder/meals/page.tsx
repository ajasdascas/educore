"use client";

import { useEffect, useState } from "react";
import { Loader2, PlusCircle, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { authFetch } from "@/lib/auth";
import { ModuleGuard } from "@/components/providers/ModuleGuard";

type MealTime = "breakfast" | "morning_snack" | "lunch" | "afternoon_snack";
type Portion = "full" | "half" | "little" | "none";

const mealTimeLabels: Record<MealTime, string> = {
  breakfast:       "Desayuno",
  morning_snack:   "Colación mañana",
  lunch:           "Comida",
  afternoon_snack: "Colación tarde",
};

const portionLabels: Record<Portion, { label: string; color: string }> = {
  full:   { label: "Completo", color: "bg-green-100 text-green-800" },
  half:   { label: "Mitad",    color: "bg-yellow-100 text-yellow-800" },
  little: { label: "Poco",     color: "bg-orange-100 text-orange-800" },
  none:   { label: "Nada",     color: "bg-red-100 text-red-800" },
};

type KinderStudent = { id: string; first_name: string; last_name: string };
type MealRecord = {
  id: string;
  student_id: string;
  student_name?: string;
  meal_date: string;
  meal_time: MealTime;
  portion: Portion;
  food_note: string;
};

function today() { return new Date().toISOString().slice(0, 10); }

const API_BASE = "/api/v1/teacher";

function MealsContent() {
  const { toast } = useToast();
  const [date, setDate] = useState(today());
  const [students, setStudents] = useState<KinderStudent[]>([]);
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [mealTime, setMealTime] = useState<MealTime>("lunch");
  const [portion, setPortion] = useState<Portion>("full");
  const [foodNote, setFoodNote] = useState("");

  const loadStudents = async () => {
    const res = await authFetch(`${API_BASE}/kinder/students`);
    const raw = res?.data?.students ?? res?.data ?? [];
    const list: KinderStudent[] = Array.isArray(raw) ? raw : [];
    setStudents(list);
    if (list.length > 0 && !studentId) setStudentId(list[0].id);
  };

  const loadMeals = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE}/kinder/meals?date=${date}`);
      const raw = res?.data?.meals ?? res?.data ?? [];
      setMeals(Array.isArray(raw) ? raw : []);
    } catch {
      toast({ title: "Error al cargar comidas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStudents(); }, []);
  useEffect(() => { loadMeals(); }, [date]);

  const handleSave = async () => {
    if (!studentId) return toast({ title: "Selecciona un alumno", variant: "destructive" });
    try {
      setSaving(true);
      const res = await authFetch(`${API_BASE}/kinder/meals`, {
        method: "POST",
        body: JSON.stringify({ student_id: studentId, meal_date: date, meal_time: mealTime, portion, food_note: foodNote }),
      });
      if (!res?.success) throw new Error(res?.error ?? "No se pudo guardar.");
      toast({ title: "Registro de comida guardado" });
      setFoodNote("");
      await loadMeals();
    } catch (err) {
      toast({ title: "Error al guardar", description: err instanceof Error ? err.message : "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const studentName = (id: string) => {
    const s = students.find((s) => s.id === id);
    return s ? `${s.first_name} ${s.last_name}` : id;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alimentación — Kinder</h1>
        <p className="mt-1 text-sm text-muted-foreground">Registro de comidas y porciones por alumno y tiempo de comida.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PlusCircle className="h-5 w-5" />Nuevo registro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Alumno</Label>
              <Select value={studentId || "none"} onValueChange={(v) => setStudentId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                <SelectContent>
                  {students.length === 0
                    ? <SelectItem value="none">Sin alumnos</SelectItem>
                    : students.map((s) => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tiempo de comida</Label>
              <Select value={mealTime} onValueChange={(v) => setMealTime(v as MealTime)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(mealTimeLabels) as MealTime[]).map((k) => (
                    <SelectItem key={k} value={k}>{mealTimeLabels[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Porción</Label>
              <Select value={portion} onValueChange={(v) => setPortion(v as Portion)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(portionLabels) as Portion[]).map((k) => (
                    <SelectItem key={k} value={k}>{portionLabels[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nota de alimento</Label>
            <Textarea value={foodNote} onChange={(e) => setFoodNote(e.target.value)} placeholder="Qué comió, reacciones, preferencias…" rows={2} />
          </div>
          <Button onClick={handleSave} disabled={saving || !studentId}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Guardar registro
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Utensils className="h-5 w-5" />Registros del día</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando…</div>
          ) : meals.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Utensils className="h-10 w-10" /><p>Sin registros de comida para esta fecha.</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Alumno</TableHead><TableHead>Tiempo</TableHead><TableHead>Porción</TableHead><TableHead>Nota</TableHead></TableRow></TableHeader>
              <TableBody>
                {meals.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.student_name ?? studentName(m.student_id)}</TableCell>
                    <TableCell>{mealTimeLabels[m.meal_time] ?? m.meal_time}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${portionLabels[m.portion]?.color ?? ""}`}>
                        {portionLabels[m.portion]?.label ?? m.portion}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{m.food_note || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function MealsPage() {
  return (
    <ModuleGuard moduleKey="meals" moduleName="Alimentación">
      <MealsContent />
    </ModuleGuard>
  );
}
