interface GoogleToken {
  access_token?: string;
  error?: string;
}

interface GooglePickerDocument {
  id?: string;
  name?: string;
  mimeType?: string;
}

interface GooglePickerResponse {
  action: string;
  docs?: GooglePickerDocument[];
}

interface GooglePickerView {
  setMimeTypes(types: string): GooglePickerView;
}

interface GooglePickerBuilder {
  addView(view: GooglePickerView): GooglePickerBuilder;
  setOAuthToken(token: string): GooglePickerBuilder;
  setDeveloperKey(key: string): GooglePickerBuilder;
  setAppId(id: string): GooglePickerBuilder;
  setCallback(callback: (data: GooglePickerResponse) => void): GooglePickerBuilder;
  build(): { setVisible(visible: boolean): void };
}

interface GoogleApi {
  load(name: string, options: { callback: () => void; onerror?: () => void }): void;
}

interface GoogleDriveApi {
  accounts: {
    oauth2: {
      initTokenClient(options: {
        client_id: string;
        scope: string;
        callback: (response: GoogleToken) => void;
      }): { requestAccessToken(options?: { prompt?: string }): void };
    };
  };
  picker: {
    PickerBuilder: new () => GooglePickerBuilder;
    DocsView: new (viewId: string) => GooglePickerView;
    ViewId: { DOCS: string };
    Action: { PICKED: string; CANCEL: string };
  };
}

declare global {
  interface Window {
    gapi?: GoogleApi;
    google?: GoogleDriveApi;
  }
}

const SCOPE = "https://www.googleapis.com/auth/drive.file";
const GIS_SCRIPT = "https://accounts.google.com/gsi/client";
const PICKER_SCRIPT = "https://apis.google.com/js/api.js";
const scriptLoads = new Map<string, Promise<void>>();

function config() {
  const { VITE_GOOGLE_CLIENT_ID: clientId, VITE_GOOGLE_API_KEY: apiKey, VITE_GOOGLE_APP_ID: appId } = import.meta.env;
  if (!clientId || !apiKey || !appId) {
    throw new Error("Google Drive is not configured yet. Add the Google OAuth client ID, API key and project number in Vercel.");
  }
  return { clientId, apiKey, appId };
}

function loadScript(src: string): Promise<void> {
  const existing = scriptLoads.get(src);
  if (existing) return existing;
  const pending = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoads.delete(src);
      reject(new Error("Google Drive tools could not be loaded. Check your connection and try again."));
    };
    document.head.appendChild(script);
  });
  scriptLoads.set(src, pending);
  return pending;
}

async function accessToken(): Promise<string> {
  const { clientId } = config();
  await loadScript(GIS_SCRIPT);
  const google = window.google;
  if (!google) throw new Error("Google authorization did not load.");
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error("Google Drive permission was not granted."));
          return;
        }
        resolve(response.access_token);
      },
    });
    client.requestAccessToken({ prompt: "" });
  });
}

export async function pickGoogleDrivePdf(): Promise<File | null> {
  const { apiKey, appId } = config();
  const token = await accessToken();
  await loadScript(PICKER_SCRIPT);
  const gapi = window.gapi;
  if (!gapi) throw new Error("Google Drive file picker did not load.");
  await new Promise<void>((resolve, reject) => {
    gapi.load("picker", { callback: resolve, onerror: () => reject(new Error("Google Drive picker did not load.")) });
  });
  const google = window.google;
  if (!google) throw new Error("Google Drive file picker did not load.");

  return new Promise((resolve, reject) => {
    const picker = new google.picker.PickerBuilder()
      .addView(new google.picker.DocsView(google.picker.ViewId.DOCS).setMimeTypes("application/pdf"))
      .setOAuthToken(token)
      .setDeveloperKey(apiKey)
      .setAppId(appId)
      .setCallback((data) => {
        if (data.action === google.picker.Action.CANCEL) {
          resolve(null);
          return;
        }
        if (data.action !== google.picker.Action.PICKED) return;
        const document = data.docs?.[0];
        if (!document?.id || document.mimeType !== "application/pdf") {
          reject(new Error("Choose a PDF file from Google Drive."));
          return;
        }
        void fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(document.id)}?alt=media`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(async (response) => {
            if (!response.ok) throw new Error("Google Drive could not download this PDF. Check your access and try again.");
            const blob = await response.blob();
            resolve(new File([blob], document.name || "drive-document.pdf", { type: "application/pdf" }));
          })
          .catch((error: unknown) => reject(error instanceof Error ? error : new Error("Could not read that Google Drive file.")));
      })
      .build();
    picker.setVisible(true);
  });
}

export async function saveToGoogleDrive(file: Blob, filename: string): Promise<void> {
  const token = await accessToken();
  const metadata = new Blob(
    [JSON.stringify({ name: filename, mimeType: file.type || "application/octet-stream" })],
    { type: "application/json; charset=UTF-8" },
  );
  const body = new FormData();
  body.append("metadata", metadata);
  body.append("file", file, filename);
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  if (!response.ok) {
    throw new Error("Google Drive could not save this file. Check your account storage and try again.");
  }
}
