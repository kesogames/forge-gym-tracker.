"use client";
import * as Dialog from "@radix-ui/react-dialog";
import clsx from "clsx";
import { Minus, Plus, X } from "lucide-react";
import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

export const cx = clsx;

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "xl";

const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-105 active:brightness-95 shadow-[0_0_0_1px_rgba(0,0,0,0.04)]",
  secondary: "bg-surface-2 text-ink hover:bg-surface-3",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  outline: "border border-line-strong text-ink hover:bg-surface-2",
  danger: "bg-danger/12 text-danger hover:bg-danger/20",
};
const SIZE: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-xl",
  md: "h-11 px-4 text-[15px] gap-2 rounded-2xl",
  lg: "h-13 px-5 text-base gap-2 rounded-2xl",
  xl: "h-15 px-6 text-lg gap-2.5 rounded-[20px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; block?: boolean }>(
  function Button({ variant = "secondary", size = "md", block, className, ...p }, ref) {
    return (
      <button
        ref={ref}
        {...p}
        className={cx(
          "inline-flex items-center justify-center font-semibold transition-[background,filter,transform] duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none select-none whitespace-nowrap",
          VARIANT[variant],
          SIZE[size],
          block && "w-full",
          className,
        )}
      />
    );
  },
);

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: Variant; size?: "sm" | "md" | "lg" }>(
  function IconButton({ label, variant = "ghost", size = "md", className, children, ...p }, ref) {
    const s = size === "sm" ? "size-9 rounded-xl" : size === "lg" ? "size-13 rounded-2xl" : "size-11 rounded-2xl";
    return (
      <button ref={ref} aria-label={label} title={label} {...p} className={cx("inline-flex items-center justify-center transition active:scale-95 disabled:opacity-40 shrink-0", VARIANT[variant], s, className)}>
        {children}
      </button>
    );
  },
);

export function Card({ className, children, as: As = "div", ...p }: { className?: string; children: ReactNode; as?: "div" | "section" | "article" } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <As {...p} className={cx("rounded-3xl bg-surface border border-line shadow-card", className)}>
      {children}
    </As>
  );
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex items-center justify-between gap-3 mb-3", className)}>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function Chip({ active, children, onClick, className, ...p }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      {...p}
      className={cx(
        "h-9 px-3.5 rounded-full text-sm font-medium whitespace-nowrap transition border shrink-0",
        active ? "bg-ink text-bg border-transparent" : "bg-surface border-line text-ink-2 hover:text-ink hover:border-line-strong",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Pill({ children, tone = "default", className }: { children: ReactNode; tone?: "default" | "accent" | "warn" | "danger" | "info"; className?: string }) {
  const t = {
    default: "bg-surface-2 text-ink-2",
    accent: "bg-accent-soft text-accent-text",
    warn: "bg-warn/15 text-warn",
    danger: "bg-danger/15 text-danger",
    info: "bg-info/15 text-info",
  }[tone];
  return <span className={cx("inline-flex items-center gap-1 h-6 px-2 rounded-full text-xs font-semibold whitespace-nowrap", t, className)}>{children}</span>;
}

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg" | "full";
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-[rise_200ms_ease-out]" />
        <Dialog.Content
          className={cx(
            "fixed z-50 flex flex-col bg-surface border border-line shadow-2xl outline-none",
            "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[28px] pb-safe animate-rise",
            "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px] sm:max-h-[86dvh] sm:pb-0",
            size === "md" && "sm:w-[520px]",
            size === "lg" && "sm:w-[720px]",
            size === "full" && "sm:w-[900px] h-[92dvh] sm:h-[86dvh]",
          )}
        >
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-surface-3 sm:hidden" />
          <div className="flex items-start justify-between gap-3 px-5 pt-3 sm:pt-5 pb-3">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-bold tracking-tight">{title}</Dialog.Title>
              {description ? <Dialog.Description className="text-sm text-muted mt-0.5">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{typeof title === "string" ? title : "Venster"}</Dialog.Description>}
            </div>
            <Dialog.Close asChild>
              <IconButton label="Sluiten" size="sm" variant="secondary">
                <X className="size-4" />
              </IconButton>
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
          {footer && <div className="border-t border-line px-5 py-3.5 flex gap-2">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Confirm({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={
        <>
          <Button variant="secondary" block onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            block
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-ink-2 text-[15px] leading-relaxed">{body}</div>
    </Sheet>
  );
}

/** Numeriek invoerveld met numeriek toetsenbord; commit bij blur/enter. */
export function NumField({
  value,
  onCommit,
  placeholder,
  decimal = true,
  className,
  label,
  min = 0,
  max = 100000,
  disabled,
  ...rest
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
  placeholder?: string;
  decimal?: boolean;
  className?: string;
  label: string;
  min?: number;
  max?: number;
  disabled?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [text, setText] = useState(value == null ? "" : fmt(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(value == null ? "" : fmt(value));
  }, [value]);
  const commit = () => {
    const t = text.replace(",", ".").trim();
    if (t === "") return value !== null && onCommit(null);
    let n = Number(t);
    if (!Number.isFinite(n)) return setText(value == null ? "" : fmt(value));
    n = Math.min(max, Math.max(min, decimal ? Math.round(n * 100) / 100 : Math.round(n)));
    setText(fmt(n));
    if (n !== value) onCommit(n);
  };
  return (
    <input
      {...rest}
      aria-label={label}
      disabled={disabled}
      inputMode={decimal ? "decimal" : "numeric"}
      pattern={decimal ? "[0-9]*[.,]?[0-9]*" : "[0-9]*"}
      enterKeyHint="done"
      autoComplete="off"
      value={text}
      placeholder={placeholder}
      onFocus={(e) => {
        focused.current = true;
        e.currentTarget.select();
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        focused.current = false;
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
      }}
      className={cx("num w-full bg-transparent text-center outline-none placeholder:text-muted/50 disabled:opacity-60", className)}
    />
  );
}

function fmt(n: number) {
  return String(Math.round(n * 100) / 100).replace(".", ",");
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 999, label, suffix }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; label: string; suffix?: string }) {
  return (
    <div className="flex items-center gap-1 rounded-2xl bg-surface-2 p-1">
      <IconButton label={`${label} verlagen`} size="sm" onClick={() => onChange(Math.max(min, value - step))}>
        <Minus className="size-4" />
      </IconButton>
      <div className="num min-w-12 text-center text-lg font-semibold">
        {value}
        {suffix && <span className="text-muted text-sm ml-0.5">{suffix}</span>}
      </div>
      <IconButton label={`${label} verhogen`} size="sm" onClick={() => onChange(Math.min(max, value + step))}>
        <Plus className="size-4" />
      </IconButton>
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex items-center justify-between gap-4 py-3 cursor-pointer">
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        {description && <span className="block text-sm text-muted mt-0.5">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cx("relative h-7 w-12 rounded-full transition shrink-0", checked ? "bg-accent" : "bg-surface-3")}
      >
        <span className={cx("absolute top-1 size-5 rounded-full transition-all shadow", checked ? "left-6 bg-accent-ink" : "left-1 bg-white")} />
      </button>
    </label>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string }) {
  return (
    <div role="tablist" className={cx("inline-flex rounded-2xl bg-surface-2 p-1 gap-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx("h-9 px-3.5 rounded-xl text-sm font-semibold transition whitespace-nowrap flex-1", value === o.value ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-12">
      <div className="mb-4 grid size-16 place-items-center rounded-3xl bg-accent-soft text-accent-text">{icon}</div>
      <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[15px] text-muted leading-relaxed">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ProgressRing({ value, size = 64, stroke = 6, children, className }: { value: number; size?: number; stroke?: number; children?: ReactNode; className?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={cx("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function Bar({ value, className, tone = "accent" }: { value: number; className?: string; tone?: "accent" | "muted" | "warn" }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={cx("h-2 rounded-full bg-surface-3 overflow-hidden", className)}>
      <div className={cx("h-full rounded-full transition-[width] duration-700", tone === "accent" ? "bg-accent" : tone === "warn" ? "bg-warn" : "bg-muted")} style={{ width: `${v * 100}%` }} />
    </div>
  );
}

export function Delta({ value, unit = "", invert, className }: { value: number | null; unit?: string; invert?: boolean; className?: string }) {
  if (value === null || !Number.isFinite(value)) return <span className={cx("text-xs text-muted", className)}>–</span>;
  if (value === 0) return <span className={cx("text-xs font-semibold text-muted", className)}>= vorige</span>;
  const up = value > 0;
  const good = invert ? !up : up;
  return (
    <span className={cx("text-xs font-semibold tabular", good ? "text-accent-text" : "text-muted", className)}>
      {up ? "▲" : "▼"} {Math.abs(value).toLocaleString("nl-NL", { maximumFractionDigits: 1 })}
      {unit}
    </span>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-ink-2 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted mt-1">{hint}</span>}
    </label>
  );
}

export const inputCls = "w-full h-12 rounded-2xl bg-surface-2 border border-transparent px-4 text-[15px] outline-none focus:border-line-strong focus:bg-surface placeholder:text-muted/70 transition";
