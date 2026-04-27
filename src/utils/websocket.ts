// WebSocket service for real-time communication

import type { WSMessage, WSMessageType } from '@/types'

type MessageHandler = (payload: any) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private url: string = ''
  private handlers: Map<WSMessageType, Set<MessageHandler>> = new Map()
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 3000
  private isConnected: boolean = false
  private useMock: boolean = true // Default to mock mode

  connect(url: string): void {
    this.url = url
    if (this.useMock) {
      console.log('[Mock WS] Connected to mock WebSocket')
      this.isConnected = true
      return
    }

    try {
      this.ws = new WebSocket(url)
      this.setupEventHandlers()
    } catch (error) {
      console.error('WebSocket connection error:', error)
      this.handleReconnect()
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return

    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.isConnected = true
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data)
        this.dispatch(message.type, message.payload)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      this.isConnected = false
      this.handleReconnect()
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      setTimeout(() => this.connect(this.url), this.reconnectDelay)
    }
  }

  send(type: WSMessageType, payload: any): void {
    if (this.useMock) {
      console.log('[Mock WS] Send:', type, payload)
      return
    }

    if (this.ws && this.isConnected) {
      const message: WSMessage = {
        type,
        payload,
        timestamp: new Date().toISOString()
      }
      this.ws.send(JSON.stringify(message))
    }
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

  private dispatch(type: WSMessageType, payload: any): void {
    this.handlers.get(type)?.forEach(handler => handler(payload))
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
  }

  get connected(): boolean {
    return this.isConnected
  }

  setMockMode(mock: boolean): void {
    this.useMock = mock
  }
}

export const wsService = new WebSocketService()
export default wsService
