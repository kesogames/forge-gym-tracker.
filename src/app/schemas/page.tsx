"use client";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Archive, ArchiveRestore, ClipboardList, Copy, MoreVertical, Pencil, Play, Plus, Sparkles, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db/db";
import { deleteTemplate, duplicateTemplate, getTemplateFull, saveTemplateFull, setTemplateFlags, startSession, uid, type TemplateFull } from "@/lib/db/repo";
import { exampleTemplates } from "@/lib/data/templates";
import { useExerciseMap } from "@/lib/hooks";
import { Button, Card, Chip, Confirm, cx, EmptyState, IconButton, Pill, Sheet } from "@/components/ui";
import { ExerciseImage } from "@/components/ExerciseImage";
import { toast } from "@/components/toast";

export default function SchemasPage() {
  const [showArchived, setShowArchived] = useState(false);
  const templates = useLiveQuery(async () => {
    const ts = await db().templates.toArray();
    const out: TemplateFull[] = [];
    for (const t of ts) {
      const f = await getTemplateFull(t.id);
      if (f) out.push(f);
    }
    return out.sort((a, b) => Number(b.template.favorite) - Number(a.template.favorite) || b.template.updated_at.localeCompare(a.template.updated_at));
  }, []);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const list = templates?.filter((t) => t.template.archived === showArchived) ?? [];
  const archivedCount = templates?.filter((t) => t.template.archived).length ?? 0;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schema&apos;s</h1>
          <p className="text-muted mt-1">Je trainingsplannen. Wijzigen raakt je historie nooit.</p>
        </div>
        <Link href="/schemas/bewerken" className="shrink-0">
          <Button variant="primary" data-testid="new-template"><Plus className="size-4" /> Nieuw</Button>
        </Link>
      </header>

      {(archivedCount > 0 || showArchived) && (
        <div className="flex gap-2">
          <Chip active={!showArchived} onClick={() => setShowArchived(false)}>Actief</Chip>
          <Chip active={showArchived} onClick={() => setShowArchived(true)}>Gearchiveerd ({archivedCount})</Chip>
        </div>
      )}

      {templates && list.length === 0 && !showArchived && (
        <Card>
          <EmptyState
            icon={<ClipboardList className="size-7" />}
            title="Maak je eerste schema"
            body="Bouw zelf een schema of begin met een beproefd voorbeeld dat je daarna helemaal kunt aanpassen."
            action={
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="primary" onClick={() => setExamplesOpen(true)}><Sparkles className="size-4" /> Voorbeeld kiezen</Button>
                <Link href="/schemas/bewerken"><Button variant="secondary" block>Zelf bouwen</Button></Link>
              </div>
            }
          />
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((t) => <TemplateCard key={t.template.id} t={t} />)}
      </div>

      {templates && templates.length > 0 && !showArchived && (
        <button onClick={() => setExamplesOpen(true)} className="w-full rounded-3xl border border-dashed border-line-strong p-4 text-sm font-semibold text-muted hover:text-ink">
          <Sparkles className="size-4 inline -mt-0.5 mr-1" /> Voorbeeldschema toevoegen
        </button>
      )}

      <ExamplesSheet open={examplesOpen} onOpenChange={setExamplesOpen} />
    </div>
  );
}

function TemplateCard({ t }: { t: TemplateFull }) {
  const map = useExerciseMap();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [del, setDel] = useState(false);
  const images = t.days.flatMap((d) => d.exercises).slice(0, 4).map((e) => map.get(e.exercise_id)).filter(Boolean);
  return (
    <Card className="p-5 flex flex-col" data-testid="template-card">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xl tracking-tight truncate">{t.template.name}</h3>
            <button aria-label={t.template.favorite ? "Verwijder uit favorieten" : "Markeer als favoriet"} onClick={() => setTemplateFlags(t.template.id, { favorite: !t.template.favorite })}>
              <Star className={cx("size-5", t.template.favorite ? "fill-accent-text text-accent-text" : "text-muted")} />
            </button>
          </div>
          {t.template.description && <p className="text-sm text-muted mt-1 line-clamp-2">{t.template.description}</p>}
        </div>
        <IconButton label="Schema-opties" size="sm" onClick={() => setMenu(true)}><MoreVertical className="size-5" /></IconButton>
      </div>
      <div className="flex -space-x-2 mt-4">
        {images.map((e) => <ExerciseImage key={e!.id} image={e!.image} name={e!.name} className="size-10 rounded-xl ring-2 ring-surface" />)}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-4">
        {t.days.map((d) => <Pill key={d.id}>{d.name} · {d.exercises.length}</Pill>)}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-line">
        <Link href={`/schemas/bewerken?id=${t.template.id}`}><Button block variant="secondary"><Pencil className="size-4" /> Bewerken</Button></Link>
        <Button
          variant="primary"
          disabled={!t.days[0]?.exercises.length || t.template.archived}
          onClick={async () => {
            if (t.days.length === 1) await startSession({ kind: "template", templateId: t.template.id, dayId: t.days[0].id });
            router.push("/training");
          }}
        >
          <Play className="size-4 fill-current" /> {t.days.length > 1 ? "Kies dag" : "Start"}
        </Button>
      </div>
      <Sheet open={menu} onOpenChange={setMenu} title={t.template.name}>
        <div className="grid gap-1.5">
          <MenuBtn icon={Copy} label="Dupliceren" onClick={async () => { await duplicateTemplate(t.template.id); toast("Schema gedupliceerd", "success"); setMenu(false); }} />
          <MenuBtn icon={t.template.archived ? ArchiveRestore : Archive} label={t.template.archived ? "Terugzetten" : "Archiveren"} onClick={async () => { await setTemplateFlags(t.template.id, { archived: !t.template.archived }); setMenu(false); }} />
          <MenuBtn icon={Trash2} label="Verwijderen" danger onClick={() => { setMenu(false); setDel(true); }} />
        </div>
      </Sheet>
      <Confirm open={del} onOpenChange={setDel} title="Schema verwijderen?" body="Het schema verdwijnt. Trainingen die je ermee hebt gedaan blijven gewoon in je historie staan." confirmLabel="Verwijderen" danger onConfirm={() => deleteTemplate(t.template.id)} />
    </Card>
  );
}

function MenuBtn({ icon: Icon, label, onClick, danger }: { icon: typeof Copy; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cx("flex items-center gap-3 h-13 px-4 rounded-2xl text-[15px] font-semibold", danger ? "bg-danger/8 text-danger" : "bg-surface-2")}>
      <Icon className="size-5" /> {label}
    </button>
  );
}

function ExamplesSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const examples = exampleTemplates(() => "preview");
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Voorbeeldschema's" description="Volledig aan te passen na toevoegen.">
      <div className="space-y-3">
        {examples.map((ex, i) => (
          <Card key={ex.template.name} className="p-4">
            <div className="font-bold text-lg">{ex.template.name}</div>
            <p className="text-sm text-muted mt-1">{ex.template.description}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">{ex.days.map((d) => <Pill key={d.name}>{d.name} · {d.exercises.length}</Pill>)}</div>
            <Button
              className="mt-4"
              variant="primary"
              block
              onClick={async () => {
                await saveTemplateFull(exampleTemplates(uid)[i]);
                toast(`${ex.template.name} toegevoegd`, "success");
                onOpenChange(false);
              }}
            >
              <Plus className="size-4" /> Toevoegen
            </Button>
          </Card>
        ))}
      </div>
    </Sheet>
  );
}
