import { useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Vendor = {
  id: string;
  name: string;
  service: string;
  region: string;
  dataLocation: string;
};

const REGIONS = ["Sverige", "Norden", "EU", "Storbritannien", "USA", "Övrigt"];
const DATA_LOCATIONS = ["EU", "USA", "Other"];

const RegistreraLeverantorer = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [name, setName] = useState("");
  const [service, setService] = useState("");
  const [region, setRegion] = useState("");
  const [dataLocation, setDataLocation] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Vendor | null>(null);

  const canAdd = name.trim() && service.trim() && region && dataLocation;

  const addVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAdd) return;
    setVendors((v) => [
      ...v,
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        service: service.trim(),
        region,
        dataLocation,
      },
    ]);
    setName("");
    setService("");
    setRegion("");
    setDataLocation("");
  };

  const removeVendor = (id: string) =>
    setVendors((v) => v.filter((x) => x.id !== id));

  const startEdit = (v: Vendor) => {
    setEditingId(v.id);
    setEditDraft({ ...v });
  };

  const saveEdit = () => {
    if (!editDraft) return;
    setVendors((vs) => vs.map((v) => (v.id === editDraft.id ? editDraft : v)));
    setEditingId(null);
    setEditDraft(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient depth — same vibe as landing */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full bg-blue-300/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/4 -right-40 h-[640px] w-[640px] rounded-full bg-blue-900/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-sky-400/20 blur-3xl" />

      {/* TOP BAR */}
      <header className="relative z-20 px-4 pt-4 md:px-8 md:pt-6">
        <nav className="glass-nav mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-5 py-3 md:px-7 md:py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-foreground/75 transition hover:bg-white/50 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Tillbaka
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-md bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70 md:inline-block">
              Verktyg
            </span>
            <span className="text-sm font-bold tracking-tight text-foreground">
              Registrera leverantörer
            </span>
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-10 md:px-8 md:pt-14">
        {/* INTRO */}
        <section className="mb-10 max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/60">
            Steg 1 av 2
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Registrera leverantörer
          </h1>
          <p className="mt-3 text-base font-medium leading-relaxed text-foreground/70">
            Lägg till dina leverantörer för att analysera risk och beroenden.
          </p>
        </section>

        <div className="grid grid-cols-12 gap-6 md:gap-8">
          {/* INPUT FORM */}
          <section className="col-span-12 lg:col-span-5">
            <div className="glass rounded-2xl p-6 shadow-[var(--shadow-soft)] md:p-7">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Ny leverantör
              </h2>
              <p className="mt-1 text-sm text-foreground/60">
                Fyll i uppgifterna nedan och lägg till i listan.
              </p>

              <form onSubmit={addVendor} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
                    Leverantörsnamn
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="t.ex. Acme AB"
                    maxLength={100}
                    className="bg-white/70"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="service" className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
                    Tjänst / produkt
                  </Label>
                  <Input
                    id="service"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    placeholder="t.ex. Molnlagring"
                    maxLength={120}
                    className="bg-white/70"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
                    Land / region
                  </Label>
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger className="bg-white/70">
                      <SelectValue placeholder="Välj region" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
                    Dataplats
                  </Label>
                  <Select value={dataLocation} onValueChange={setDataLocation}>
                    <SelectTrigger className="bg-white/70">
                      <SelectValue placeholder="Välj dataplats" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATA_LOCATIONS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={!canAdd}
                  className="mt-2 w-full rounded-xl py-6 font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95"
                  style={{ background: "var(--gradient-cta)" }}
                >
                  <Plus className="h-4 w-4" />
                  Lägg till leverantör
                </Button>
              </form>
            </div>
          </section>

          {/* VENDOR LIST */}
          <section className="col-span-12 lg:col-span-7">
            <div className="glass rounded-2xl p-6 shadow-[var(--shadow-soft)] md:p-7">
              <div className="mb-5 flex items-baseline justify-between">
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Dina leverantörer
                </h2>
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground/55">
                  {vendors.length} st
                </span>
              </div>

              {vendors.length === 0 ? (
                <div className="rounded-xl border border-dashed border-foreground/15 bg-white/40 p-10 text-center">
                  <p className="text-sm font-medium text-foreground/60">
                    Inga leverantörer tillagda ännu.
                  </p>
                  <p className="mt-1 text-xs text-foreground/45">
                    Börja med att fylla i formuläret till vänster.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-white/60 bg-white/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Namn</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Tjänst</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Region</TableHead>
                        <TableHead className="w-[110px] text-right text-xs font-bold uppercase tracking-wider">
                          Åtgärder
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendors.map((v) => {
                        const isEditing = editingId === v.id;
                        return (
                          <TableRow key={v.id}>
                            <TableCell className="font-semibold text-foreground">
                              {isEditing ? (
                                <Input
                                  value={editDraft?.name ?? ""}
                                  onChange={(e) =>
                                    setEditDraft((d) => d && { ...d, name: e.target.value })
                                  }
                                  className="h-8 bg-white"
                                />
                              ) : (
                                v.name
                              )}
                            </TableCell>
                            <TableCell className="text-foreground/75">
                              {isEditing ? (
                                <Input
                                  value={editDraft?.service ?? ""}
                                  onChange={(e) =>
                                    setEditDraft((d) => d && { ...d, service: e.target.value })
                                  }
                                  className="h-8 bg-white"
                                />
                              ) : (
                                v.service
                              )}
                            </TableCell>
                            <TableCell className="text-foreground/75">
                              {isEditing ? (
                                <Select
                                  value={editDraft?.region}
                                  onValueChange={(val) =>
                                    setEditDraft((d) => d && { ...d, region: val })
                                  }
                                >
                                  <SelectTrigger className="h-8 bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {REGIONS.map((r) => (
                                      <SelectItem key={r} value={r}>
                                        {r}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="inline-flex items-center gap-2">
                                  {v.region}
                                  <span className="rounded-md bg-foreground/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/60">
                                    {v.dataLocation}
                                  </span>
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex items-center gap-1">
                                {isEditing ? (
                                  <>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      onClick={saveEdit}
                                      className="h-8 w-8 text-primary hover:bg-primary/10"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      onClick={cancelEdit}
                                      className="h-8 w-8 text-foreground/60 hover:bg-foreground/5"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => startEdit(v)}
                                      className="h-8 w-8 text-foreground/70 hover:bg-foreground/5"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => removeVendor(v.id)}
                                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="mt-6 flex justify-end">
              <Button
                size="lg"
                disabled={vendors.length === 0}
                className="group rounded-xl px-7 py-6 text-base font-bold text-white shadow-[var(--shadow-glow)] hover:opacity-95"
                style={{ background: "var(--gradient-cta)" }}
              >
                Starta analys
                <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-1" />
              </Button>
            </div>
          </section>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/40 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-xs font-medium text-foreground/60 md:px-10">
          <span>© 2026 Lumen Analytics AB</span>
          <span>Verktyg • Leverantörsregister</span>
        </div>
      </footer>
    </div>
  );
};

export default RegistreraLeverantorer;
