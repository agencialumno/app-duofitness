// Stub do expo-application: o teste troca os valores.
export const app = { version: '1.0.0' as string | null, build: '33' as string | null };
export const Application = {
  get nativeApplicationVersion() { return app.version; },
  get nativeBuildVersion() { return app.build; },
};
export const nativeApplicationVersion = '1.0.0';
export const nativeBuildVersion = '33';
