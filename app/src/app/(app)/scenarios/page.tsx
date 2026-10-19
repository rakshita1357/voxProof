import Link from "next/link";
import { Submit } from "@/components/client";
import { Card, Chip, Empty, PageHeader, SeverityChip, Table, btnPrimary, btnSecondary, td } from "@/components/ui";
import { duplicateScenario, savePersona } from "@/lib/actions";
import { readPage } from "@/lib/db";
import type { Persona } from "@/lib/types";

export default async function ScenariosPage({ searchParams }: PageProps<"/scenarios">) {
  const sp = await searchParams;
  const q = String(sp.q ?? "").toLowerCase();
  const category = String(sp.category ?? "");
  const db = await readPage();
  const categories = [...new Set(db.scenarios.map((s) => s.category))].sort();
  const scenarios = db.scenarios.filter(
    (s) => (!category || s.category === category) && (!q || `${s.title} ${s.goal}`.toLowerCase().includes(q)),
  );

  return (
    <>
      <PageHeader title="Scenarios" actions={<Link href="/scenarios/new" className={btnPrimary}>New scenario</Link>}>
        Each run combines scenarios × personas × samples into test calls.
      </PageHeader>

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="Search scenarios" aria-label="Search scenarios" className="input max-w-xs" />
        <select name="category" defaultValue={category} aria-label="Category" className="input w-auto">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button className={btnSecondary}>Filter</button>
      </form>

      {scenarios.length ? (
        <Table head={["Scenario", "Category", "Severity", "Checks", "Version", ""]}>
          {scenarios.map((s) => (
            <tr key={s.id}>
              <td className={td}>
                <Link href={`/scenarios/${s.id}`} className="font-medium hover:text-accent">{s.title}</Link>
                <div className="mt-0.5 line-clamp-2 text-xs text-muted">{s.goal}</div>
              </td>
              <td className={td}><Chip value={s.category} /></td>
              <td className={td}><SeverityChip s={s.severity} /></td>
              <td className={`${td} text-xs text-muted`}>
                {s.requiredPhrases.length} required · {s.prohibitedPhrases.length} prohibited
                {s.expectedDispositions.length ? ` · ${s.expectedDispositions.join("/")}` : ""}
              </td>
              <td className={`${td} text-xs`}>v{s.version}</td>
              <td className={td}>
                <form action={duplicateScenario.bind(null, s.id)}>
                  <Submit className={btnSecondary}>Duplicate</Submit>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty title="No scenarios match">Try a different search or category.</Empty>
      )}

      <h2 className="mb-3 mt-10 text-base font-semibold">Personas</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {db.personas.map((p) => (
          <PersonaCard key={p.id} p={p} />
        ))}
        <Card title="Add persona">
          <PersonaFields />
        </Card>
      </div>
    </>
  );
}

function PersonaCard({ p }: { p: Persona }) {
  return (
    <Card title={p.name} actions={<span className="text-xs text-muted">{p.language}{p.enabled ? "" : " · disabled"}</span>}>
      <p className="text-sm">{p.behavior}</p>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-muted">Edit</summary>
        <div className="mt-3"><PersonaFields p={p} /></div>
      </details>
    </Card>
  );
}

function PersonaFields({ p }: { p?: Persona }) {
  return (
    <form action={savePersona.bind(null, p?.id ?? null)} className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <input name="name" required defaultValue={p?.name} placeholder="Name" aria-label="Persona name" className="input col-span-2" />
        <input name="language" required defaultValue={p?.language ?? "en-IN"} aria-label="Language" className="input" />
      </div>
      <input name="behavior" required defaultValue={p?.behavior} placeholder="Caller behaviour" aria-label="Caller behaviour" className="input" />
      <textarea name="instructions" rows={2} defaultValue={p?.instructions} placeholder="Instructions for the tester" aria-label="Instructions" className="input" />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={p?.enabled ?? true} /> Enabled
        </label>
        <Submit className={btnSecondary}>{p ? "Save" : "Add"}</Submit>
      </div>
    </form>
  );
}
