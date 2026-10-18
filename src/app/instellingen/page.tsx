"use client";
import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Cloud, Download, LogOut, Moon, RefreshCw, Sun, Upload, Monitor, Trash2 } from "lucide-react";
import { db } from "@/lib/db/db";
import { exportCSV, exportJSON, importJSON, updateSettings, wipeLocalData } from "@/lib/db/repo";
import { useSettings } from "@/lib/hooks";
import { useStatus } from "@/lib/db/status";
import { signOut, supabase, syncConfigured, syncNow } from "@/lib/sync/engine";
import { COUNT_METHOD_LABEL } from "@/lib/domain/volume";
import { Button, Card, Confirm, cx, Field, inputCls, SectionTitle, Segmented, Stepper, Toggle } from "@/components/ui";
import { SaveIndicator } from "@/components/SaveIndicator";
import { toast, errorMessage } from "@/components/toast";
import type { Session } from "@supabase/supabase-js";

function download(name: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function SettingsPage() {
  const s = useSettings();
  const [name, setName] = useState(s.display_name);
  const [wipe, setWipe] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => setName(s.display_name), [s.display_name]);
  const counts = useLiveQuery(async () => ({ sessions: await db().workout_sessions.count(), sets: await db().workout_sets.count(), templates: await db().templates.count() }), [], { sessions: 0, sets: 0, templates: 0 });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="pt-2">
        <h1 className="text-3xl font-bold tracking-tight">Instellingen</h1>
        <div className="mt-1"><SaveIndicator /></div>
      </header>

      <section>
        <SectionTitle>Profiel</SectionTitle>
        <Card className="p-4 space-y-4">
          <Field label="Je naam (voor de begroeting)">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== s.display_name && updateSettings({ display_name: name.trim() })} placeholder="Bijv. Sam" />
          </Field>
          <div>
            <div className="text-sm font-medium text-ink-2 mb-1.5">Thema</div>
            <Segmented value={s.theme} onChange={(v) => updateSettings({ theme: v })} options={[{ value: "dark", label: <span className="inline-flex items-center gap-1.5"><Moon className="size-4" />Donker</span> }, { value: "light", label: <span className="inline-flex items-center gap-1.5"><Sun className="size-4" />Licht</span> }, { value: "system", label: <span className="inline-flex items-center gap-1.5"><Monitor className="size-4" />Systeem</span> }]} />
          </div>
          <div>
            <div className="text-sm font-medium text-ink-2 mb-1.5">Gewichtseenheid</div>
            <Segmented value={s.unit} onChange={(v) => updateSettings({ unit: v })} options={[{ value: "kg", label: "Kilogram (kg)" }, { value: "lb", label: "Pound (lb)" }]} />
            <p className="text-xs text-muted mt-1.5">Intern wordt alles in kg opgeslagen; lb is alleen weergave en invoer.</p>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>Training</SectionTitle>
        <Card className="p-4 divide-y divide-line">
          <div className="flex items-center justify-between gap-4 pb-3">
            <div><div className="text-[15px] font-medium">Weekdoel</div><div className="text-sm text-muted">Aantal trainingen per week</div></div>
            <Stepper label="Weekdoel" value={s.weekly_workout_goal} min={1} max={14} onChange={(v) => updateSettings({ weekly_workout_goal: v })} />
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <div><div className="text-[15px] font-medium">Standaard rusttijd</div><div className="text-sm text-muted">Voor oefeningen zonder eigen rusttijd</div></div>
            <Stepper label="Rusttijd" value={s.default_rest} step={15} max={600} suffix="s" onChange={(v) => updateSettings({ default_rest: v })} />
          </div>
          <Toggle checked={s.auto_start_rest} onChange={(v) => updateSettings({ auto_start_rest: v })} label="Rusttimer automatisch starten" description="Na het afvinken van een set." />
          <Toggle checked={s.rest_sound} onChange={(v) => updateSettings({ rest_sound: v })} label="Geluid en trilling" description="Als de rust voorbij is." />
          <Toggle
            checked={s.rest_notifications}
            onChange={async (v) => {
              if (v && "Notification" in window && Notification.permission === "default") {
                const p = await Notification.requestPermission();
                if (p !== "granted") toast("Meldingen zijn niet toegestaan in je browser", "error");
              }
              await updateSettings({ rest_notifications: v });
            }}
            label="Melding als de rust voorbij is"
            description="Werkt als de app open is of net op de achtergrond staat. Op iOS alleen als geïnstalleerde app (iOS 16.4+)."
          />
        </Card>
      </section>

      <section>
        <SectionTitle>Berekeningen</SectionTitle>
        <Card className="p-4 space-y-4">
          <div>
            <div className="text-sm font-medium text-ink-2 mb-1.5">Settelling per spiergroep</div>
            <Segmented value={s.set_count_method} onChange={(v) => updateSettings({ set_count_method: v })} options={[{ value: "primary", label: "Primair" }, { value: "weighted", label: "Gewogen" }]} />
            <p className="text-xs text-muted mt-1.5">{COUNT_METHOD_LABEL[s.set_count_method]}.</p>
          </div>
          <Toggle checked={s.include_bodyweight_volume} onChange={(v) => updateSettings({ include_bodyweight_volume: v })} label="Lichaamsgewicht meetellen in volume" description="Gebruikt je laatst gemeten lichaamsgewicht (Progressie → Lichaamsgewicht)." />
          <div className="rounded-2xl bg-surface-2 p-3 text-xs text-ink-2 leading-relaxed space-y-1">
            <p><b>Volume</b> = gewicht × herhalingen, alleen voltooide werksets. Warming-up telt niet mee. Tijd en afstand worden apart bijgehouden.</p>
            <p><b>Lichaamsgewicht-oefeningen:</b> {s.include_bodyweight_volume ? "(lichaamsgewicht + extra gewicht) × reps." : "alleen extra gewicht × reps; reps worden altijd geteld."}</p>
            <p><b>Assisted:</b> {s.include_bodyweight_volume ? "(lichaamsgewicht − ondersteuning) × reps." : "telt niet mee in kg-volume, wel in sets en reps."}</p>
            <p><b>Eenzijdig:</b> gewicht en reps per kant, één keer geteld (niet verdubbeld).</p>
            <p><b>Geschatte 1RM:</b> Epley, gewicht × (1 + reps/30), alleen sets t/m 12 reps. Altijd een schatting.</p>
          </div>
        </Card>
      </section>

      <AccountSection />

      <section>
        <SectionTitle>Gegevens</SectionTitle>
        <Card className="p-4 space-y-3">
          <p className="text-sm text-muted">{counts.sessions} trainingen · {counts.sets} sets · {counts.templates} schema&apos;s op dit apparaat.</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <Button onClick={async () => download(`forge-sets-${today}.csv`, await exportCSV(), "text/csv;charset=utf-8")}><Download className="size-4" /> Export CSV</Button>
            <Button onClick={async () => download(`forge-backup-${today}.json`, await exportJSON(), "application/json")}><Download className="size-4" /> Export JSON (back-up)</Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="size-4" /> Back-up importeren</Button>
            <Button variant="danger" onClick={() => setWipe(true)}><Trash2 className="size-4" /> Lokale gegevens wissen</Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const n = await importJSON(await f.text());
                toast(`${n} items geïmporteerd`, "success");
              } catch (err) {
                toast(`Import mislukt: ${errorMessage(err)}`, "error");
              }
              e.target.value = "";
            }}
          />
        </Card>
      </section>

      <section className="text-xs text-muted space-y-1 pb-4">
        <p>Forge slaat je gegevens eerst op dit apparaat op (IndexedDB), zodat alles offline werkt en een actieve training nooit verloren gaat.</p>
        <p>Oefeningafbeeldingen: <a className="underline" href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noreferrer">free-exercise-db</a>, Unlicense (publiek domein).</p>
      </section>

      <Confirm open={wipe} onOpenChange={setWipe} title="Alle lokale gegevens wissen?" body="Alle trainingen, schema's en instellingen op dit apparaat worden verwijderd. Maak eerst een JSON-back-up. Gegevens in de cloud (als je ingelogd bent) blijven bestaan." confirmLabel="Alles wissen" danger onConfirm={async () => { await wipeLocalData(); toast("Lokale gegevens gewist", "success"); }} />
    </div>
  );
}

function AccountSection() {
  const status = useStatus();
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const sb = supabase();

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [sb]);

  if (!syncConfigured || !sb) {
    return (
      <section>
        <SectionTitle>Account &amp; sync</SectionTitle>
        <Card className="p-4 text-sm text-ink-2 space-y-2">
          <p className="flex items-center gap-2 font-semibold"><Cloud className="size-4" /> Cloud-sync is niet geconfigureerd</p>
          <p className="text-muted">Je gegevens staan veilig op dit apparaat. Wil je syncen tussen apparaten? Vul <code>NEXT_PUBLIC_SUPABASE_URL</code> en <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in (zie README). Tot die tijd: gebruik de JSON-back-up hieronder.</p>
        </Card>
      </section>
    );
  }

  const submit = async () => {
    setBusy(true);
    try {
      const r = mode === "login" ? await sb.auth.signInWithPassword({ email, password }) : await sb.auth.signUp({ email, password });
      if (r.error) throw r.error;
      if (mode === "signup" && !r.data.session) toast("Check je e-mail om je account te bevestigen", "success", 5000);
      else toast("Ingelogd. Je gegevens worden gesynchroniseerd.", "success");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <SectionTitle>Account &amp; sync</SectionTitle>
      <Card className="p-4 space-y-4">
        {session ? (
          <>
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-accent-soft text-accent-text"><Cloud className="size-5" /></span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{session.user.email}</div>
                <SaveIndicator />
              </div>
            </div>
            {status.sync === "error" && status.lastError && <p className="text-xs text-warn">Laatste fout: {status.lastError}</p>}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => syncNow()} disabled={status.sync === "syncing"}><RefreshCw className={cx("size-4", status.sync === "syncing" && "animate-spin")} /> Nu syncen</Button>
              <Button variant="outline" onClick={async () => { const wipe = confirm("Lokale gegevens van dit apparaat wissen bij uitloggen? (Aanbevolen op een gedeeld apparaat.)"); await signOut(wipe); }}><LogOut className="size-4" /> Uitloggen</Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">Log in om je trainingen veilig in de cloud te bewaren en te syncen tussen apparaten. Bestaande gegevens op dit apparaat worden meegenomen.</p>
            <Segmented value={mode} onChange={setMode} options={[{ value: "login", label: "Inloggen" }, { value: "signup", label: "Account maken" }]} />
            <Field label="E-mail"><input className={inputCls} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label="Wachtwoord"><input className={inputCls} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
            <Button variant="primary" size="lg" block onClick={submit} disabled={busy || !email || password.length < 6}>{mode === "login" ? "Inloggen" : "Account maken"}</Button>
          </>
        )}
      </Card>
    </section>
  );
}
