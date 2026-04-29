"use client";

import { Component, ReactNode } from "react";

type ModuleBoundaryProps = {
  moduleName: string;
  children: ReactNode;
};

type ModuleBoundaryState = {
  hasError: boolean;
};

export class ModuleBoundary extends Component<ModuleBoundaryProps, ModuleBoundaryState> {
  state: ModuleBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`Module ${this.props.moduleName} failed`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm">
          <p className="font-semibold">No se pudo cargar {this.props.moduleName}</p>
          <p className="mt-1 text-muted-foreground">El resto del panel sigue disponible.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
