import '@testing-library/jest-dom'

// Polyfill for crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }
})

// Polyfill for TextEncoder/TextDecoder
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Simple fetch mock for tests
global.fetch = jest.fn()
global.Request = class Request {
  constructor(url, options = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = options.headers || {}
    this.body = options.body
  }
}
global.Response = class Response {
  constructor(body, options = {}) {
    this.body = body
    this.status = options.status || 200
    this.statusText = options.statusText || 'OK'
    this.headers = options.headers || {}
  }
  async json() {
    return JSON.parse(this.body)
  }
  async text() {
    return this.body
  }
}
global.Headers = class Headers {
  constructor(init = {}) {
    this.headers = init
  }
  get(name) {
    return this.headers[name]
  }
  set(name, value) {
    this.headers[name] = value
  }
}