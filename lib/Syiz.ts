import http, { type IncomingMessage, type ServerResponse } from 'node:http'
import { type SyizApplicationOption } from './Type'
export default class Syiz {
  private readonly port: number

  public constructor (option: SyizApplicationOption = {}) {
    this.port = option.port ?? 8080
  }

  private onServerRequest (req: IncomingMessage, res: ServerResponse) {
    console.log(res)
    res.end('123')
  }

  public start () {
    const server = http.createServer(this.onServerRequest)
    return server.listen(this.port)
  }
}
