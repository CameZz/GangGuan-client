export interface RuntimeConfig {
  serverUrl: string
  apiPath: string
  wsPath: string
  apiBaseUrl?: string
  wsUrl?: string
}

export interface AppConfig {
  serverUrl: string
  apiPath: string
  wsPath: string
  apiBaseUrl: string
  wsUrl: string
}

const defaultRuntimeConfig: RuntimeConfig = {
  serverUrl: 'http://localhost:3001',
  apiPath: '/api',
  wsPath: '/ws'
}

let appConfig: AppConfig = normalizeConfig(defaultRuntimeConfig)
let configPromise: Promise<AppConfig> | null = null

function withHttpProtocol(url: string): string {
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `http://${trimmed}`
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function joinUrl(base: string, path: string): string {
  return `${trimTrailingSlash(base)}/${path.replace(/^\/+/, '')}`
}

function isAbsoluteHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

function isAbsoluteWebSocketUrl(url: string): boolean {
  return /^wss?:\/\//i.test(url)
}

function toWebSocketBase(serverUrl: string): string {
  return serverUrl
    .replace(/^https:\/\//i, 'wss://')
    .replace(/^http:\/\//i, 'ws://')
}

function getClientWebSocketBase(serverUrl: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return toWebSocketBase(window.location.origin)
  }
  return toWebSocketBase(serverUrl)
}

function normalizeWebSocketUrl(wsUrl: string | undefined, serverUrl: string, wsPath: string): string {
  if (!wsUrl) {
    return joinUrl(toWebSocketBase(serverUrl), wsPath)
  }
  if (isAbsoluteWebSocketUrl(wsUrl)) {
    return wsUrl
  }
  return joinUrl(getClientWebSocketBase(serverUrl), wsUrl)
}

function normalizeConfig(config: Partial<RuntimeConfig>): AppConfig {
  const serverUrl = trimTrailingSlash(withHttpProtocol(config.serverUrl || defaultRuntimeConfig.serverUrl))
  const apiPath = config.apiPath || defaultRuntimeConfig.apiPath
  const wsPath = config.wsPath || defaultRuntimeConfig.wsPath

  return {
    serverUrl,
    apiPath,
    wsPath,
    apiBaseUrl: config.apiBaseUrl
      ? (isAbsoluteHttpUrl(config.apiBaseUrl) ? trimTrailingSlash(config.apiBaseUrl) : config.apiBaseUrl)
      : joinUrl(serverUrl, apiPath),
    wsUrl: normalizeWebSocketUrl(config.wsUrl, serverUrl, wsPath)
  }
}

export async function loadAppConfig(): Promise<AppConfig> {
  if (configPromise) return configPromise

  configPromise = fetch('/config.json', { cache: 'no-store' })
    .then(async response => {
      if (!response.ok) {
        throw new Error(`Failed to load config.json: ${response.status}`)
      }

      const runtimeConfig = await response.json() as Partial<RuntimeConfig>
      appConfig = normalizeConfig(runtimeConfig)
      return appConfig
    })
    .catch(error => {
      console.warn('使用默认服务器配置:', error)
      appConfig = normalizeConfig(defaultRuntimeConfig)
      return appConfig
    })

  return configPromise
}

export function getAppConfig(): AppConfig {
  return appConfig
}

export function getApiBaseUrl(): string {
  return appConfig.apiBaseUrl
}

export function getApiUrl(path: string): string {
  return joinUrl(appConfig.apiBaseUrl, path)
}

export function getWebSocketUrl(): string {
  return appConfig.wsUrl
}
