"use client";

import { useEffect, useState } from "react";
import { Utensils, Coffee, Apple } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const mealIcons: Record<string, any> = {
  desayuno: Coffee,
  almuerzo: Utensils,
  colacion: Apple,
  cena: Utensils,
};

const mealLabels: Record<string, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  colacion: "Colación",
  cena: "Cena",
};

export default function MealsPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [childId, setChildId] = useState("");
  const [date, setDate] = useState(today());
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [notAvailable, setNotAvailable] = useState(false);

  useEffect(() => {
    authFetch("/api/v1/parent/children").then((res) => {
      const list = res.success ? res.data || [] : [];
      setChildren(list);
      setChildId(list[0]?.id || "");
    });
  }, []);

  useEffect(() => {
    if (!childId) return;
    const load = async () => {
      setLoading(true);
      setNotAvailable(false);
      try {
        const res = await authFetch(`/api/v1/parent/children/${childId}/meals?date=${date}`);
        if (!res.success || !res.data) {
          setMeals([]);
          setNotAvailable(true);
        } else {
          setMeals(res.data || []);
        }
      } catch {
        setMeals([]);
        setNotAvailable(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [childId, date]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comidas</h1>
          <p className="text-muted-foreground">Registro de alimentación diaria: qué comió y en qué cantidad.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {children.length > 1 && (
            <Select value={childId} onValueChange={setChildId}>
              <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Hijo/a" /></SelectTrigger>
              <SelectContent>{children.map((c) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-[160px]"
          />
        </div>
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
        </div>
      )}

      {!loading && notAvailable && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Utensils className="h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">Tu escuela aún no tiene el módulo de comidas configurado</p>
            <p className="text-sm text-muted-foreground max-w-sm">Cuando la escuela active este módulo podrás ver aquí el registro de alimentación de tu hijo/a.</p>
          </CardContent>
        </Card>
      )}

      {!loading && !notAvailable && meals.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Apple className="h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">Sin registros de comidas para este día</p>
            <p className="text-sm text-muted-foreground">Selecciona otro día o espera a que la maestra registre las comidas.</p>
          </CardContent>
        </Card>
      )}

      {!loading && meals.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {meals.map((meal: any, i: number) => {
            const key = (meal.type || "").toLowerCase();
            const Icon = mealIcons[key] || Utensils;
            return (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-5 w-5 text-orange-500" />
                    {mealLabels[key] || meal.type}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {meal.items && meal.items.length > 0 ? (
                    meal.items.map((item: any, j: number) => (
                      <div key={j} className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <p className="text-sm font-medium">{item.name}</p>
                          {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                        </div>
                        {item.portion && (
                          <Badge variant={item.portion === "completo" ? "default" : "secondary"}>
                            {item.portion}
                          </Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">{meal.description || "Sin detalles registrados"}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
