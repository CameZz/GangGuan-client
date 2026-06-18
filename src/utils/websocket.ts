// WebSocket service for real-time communication

import type { WSMessage, WSMessageType } from '@/types'

type MessageHandler = (payload: any) => void
type KickHandler = () => void

class WebSocketService {
  private ws: WebSocket | null = null
  private url: string = ''
  private handlers: Map<WSMessageType, Set<MessageHandler>> = new Map()
  private kickHandler: KickHandler | null = null
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 3000
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect: boolean = false
  private isConnected: boolean = false
  private isAuthenticated: boolean = false
  private userId: string | null = null

  connect(url: string, userId: string): void {
    const isSameConnection = this.url === url && this.userId === userId
    const isOpenOrConnecting = this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING

    if (isSameConnection && isOpenOrConnecting) {
      return
    }

    this.disconnect()
    this.url = url
    this.userId = userId
    this.shouldReconnect = true
    this.open()
  }

  private open(): void {
    if (!this.url || !this.userId) return

    try {
      const socket = new WebSocket(this.url)
      this.ws = socket
      this.setupEventHandlers(socket)
    } catch (error) {
      console.error('WebSocket connection error:', error)
      this.handleReconnect()
    }
  }

  private setupEventHandlers(socket: WebSocket): void {
    socket.onopen = () => {
      if (this.ws !== socket) return

      console.log('WebSocket connected')
      this.isConnected = true
      this.reconnectAttempts = 0

      if (this.userId) {
        socket.send(JSON.stringify({
          type: 'auth',
          userId: this.userId
        }))
      }
    }

    socket.onmessage = (event) => {
      if (this.ws !== socket) return

      try {
        const message = JSON.parse(event.data)

        if (message.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }))
          return
        }

        if (message.type === 'sync:init') {
          this.isAuthenticated = true
          console.log('WebSocket authenticated')
        }

        this.dispatch(message.type, message.payload || message)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    socket.onerror = (error) => {
      if (this.ws !== socket) return
      console.error('WebSocket error:', error)
    }

    socket.onclose = (event) => {
      if (this.ws !== socket) return

      console.log('WebSocket disconnected', event.code, event.reason)
      this.ws = null
      this.isConnected = false
      this.isAuthenticated = false

      if (event.code === 4001) {
        console.log('Account signed in elsewhere')
        this.shouldReconnect = false
        this.kickHandler?.()
        return
      }

      this.handleReconnect()
    }
  }

  private handleReconnect(): void {
    if (!this.shouldReconnect || !this.userId || !this.url) return
    if (this.reconnectTimer) return
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return

    this.reconnectAttempts++
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.open()
    }, this.reconnectDelay)
  }

  send(type: WSMessageType, payload: any): void {
    if (!this.ws || !this.isConnected) return

    const message: WSMessage = {
      type,
      payload,
      timestamp: new Date().toISOString()
    }
    this.ws.send(JSON.stringify(message))
  }

  on(type: WSMessageType, callback: MessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(callback)
  }

  off(type: WSMessageType, callback: MessageHandler): void {
    this.handlers.get(type)?.delete(callback)
  }

  onKick(handler: KickHandler): void {
    this.kickHandler = handler
  }

  private dispatch(type: WSMessageType, payload: any): void {
    this.handlers.get(type)?.forEach(handler => handler(payload))
  }

  disconnect(): void {
    this.shouldReconnect = false
    this.userId = null

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    const socket = this.ws
    this.ws = null
    if (socket && socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
      socket.close()
    }

    this.isConnected = false
    this.isAuthenticated = false
  }

  get connected(): boolean {
    return this.isConnected
  }

  get authenticated(): boolean {
    return this.isAuthenticated
  }
}

export const wsService = new WebSocketService()
export default wsService
