import http, { type IncomingMessage, type ServerResponse } from 'node:http'
import { type SyizApplicationOption } from './Type'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { build, isExistController, RequestMethod } from './Controller'

export default class Syiz {
  private readonly port: number
  private readonly sourceDir:string
  private readonly requestMap:RequestMethod[]

  public constructor (option: SyizApplicationOption = {}) {
    this.port = option.port ?? 8080
    this.sourceDir = option.sourceDir ?? process.cwd()
    this.requestMap = []
  }

  private async onServerRequest (req: IncomingMessage, res: ServerResponse) {
    let route:RequestMethod|null = null
    let params:Record<string, string>|false = false
    for (let i = 0; i < this.requestMap.length; i++) {
      const r = this.requestMap[i].match(req.url ?? '')
      if (r) {
        params = r.params as Record<string, string>
        route = this.requestMap[i]
        break
      }
    }
    if (!params || !route) {
      res.end('404')
      return
    }
    const result = await route.target(req, params)
    if (result) {
      if (typeof result === 'number') {
        res.end(result.toString())
        return
      } else {
        res.end({ a: 123 })
      }
      return
    }
    res.end('404')
  }

  private scan (dir = this.sourceDir) {
    const filenames = fs.readdirSync(dir)
    for (const filename of filenames) {
      const fullPath = path.join(dir, filename)
      console.log(fullPath)
      if (fs.statSync(fullPath).isDirectory()) {
        this.scan(path.join(fullPath))
        // eslint-disable-next-line no-continue
        continue
      }
      if (!filename.endsWith('.js') && !filename.endsWith('.ts')) {
        // eslint-disable-next-line no-continue
        continue
      }
      // eslint-disable-next-line global-require,import/no-dynamic-require
      const componentClass = require(fullPath).default
      if (!componentClass) {
        continue
      }
      if (!componentClass.prototype) {
        continue
      }
      if (isExistController(componentClass.prototype)) {
        // eslint-disable-next-line new-cap
        const c = new componentClass()
        const list = build(c, componentClass.prototype)
        this.requestMap.push(...list)
      }
    }
  }

  public start () {
    this.scan()
    const server = http.createServer((req, res) => this.onServerRequest(req, res))
    return server.listen(this.port)
  }
}
