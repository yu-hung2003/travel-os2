/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_OPENWEATHER_KEY?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
