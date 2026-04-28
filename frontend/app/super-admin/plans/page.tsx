"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, Edit, Trash2, Check, X, Star } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { PlanFormModal } from "./PlanFormModal";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  currency: string;
  max_students: number;
  max_teachers: number;
  modules: string;
  features: string;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const { toast } = useToast();

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/v1/super-admin/plans");
      if (res.success) {
        setPlans(res.data.plans || []);
      }
    } catch (err) {
      console.error("Error fetching plans:", err);
      toast({ title: "Error", description: "No se pudieron cargar los planes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleTogglePlan = async (id: string, currentStatus: boolean) => {
    try {
      const res = await authFetch(`/api/v1/super-admin/plans/${id}/toggle`, { method: "PATCH" });
      if (res.success) {
        setPlans(plans.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p));
        toast({ title: "Éxito", description: `Plan ${!currentStatus ? 'activado' : 'desactivado'}` });
      }
    } catch (err) {
      toast({ title: "Error", description: "No se pudo cambiar el estado", variant: "destructive" });
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este plan?")) return;
    try {
      const res = await authFetch(`/api/v1/super-admin/plans/${id}`, { method: "DELETE" });
      if (res.success) {
        setPlans(plans.filter(p => p.id !== id));
        toast({ title: "Éxito", description: "Plan eliminado" });
      } else {
        toast({ title: "Aviso", description: res.message || "No se pudo eliminar el plan (puede estar en uso)", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Error al eliminar el plan", variant: "destructive" });
    }
  };

  const openNewPlan = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  const openEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Planes de Suscripción</h1>
          <p className="text-muted-foreground mt-1">Gestiona los planes que ofreces a las escuelas</p>
        </div>
        <Button onClick={openNewPlan} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Crear Nuevo Plan
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-medium">No hay planes creados</h3>
            <p className="text-muted-foreground mt-1 max-w-sm">
              Crea tu primer plan de suscripción para empezar a registrar escuelas en la plataforma.
            </p>
            <Button onClick={openNewPlan} variant="outline" className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Crear mi primer plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            let parsedModules = [];
            let parsedFeatures = [];
            try { parsedModules = JSON.parse(plan.modules); } catch(e){}
            try { parsedFeatures = JSON.parse(plan.features); } catch(e){}

            return (
              <Card key={plan.id} className={`flex flex-col relative overflow-hidden transition-all ${plan.is_featured ? 'border-primary shadow-md' : ''} ${!plan.is_active ? 'opacity-70' : ''}`}>
                {plan.is_featured && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    Destacado
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span className="text-xl">{plan.name}</span>
                  </CardTitle>
                  <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col">
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">${plan.price_monthly}</span>
                      <span className="text-muted-foreground text-sm">{plan.currency}/mes</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      ó ${plan.price_annual} /año
                    </div>
                  </div>

                  <div className="space-y-4 flex-1">
                    <div>
                      <p className="text-sm font-medium mb-2">Límites:</p>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• {plan.max_students === 0 ? 'Alumnos ilimitados' : `Hasta ${plan.max_students} alumnos`}</li>
                        <li>• {plan.max_teachers === 0 ? 'Profesores ilimitados' : `Hasta ${plan.max_teachers} profesores`}</li>
                      </ul>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Incluye {parsedModules.length} módulos y:</p>
                      <ul className="text-sm space-y-2">
                        {parsedFeatures.slice(0, 4).map((f: string, i: number) => (
                          <li key={i} className="flex items-start">
                            <Check className="w-4 h-4 mr-2 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-muted-foreground leading-tight">{f}</span>
                          </li>
                        ))}
                        {parsedFeatures.length > 4 && (
                          <li className="text-xs text-muted-foreground italic">
                            + {parsedFeatures.length - 4} características más
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-6 mt-auto border-t border-border flex justify-between items-center">
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => openEditPlan(plan)} title="Editar plan">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleDeletePlan(plan.id)} title="Eliminar plan" className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <Button 
                      variant={plan.is_active ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => handleTogglePlan(plan.id, plan.is_active)}
                    >
                      {plan.is_active ? (
                        <span className="flex items-center"><X className="w-3 h-3 mr-1" /> Desactivar</span>
                      ) : (
                        <span className="flex items-center text-green-600"><Check className="w-3 h-3 mr-1" /> Activar</span>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <PlanFormModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSaved={() => {
            setIsModalOpen(false);
            fetchPlans();
          }}
          plan={editingPlan}
        />
      )}
    </div>
  );
}
