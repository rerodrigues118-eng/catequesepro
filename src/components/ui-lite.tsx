import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/* ---------- Card ---------- */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("bg-white rounded-[10px] p-5", className)}
      style={{ border: "1px solid var(--color-border)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
    >
      {children}
    </div>
  );
}

/* ---------- Button ---------- */
type BtnVariant = "primary" | "secondary" | "destructive" | "ghost";
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  fullWidth?: boolean;
}
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = "primary", fullWidth, className, children, ...props },
  ref,
) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[8px] px-[18px] py-2 text-sm font-medium transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<BtnVariant, string> = {
    primary: "text-white",
    secondary: "bg-white text-[#374151] border hover:bg-[#f8fafc]",
    destructive: "bg-white text-[#dc2626] border hover:bg-[#fee2e2]",
    ghost: "bg-transparent text-[#374151] hover:bg-[#f1f5f9]",
  };
  const style =
    variant === "primary"
      ? { backgroundColor: "var(--color-primary)" }
      : variant === "destructive"
      ? { borderColor: "#fca5a5" }
      : undefined;
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], fullWidth && "w-full", className)}
      style={style}
      onMouseOver={(e) => {
        if (variant === "primary") (e.currentTarget.style.backgroundColor = "var(--color-primary-hover)");
      }}
      onMouseOut={(e) => {
        if (variant === "primary") (e.currentTarget.style.backgroundColor = "var(--color-primary)");
      }}
      {...props}
    >
      {children}
    </button>
  );
});

/* ---------- Input ---------- */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full bg-white rounded-[8px] px-3 py-2 text-sm text-[#0f172a] placeholder:text-[#94a3b8] border focus:border-[var(--color-primary)]",
          className,
        )}
        style={invalid ? { borderColor: "#dc2626" } : undefined}
        {...props}
      />
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full bg-white rounded-[8px] px-3 py-2 text-sm text-[#0f172a] placeholder:text-[#94a3b8] border focus:border-[var(--color-primary)]",
          className,
        )}
        style={invalid ? { borderColor: "#dc2626" } : undefined}
        {...props}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ className, invalid, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "w-full bg-white rounded-[8px] px-3 py-2 text-sm text-[#0f172a] border focus:border-[var(--color-primary)]",
          className,
        )}
        style={invalid ? { borderColor: "#dc2626" } : undefined}
        {...props}
      >
        {children}
      </select>
    );
  },
);

/* ---------- Field wrapper ---------- */
export function Field({
  label,
  required,
  error,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[#374151] mb-1">
        {label}
        {required && <span className="text-[#dc2626] ml-0.5">*</span>}
      </span>
      {children}
      {hint && !error && <span className="block mt-1 text-xs text-[#64748b]">{hint}</span>}
      {error && <span className="block mt-1 text-xs text-[#dc2626]">{error}</span>}
    </label>
  );
}

/* ---------- Badge ---------- */
type BadgeTone = "verde" | "ambar" | "amarelo" | "azul" | "cinza";
export function Badge({ children, tone = "azul", className }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  const tones: Record<BadgeTone, { bg: string; fg: string }> = {
    verde: { bg: "#dcfce7", fg: "#15803d" },
    ambar: { bg: "#fef3c7", fg: "#d97706" },
    amarelo: { bg: "#fef3c7", fg: "#d97706" },
    azul: { bg: "#dbeafe", fg: "#1e40af" },
    cinza: { bg: "#f1f5f9", fg: "#64748b" },
  };
  const c = tones[tone] ?? tones.azul;
  return (
    <span
      className={cn("inline-flex items-center rounded-[6px] px-[10px] py-[2px] text-xs font-medium", className)}
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {children}
    </span>
  );
}

/* ---------- SectionLabel ---------- */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-[0.06em] text-[#64748b] mb-3">{children}</div>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ src, nome, size = 36 }: { src?: string; nome: string; size?: number }) {
  const initials = nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  if (src) {
    return (
      <img
        src={src}
        alt={nome}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-xs font-medium"
      style={{
        width: size,
        height: size,
        backgroundColor: "#dbeafe",
        color: "#1e40af",
      }}
    >
      {initials || "?"}
    </div>
  );
}

/* ---------- ConfirmDialog ---------- */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  onConfirm,
  onCancel,
  destructive,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(15,23,42,0.4)" }}>
      <div
        className="bg-white rounded-[10px] p-5 w-full max-w-md"
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}
      >
        <h3 className="text-base font-semibold text-[#0f172a]">{title}</h3>
        {description && <p className="mt-2 text-sm text-[#64748b]">{description}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant={destructive ? "destructive" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- EmptyState ---------- */
export function EmptyState({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="py-16 flex flex-col items-center text-center">
      <div className="mb-4" style={{ color: "#e2e8f0" }}>
        {icon}
      </div>
      <p className="text-sm font-medium text-[#374151]">{title}</p>
      {subtitle && <p className="mt-1 text-xs text-[#64748b]">{subtitle}</p>}
    </div>
  );
}

/* ---------- PageHeader ---------- */
export function PageHeader({
  title,
  subtitle,
  right,
  badge,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-[20px] font-semibold text-[#0f172a]">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="mt-1 text-sm text-[#64748b]">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}
