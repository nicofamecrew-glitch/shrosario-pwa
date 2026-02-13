"use client";

import { useEffect, useMemo, useState } from "react";
import AgendaHeader, { AgendaView } from "@/components/agenda/AgendaHeader";
import MiniMonth from "@/components/agenda/MiniMonth";
import AgendaCarousel from "@/components/agenda/AgendaCarousel";
import WeekGrid from "@/components/agenda/WeekGrid";
import type { CalendarEvent } from "@/components/agenda/EventBlock";
import { connectDrive } from "@/components/agenda/driveAuth";
import { uploadAgendaJson, downloadAgendaJson } from "@/components/agenda/driveApi";

function isoLocal(y: number, m: number, d: number, hh: number, mm: number) {
  const dt = new Date(y, m, d, hh, mm, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(
    dt.getDate()
  )}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`;
}

// datetime-local necesita YYYY-MM-DDTHH:mm
const toLocalInput = (s: string) => (s ? String(s).slice(0, 16) : "");
const toIsoSeconds = (s: string) => (s ? `${s}:00` : "");

export default function AgendaClient() {
  // UI
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [view, setView] = useState<AgendaView>("week");

  // Drive
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [driveBusy, setDriveBusy] = useState(false);

  // App
  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Modal Nuevo
  const [openNew, setOpenNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newStatus, setNewStatus] = useState<"confirmado" | "pendiente" | "cancelado">("pendiente");
  const [newStart, setNewStart] = useState(""); // datetime-local string
  const [newEnd, setNewEnd] = useState("");

  // Modal Editar
  const [openEdit, setOpenEdit] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editStatus, setEditStatus] = useState<"confirmado" | "pendiente" | "cancelado">("pendiente");
  const [editStart, setEditStart] = useState(""); // datetime-local string
  const [editEnd, setEditEnd] = useState("");

  useEffect(() => setMounted(true), []);

  // Autosave helper (si hay Drive)
  async function saveToDrive(nextEvents: CalendarEvent[]) {
    if (!driveToken) return;
    try {
      await uploadAgendaJson(driveToken, {
        version: 1,
        updatedAt: new Date().toISOString(),
        events: nextEvents,
      });
    } catch (e) {
      console.error("Error autosave Drive", e);
    }
  }

  // Cargar desde Drive cuando conectás
  useEffect(() => {
    if (!driveToken) return;

    (async () => {
      try {
        const data = await downloadAgendaJson(driveToken);
        if (data?.events) setEvents(data.events);
      } catch (e) {
        console.error("Error cargando agenda desde Drive", e);
      }
    })();
  }, [driveToken]);

  // Mock inicial solo si no hay nada (y ya montó)
  useEffect(() => {
    if (!mounted) return;
    if (events.length > 0) return;

    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();

    setEvents([
      {
        id: "e1",
        title: "Corte + Color",
        client: "Ana",
        start: isoLocal(y, m, 9, 10, 0),
        end: isoLocal(y, m, 9, 11, 30),
        status: "confirmado",
      } as any,
      {
        id: "e2",
        title: "Alisado",
        client: "Mica",
        start: isoLocal(y, m, 9, 11, 0),
        end: isoLocal(y, m, 9, 13, 0),
        status: "pendiente",
      } as any,
      {
        id: "e3",
        title: "Corte",
        client: "Sofi",
        start: isoLocal(y, m, 10, 15, 0),
        end: isoLocal(y, m, 10, 15, 45),
        status: "confirmado",
      } as any,
      {
        id: "e4",
        title: "Color",
        client: "Pau",
        start: isoLocal(y, m, 11, 9, 30),
        end: isoLocal(y, m, 11, 10, 30),
        status: "cancelado",
      } as any,
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Loader inicial
  if (!mounted) {
    return (
      <div className="min-h-[100svh] bg-[#0b0b0b] text-white p-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          Cargando agenda…
        </div>
      </div>
    );
  }

  // Abrir modal nuevo con fecha del día
  function openNewTurno() {
    const d = new Date(currentDate);
    const pad = (n: number) => String(n).padStart(2, "0");
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());

    setNewStart(`${y}-${m}-${day}T09:00`);
    setNewEnd(`${y}-${m}-${day}T09:30`);
    setNewTitle("");
    setNewClient("");
    setNewStatus("pendiente");
    setOpenNew(true);
  }

  // Click evento -> abrir editor
  function openEditTurno(ev: CalendarEvent) {
    setEditingEvent(ev);
    setEditTitle((ev as any).title ?? "");
    setEditClient((ev as any).client ?? "");
    setEditStatus(((ev as any).status ?? "pendiente") as any);
    setEditStart(toLocalInput((ev as any).start ?? ""));
    setEditEnd(toLocalInput((ev as any).end ?? ""));
    setOpenEdit(true);
  }

  // Guardar nuevo
  async function handleCreate() {
    if (!newStart || !newEnd) return;

    const id = `e_${Date.now()}`;
    const next: CalendarEvent[] = [
      ...events,
      {
        id,
        title: newTitle.trim() || "Turno",
        client: newClient.trim() || "",
        start: toIsoSeconds(newStart),
        end: toIsoSeconds(newEnd),
        status: newStatus,
      } as any,
    ];

    setEvents(next);
    await saveToDrive(next);
    setOpenNew(false);
  }

  // Guardar edición
  async function handleSaveEdit() {
    if (!editingEvent) return;

    const updated: CalendarEvent = {
      ...(editingEvent as any),
      title: editTitle.trim() || "Turno",
      client: editClient.trim() || "",
      start: toIsoSeconds(editStart),
      end: toIsoSeconds(editEnd),
      status: editStatus,
    } as any;

    const next = events.map((e) => (e.id === (updated as any).id ? updated : e));
    setEvents(next);
    await saveToDrive(next);

    setOpenEdit(false);
    setEditingEvent(null);
  }

  // Borrar
  async function handleDeleteEdit() {
    if (!editingEvent) return;
    const next = events.filter((e) => e.id !== (editingEvent as any).id);
    setEvents(next);
    await saveToDrive(next);

    setOpenEdit(false);
    setEditingEvent(null);
  }

  return (
    <div className="min-h-[100svh] bg-[#0b0b0b] text-white">
      <div className="mx-auto max-w-[1200px] px-3 py-4">
        <AgendaHeader
          currentDate={currentDate}
          view={view}
          onChangeView={setView}
          onPrev={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + (view === "week" ? -7 : -1));
            setCurrentDate(d);
          }}
          onNext={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + (view === "week" ? 7 : 1));
            setCurrentDate(d);
          }}
          onToday={() => setCurrentDate(new Date())}
        />

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[280px_1fr]">
          {/* SIDEBAR (MiniMonth solo desktop para evitar "doble calendario" en mobile) */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="hidden lg:block">
              <MiniMonth value={currentDate} onChange={setCurrentDate} />
            </div>

            <AgendaCarousel
              currentDate={currentDate}
              events={events}
              onPickEvent={(ev) => {
                const [datePart] = (ev as any).start.split("T");
                const [y, m, d] = datePart.split("-").map(Number);
                setCurrentDate(new Date(y, m - 1, d));
              }}
            />

            <button
              type="button"
              disabled={driveBusy}
              onClick={async () => {
                try {
                  setDriveBusy(true);
                  const token = await connectDrive();
                  setDriveToken(token);
                } catch (e: any) {
                  alert(e?.message || "Error conectando Drive");
                } finally {
                  setDriveBusy(false);
                }
              }}
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50 disabled:cursor-wait"
            >
              <div className="flex items-center justify-center gap-2">
                <img
                  src="/logos/descarga.png"
                  alt=""
                  aria-hidden="true"
                  width={18}
                  height={18}
                  className="shrink-0"
                />
                <span>
                  {driveToken
                    ? "Drive conectado"
                    : driveBusy
                    ? "Conectando..."
                    : "Conectar Google Drive"}
                </span>
              </div>
            </button>

            <button
              type="button"
              disabled={!driveToken || driveBusy}
              onClick={async () => {
                try {
                  setDriveBusy(true);
                  await uploadAgendaJson(driveToken!, {
                    version: 1,
                    updatedAt: new Date().toISOString(),
                    events,
                  });
                  alert("Agenda guardada en Drive ✅");
                } catch (e: any) {
                  alert(e?.message || "Error guardando agenda");
                } finally {
                  setDriveBusy(false);
                }
              }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50 disabled:cursor-wait"
            >
              Guardar agenda en Drive
            </button>

            <div className="mt-3 border-t border-white/10 pt-3 text-xs text-white/60">
              MVP: vista + eventos. Edición lista.
            </div>
          </div>

          {/* MAIN */}
          <div>
            <div className="flex items-center justify-between px-2 pb-2">
              <div className="text-sm font-semibold text-white/80">Turnos</div>
              <button
                type="button"
                onClick={openNewTurno}
                className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15"
              >
                + Turno
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
              <WeekGrid
                currentDate={currentDate}
                view={view}
                events={events}
                onSelectDate={setCurrentDate}
                onEventClick={openEditTurno}
              />
            </div>
          </div>
        </div>

        {/* MODAL NUEVO */}
        {openNew && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm">
            <div className="mx-auto mt-24 w-[92%] max-w-md rounded-2xl border border-white/10 bg-[#0b0b0b] p-4 text-white shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="text-lg font-black">Nuevo turno</div>
                <button
                  type="button"
                  onClick={() => setOpenNew(false)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm hover:bg-white/10"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <div className="text-xs text-white/60 mb-1">Servicio</div>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ej: Corte + Color"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                  />
                </div>

                <div>
                  <div className="text-xs text-white/60 mb-1">Cliente</div>
                  <input
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    placeholder="Ej: Ana"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-white/60 mb-1">Inicio</div>
                    <input
                      type="datetime-local"
                      value={newStart}
                      onChange={(e) => setNewStart(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-white/60 mb-1">Fin</div>
                    <input
                      type="datetime-local"
                      value={newEnd}
                      onChange={(e) => setNewEnd(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="text-xs text-white/60 mb-1">Estado</div>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenNew(false)}
                    className="w-1/2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleCreate}
                    className="w-1/2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-black hover:bg-white/15"
                  >
                    Guardar
                  </button>
                </div>

                <div className="text-[11px] text-white/45">
                  Tip: si Drive está conectado, se guarda automático.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL EDITAR */}
        {openEdit && editingEvent && (
          <div className="fixed inset-0 z-[210] bg-black/60 backdrop-blur-sm">
            <div className="mx-auto mt-24 w-[92%] max-w-md rounded-2xl border border-white/10 bg-[#0b0b0b] p-4 text-white shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="text-lg font-black">Editar turno</div>
                <button
                  type="button"
                  onClick={() => {
                    setOpenEdit(false);
                    setEditingEvent(null);
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm hover:bg-white/10"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <div className="text-xs text-white/60 mb-1">Servicio</div>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                  />
                </div>

                <div>
                  <div className="text-xs text-white/60 mb-1">Cliente</div>
                  <input
                    value={editClient}
                    onChange={(e) => setEditClient(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-white/60 mb-1">Inicio</div>
                    <input
                      type="datetime-local"
                      value={editStart}
                      onChange={(e) => setEditStart(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-white/60 mb-1">Fin</div>
                    <input
                      type="datetime-local"
                      value={editEnd}
                      onChange={(e) => setEditEnd(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="text-xs text-white/60 mb-1">Estado</div>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteEdit}
                    className="w-1/2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10"
                  >
                    Borrar
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="w-1/2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-black hover:bg-white/15"
                  >
                    Guardar cambios
                  </button>
                </div>

                <div className="text-[11px] text-white/45">
                  Tip: si Drive está conectado, se guarda automático.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
