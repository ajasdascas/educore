"use client";

import { ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ParentStorePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tienda Escolar</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Artículos y materiales disponibles en tu escuela.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
          <div className="rounded-full bg-muted p-5">
            <ShoppingBag className="w-10 h-10 text-muted-foreground/60" />
          </div>
          <div className="space-y-2 max-w-sm">
            <h3 className="font-semibold text-lg">Tienda no configurada</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tu escuela aún no ha configurado la tienda escolar. Cuando esté
              disponible, podrás comprar uniformes, útiles y materiales
              directamente aquí.
            </p>
          </div>
          <Button asChild variant="outline" className="mt-2">
            <Link href="/parent/messages">Contactar a la escuela</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
