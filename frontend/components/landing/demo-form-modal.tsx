"use client";

import { X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { LandingButton } from "@/components/landing/ui";
import type { LandingLocale } from "@/lib/landing-copy";
import { landingCopy } from "@/lib/landing-copy";

type DemoFormModalProps = {
  open: boolean;
  locale: LandingLocale;
  onClose: () => void;
};

export function DemoFormModal({ open, locale, onClose }: DemoFormModalProps) {
  const copy = landingCopy[locale].form;
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const endpoint = process.env.NEXT_PUBLIC_DEMO_FORM_ENDPOINT;

    try {
      if (endpoint) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Demo request failed");
      } else {
        openMailFallback(data);
      }
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
    }
  };

  const openMailFallback = (data: Record<string, FormDataEntryValue>) => {
      const subject = encodeURIComponent("Solicitud de demo Educore");
      const body = encodeURIComponent(Object.entries(data).map(([key, value]) => `${key}: ${value}`).join("\n"));
      window.location.href = `mailto:contacto@onlineu.mx?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="demo-form-title">
      <div className="w-full max-w-xl rounded-lg border border-white/40 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="demo-form-title" className="font-display text-2xl font-extrabold text-[#0F172A]">{copy.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">{copy.subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-[#64748B] hover:bg-[#F1F5F9]" aria-label="Cerrar formulario">
            <X className="h-5 w-5" />
          </button>
        </div>

        {status === "sent" ? (
          <div className="rounded-lg bg-[#D1FAE5] p-5 text-sm font-semibold text-emerald-800">{copy.success}</div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            {[
              ["name", copy.name, "text"],
              ["email", copy.email, "email"],
              ["school", copy.school, "text"],
              ["role", copy.role, "text"],
              ["students", copy.students, "number"],
            ].map(([name, label, type]) => (
              <label key={name} className="space-y-2 text-sm font-semibold text-[#334155]">
                <span>{label}</span>
                <input required name={name} type={type} className="h-11 w-full rounded-[10px] border border-[#E2E8F0] px-3 text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]" />
              </label>
            ))}
            <label className="space-y-2 text-sm font-semibold text-[#334155] sm:col-span-2">
              <span>{copy.message}</span>
              <textarea name="message" rows={4} className="w-full rounded-[10px] border border-[#E2E8F0] px-3 py-3 text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]" />
            </label>
            {status === "error" && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 sm:col-span-2">
                No pudimos enviar la solicitud. Intenta de nuevo o escribe a contacto@onlineu.mx.
              </p>
            )}
            <LandingButton type="submit" disabled={status === "sending"} className="sm:col-span-2">
              {status === "sending" ? "Enviando..." : copy.send}
            </LandingButton>
          </form>
        )}
      </div>
    </div>
  );
}
