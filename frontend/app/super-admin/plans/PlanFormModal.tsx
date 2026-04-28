"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { X, Plus, Trash2, Save, Sparkles } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/components/ui/use-toast";

interface PlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  plan: any | null;
}

export function PlanFormModal({ isOpen, onClose, onSaved, plan }: PlanFormModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price_monthly: 0,
    price_annual: 0,
    currency: "MXN",
    max_students: 0,
    max_teachers: 0,
    is_active: true,
    is_featured: false,
  });

  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([""]);

  useEffect(() => {
    // Cargar catálogo de módulos
    const loadCatalog = async () => {
      try {
        const res = await authFetch("/api/v1/super-admin/modules-catalog");
        if (res.success) {
          setCatalog(Array.isArray(res.data?.modules) ? res.data.modules : []);
        }
      } catch (err) {
        console.error("Error loading catalog:", err);
      }
    };
    loadCatalog();

    if (plan) {
      setFormData({
        name: plan.name,
        description: plan.description,
        price_monthly: plan.price_monthly,
        price_annual: plan.price_annual,
        currency: plan.currency,
        max_students: plan.max_students,
        max_teachers: plan.max_teachers,
        is_active: plan.is_active,
        is_featured: plan.is_featured,
      });

      try {
        setSelectedModules(Array.isArray(plan.modules) ? plan.modules : JSON.parse(plan.modules || "[]"));
      } catch (e) {
        setSelectedModules([]);
      }

      try {
        const parsedF = Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features || "[]");
        setFeatures(parsedF.length > 0 ? parsedF : [""]);
      } catch (e) {
        setFeatures([""]);
      }
    }
  }, [plan]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const calculateAnnualDiscount = () => {
    if (formData.price_monthly > 0) {
      // Por defecto, 2 meses gratis (10 meses)
      setFormData(prev => ({ ...prev, price_annual: prev.price_monthly * 10 }));
    }
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newF = [...features];
    newF[index] = value;
    setFeatures(newF);
  };

  const addFeature = () => setFeatures([...features, ""]);
  
  const removeFeature = (index: number) => {
    const newF = features.filter((_, i) => i !== index);
    setFeatures(newF.length > 0 ? newF : [""]);
  };

  const toggleModule = (key: string) => {
    if (selectedModules.includes(key)) {
      setSelectedModules(selectedModules.filter(m => m !== key));
    } else {
      setSelectedModules([...selectedModules, key]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cleanFeatures = features.filter(f => f.trim() !== "");

    const payload = {
      ...formData,
      modules: selectedModules,
      features: cleanFeatures
    };

    try {
      const url = plan 
        ? `/api/v1/super-admin/plans/${plan.id}`
        : "/api/v1/super-admin/plans";
      
      const method = plan ? "PUT" : "POST";

      const res = await authFetch(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (res.success) {
        toast({ title: "Éxito", description: `Plan ${plan ? 'actualizado' : 'creado'} correctamente` });
        onSaved();
      } else {
        toast({ title: "Error", description: res.message || "No se pudo guardar el plan", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Ocurrió un error inesperado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-card border border-border shadow-2xl rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {plan ? "Editar Plan de Suscripción" : "Crear Nuevo Plan"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground rounded-full p-1 hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="plan-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Información General */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Información General
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Plan</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleChange} required placeholder="Ej: Profesional" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea id="description" name="description" value={formData.description} onChange={handleChange} required placeholder="Para colegios en crecimiento..." rows={3} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/20">
                    <Label htmlFor="is_active" className="cursor-pointer">Plan Activo</Label>
                    <Switch id="is_active" checked={formData.is_active} onCheckedChange={(c: boolean) => setFormData(p => ({...p, is_active: c}))} />
                  </div>
                  <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/20">
                    <Label htmlFor="is_featured" className="cursor-pointer">Destacado</Label>
                    <Switch id="is_featured" checked={formData.is_featured} onCheckedChange={(c: boolean) => setFormData(p => ({...p, is_featured: c}))} />
                  </div>
                </div>
              </div>

              {/* Precios y Límites */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Precios y Límites</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price_monthly">Precio Mensual ({formData.currency})</Label>
                    <Input id="price_monthly" name="price_monthly" type="number" min="0" step="0.01" value={formData.price_monthly} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price_annual">
                      Precio Anual 
                      <button type="button" onClick={calculateAnnualDiscount} className="text-xs text-primary hover:underline ml-2 font-normal">(Calcular desc.)</button>
                    </Label>
                    <Input id="price_annual" name="price_annual" type="number" min="0" step="0.01" value={formData.price_annual} onChange={handleChange} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max_students">Límite Alumnos (0 = Infinito)</Label>
                    <Input id="max_students" name="max_students" type="number" min="0" value={formData.max_students} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_teachers">Límite Profesores (0 = Infinito)</Label>
                    <Input id="max_teachers" name="max_teachers" type="number" min="0" value={formData.max_teachers} onChange={handleChange} required />
                  </div>
                </div>
              </div>
            </div>

            {/* Módulos y Características */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Módulos Incluidos</h3>
                <div className="bg-muted/30 rounded-lg p-4 max-h-[300px] overflow-y-auto space-y-2 border">
                  {catalog.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Cargando módulos...</p>
                  ) : (
                    catalog.map(mod => (
                      <div key={mod.key} className="flex items-start space-x-3 p-2 rounded hover:bg-muted/50 transition-colors">
                        <Switch 
                          id={`mod-${mod.key}`} 
                          checked={selectedModules.includes(mod.key)} 
                          onCheckedChange={() => toggleModule(mod.key)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label htmlFor={`mod-${mod.key}`} className="text-sm font-medium leading-none cursor-pointer">
                            {mod.name}
                            {mod.is_core && <span className="ml-2 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider">Base</span>}
                          </label>
                          <p className="text-xs text-muted-foreground">{mod.description}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Características (Viñetas)</h3>
                <div className="space-y-2">
                  {features.map((feat, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input 
                        value={feat} 
                        onChange={(e) => handleFeatureChange(index, e.target.value)} 
                        placeholder="Ej: Soporte técnico 24/7" 
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeFeature(index)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addFeature} className="mt-2 w-full border-dashed">
                    <Plus className="w-4 h-4 mr-2" /> Agregar Característica
                  </Button>
                </div>
              </div>
            </div>

          </form>
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/10 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="plan-form" disabled={loading} className="min-w-[120px]">
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Guardar Plan</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
