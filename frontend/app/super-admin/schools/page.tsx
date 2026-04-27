"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building2, Users, Calendar, MoreVertical, Eye, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data for schools
const mockSchools = [
  {
    id: "1",
    name: "Colegio San Francisco",
    slug: "colegio-san-francisco",
    status: "active",
    studentsCount: 450,
    teachersCount: 32,
    plan: "Premium",
    createdAt: "2024-01-15",
    location: "Ciudad de México, CDMX",
  },
  {
    id: "2",
    name: "Instituto Tecnológico del Valle",
    slug: "instituto-tecnologico-valle",
    status: "active",
    studentsCount: 680,
    teachersCount: 45,
    plan: "Enterprise",
    createdAt: "2023-11-20",
    location: "Guadalajara, JAL",
  },
  {
    id: "3",
    name: "Preparatoria Benito Juárez",
    slug: "preparatoria-benito-juarez",
    status: "suspended",
    studentsCount: 320,
    teachersCount: 28,
    plan: "Basic",
    createdAt: "2024-02-10",
    location: "Monterrey, NL",
  },
];

const statusColors = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  suspended: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
};

const statusLabels = {
  active: "Activa",
  suspended: "Suspendida",
  pending: "Pendiente",
};

const planColors = {
  Basic: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  Premium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  Enterprise: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

export default function SchoolsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [schools] = useState(mockSchools);

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Escuelas</h1>
          <p className="text-muted-foreground">Administra todas las instituciones educativas registradas</p>
        </div>
        <Button className="w-fit">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Escuela
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total Escuelas</CardDescription>
              <Building2 className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schools.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Escuelas Activas</CardDescription>
              <Building2 className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {schools.filter(s => s.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total Estudiantes</CardDescription>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {schools.reduce((sum, school) => sum + school.studentsCount, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total Profesores</CardDescription>
              <Users className="w-4 h-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {schools.reduce((sum, school) => sum + school.teachersCount, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar escuelas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Schools List */}
      <div className="space-y-4">
        {filteredSchools.map((school) => (
          <Card key={school.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-lg">{school.name}</CardTitle>
                    <Badge className={statusColors[school.status as keyof typeof statusColors]}>
                      {statusLabels[school.status as keyof typeof statusLabels]}
                    </Badge>
                    <Badge variant="outline" className={planColors[school.plan as keyof typeof planColors]}>
                      {school.plan}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {school.location}
                  </CardDescription>
                  <div className="text-sm text-muted-foreground">
                    Slug: <code className="bg-muted px-1 rounded text-xs">{school.slug}</code>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="w-4 h-4 mr-2" />
                      Ver detalles
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{school.studentsCount}</div>
                  <div className="text-xs text-muted-foreground">Estudiantes</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{school.teachersCount}</div>
                  <div className="text-xs text-muted-foreground">Profesores</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg col-span-2 sm:col-span-2">
                  <div className="flex items-center justify-center gap-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {new Date(school.createdAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">Fecha de registro</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSchools.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No se encontraron escuelas</h3>
            <p className="text-muted-foreground mb-4">
              No hay escuelas que coincidan con tu búsqueda
            </p>
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Crear primera escuela
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}