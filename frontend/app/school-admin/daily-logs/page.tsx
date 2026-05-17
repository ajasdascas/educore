"use client";

/**
 * School Admin — Registro diario (Kinder/Guardería)
 *
 * Página tabbed que agrupa las operaciones diarias de Kinder bajo un único punto
 * de navegación. School Admin = supervisión: ve los registros que captura el profesor,
 * con tabs para cambiar entre módulos sin saturar el sidebar.
 *
 * Cada tab carga el componente real (mismo que la URL canónica /school-admin/kinder/<modulo>).
 * Las URLs flat /school-admin/{meals,naps,diapers,mood} siguen funcionando como aliases
 * para deep-linking, pero no aparecen en el sidebar.
 */

import { useState } from "react";
import { Baby, Apple, Moon, Droplets, Smile } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import DailyLogsKinderPage from "@/app/school-admin/kinder/daily-logs/page";
import MealsKinderPage from "@/app/school-admin/kinder/meals/page";
import NapsKinderPage from "@/app/school-admin/kinder/naps/page";
import DiapersKinderPage from "@/app/school-admin/kinder/diapers/page";
import MoodKinderPage from "@/app/school-admin/kinder/mood/page";

export default function SchoolAdminDailyLogsPage() {
  const [tab, setTab] = useState("summary");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Registro diario</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Supervisión consolidada de la operación diaria del aula: alimentación, siestas,
          higiene, estado emocional y observaciones generales.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto">
          <TabsTrigger value="summary" className="gap-1.5 py-2">
            <Baby className="h-4 w-4" />
            <span className="hidden sm:inline">Resumen</span>
            <span className="sm:hidden">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="meals" className="gap-1.5 py-2">
            <Apple className="h-4 w-4" />
            <span>Alimentación</span>
          </TabsTrigger>
          <TabsTrigger value="naps" className="gap-1.5 py-2">
            <Moon className="h-4 w-4" />
            <span>Siestas</span>
          </TabsTrigger>
          <TabsTrigger value="diapers" className="gap-1.5 py-2">
            <Droplets className="h-4 w-4" />
            <span>Higiene</span>
          </TabsTrigger>
          <TabsTrigger value="mood" className="gap-1.5 py-2">
            <Smile className="h-4 w-4" />
            <span>Estado de ánimo</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <DailyLogsKinderPage />
        </TabsContent>
        <TabsContent value="meals" className="mt-4">
          <MealsKinderPage />
        </TabsContent>
        <TabsContent value="naps" className="mt-4">
          <NapsKinderPage />
        </TabsContent>
        <TabsContent value="diapers" className="mt-4">
          <DiapersKinderPage />
        </TabsContent>
        <TabsContent value="mood" className="mt-4">
          <MoodKinderPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
