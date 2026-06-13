import { useEffect, useRef, useState } from "react";
import { geocode, type GeoResult } from "@/lib/geocode";
import { Input } from "@/components/ui/input";

type Props = {
  placeholder: string;
  value: string;
  onChange: (text: string) => void;
  onPick: (r: GeoResult) => void;
  accent?: "pickup" | "dropoff";
};

export function LocationSearch({
  placeholder,
  value,
  onChange,
  onPick,
  accent = "pickup",
}: Props) {
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Debounced geocode.
  useEffect(() => {
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      try {
        const r = await geocode(value, ac.signal);
        setResults(r);
        setOpen(true);
      } catch {
        // ignore aborts / network blips
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [value]);

  // Click outside closes the dropdown.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const dot = accent === "pickup" ? "bg-emerald-400" : "bg-red-400";

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2 rounded-md border border-border bg-secondary px-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder={placeholder}
          className="h-9 border-0 bg-transparent px-0 focus-visible:ring-0"
        />
        {loading && (
          <span className="text-xs text-muted-foreground">…</span>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 z-[1100] mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-popover shadow-2xl">
          {results.map((r, i) => (
            <button
              key={`${r.lat},${r.lng},${i}`}
              type="button"
              onClick={() => {
                onPick(r);
                setOpen(false);
              }}
              className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-accent"
              title={r.label}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
