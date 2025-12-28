// Setup global mocks for Next.js test environment

// Mock Request and Response for Next.js API routes
global.Request = class Request {
  constructor(url, init) {
    this.url = url;
    this.method = init?.method || 'GET';
    this.headers = new Map();

    if (init?.headers) {
      Object.entries(init.headers).forEach(([key, value]) => {
        this.headers.set(key.toLowerCase(), value);
      });
    }

    this.body = init?.body || null;
  }

  get(key) {
    return this.headers.get(key.toLowerCase());
  }

  json() {
    return Promise.resolve(this.body ? JSON.parse(this.body) : {});
  }
};

global.Response = class Response {
  constructor(body, init) {
    this.body = body;
    this.status = init?.status || 200;
    this.statusText = init?.statusText || 'OK';
    this.headers = new Map();

    if (init?.headers) {
      Object.entries(init.headers).forEach(([key, value]) => {
        this.headers.set(key.toLowerCase(), value);
      });
    }
  }

  json() {
    return Promise.resolve(typeof this.body === 'string' ? JSON.parse(this.body) : this.body);
  }
};

// Mock Headers
global.Headers = Map;

// Add TextEncoder/TextDecoder for Node.js environment
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;