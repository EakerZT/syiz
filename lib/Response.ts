import { Readable } from 'node:stream'

export class BaseResponse<T = unknown> {
  constructor (public content: T, public code: number = 200, public type: string = '') {
    if (typeof content === 'string' && !type) {
      this.type = 'text/plain'
    }
    if (!type) {
      this.type = 'application/json'
    }
  }
}

export class ResponseFile extends BaseResponse<Readable> {
  name: string

  constructor (name: string, stream: Readable) {
    super(stream)
    this.type = 'application/octet-stream'
    this.name = name
  }
}
