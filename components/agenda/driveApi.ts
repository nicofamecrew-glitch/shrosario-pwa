const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

async function driveFetch(token: string, input: RequestInfo, init: RequestInit = {}) {
  const res = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Drive API ${res.status}: ${txt || res.statusText}`);
  }
  return res;
}

export async function findAgendaFileId(token: string) {
  // Busca agenda.json dentro del appDataFolder
  const q = encodeURIComponent(`name='agenda.json' and trashed=false`);
  const url = `${DRIVE_FILES}?spaces=appDataFolder&q=${q}&fields=files(id,name)`;
  const res = await driveFetch(token, url);
  const data = await res.json();
  return (data.files?.[0]?.id as string | undefined) ?? null;
}

export async function createAgendaFile(token: string) {
  const metadata = {
    name: "agenda.json",
    parents: ["appDataFolder"],
    mimeType: "application/json",
  };

  const res = await driveFetch(token, DRIVE_FILES, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });

  const data = await res.json();
  return data.id as string;
}

export async function uploadAgendaJson(token: string, payload: any) {
  const existingId = await findAgendaFileId(token);
  const fileId = existingId ?? (await createAgendaFile(token));

  const url = `${DRIVE_UPLOAD}/${fileId}?uploadType=media`;
  await driveFetch(token, url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return fileId;
}

export async function downloadAgendaJson(token: string) {
  const fileId = await findAgendaFileId(token);
  if (!fileId) return null;

  const url = `${DRIVE_FILES}/${fileId}?alt=media`;
  const res = await driveFetch(token, url);
  return await res.json();
}
