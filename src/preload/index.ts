import { contextBridge, ipcRenderer } from 'electron'

const api = {
  snapshot: () => ipcRenderer.invoke('app:snapshot'),
  setSettings: (patch: unknown) => ipcRenderer.invoke('settings:set', patch),
  refreshFriends: () => ipcRenderer.invoke('friends:refresh'),
  patchFriend: (payload: unknown) => ipcRenderer.invoke('friends:patch', payload),
  selectAll: (payload: unknown) => ipcRenderer.invoke('friends:selectAll', payload),
  startLogin: () => ipcRenderer.invoke('login:start'),
  checkLogin: () => ipcRenderer.invoke('login:check'),
  logout: () => ipcRenderer.invoke('login:logout'),
  runNow: (payload: unknown) => ipcRenderer.invoke('run:now', payload),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  testAi: () => ipcRenderer.invoke('ai:test'),
  openDataDir: () => ipcRenderer.invoke('shell:dataDir'),
  clearLogs: () => ipcRenderer.invoke('logs:clear'),
  onUpdate: (cb: (state: unknown) => void) => {
    const handler = (_e: unknown, state: unknown): void => cb(state)
    ipcRenderer.on('state:update', handler)
    return () => ipcRenderer.removeListener('state:update', handler)
  }
}

contextBridge.exposeInMainWorld('api', api)
