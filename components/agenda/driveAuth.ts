export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

declare global {
  interface Window {
    google?: any;
  }
}

export async function connectDrive(): Promise<string> {
  if (!window.google?.accounts?.oauth2) {
    throw new Error("Google Identity Services no está cargado (falta gsi/client).");
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Falta NEXT_PUBLIC_GOOGLE_CLIENT_ID en .env.local");
  }

  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (resp: any) => {
        if (!resp?.access_token) return reject(new Error("No se recibió access_token"));
        resolve(resp.access_token);
      },
      error_callback: (err: any) => reject(err),
    });

    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}
