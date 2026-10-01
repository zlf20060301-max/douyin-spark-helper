export {}

declare global {
  interface Window {
    api: Record<string, (...args: never[]) => Promise<unknown>>
  }
}
