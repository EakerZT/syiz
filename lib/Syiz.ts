import http, { type IncomingMessage, type ServerResponse } from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { build, isExistController, RequestMethod } from './Controller'
import { BaseResponse, ResponseFile } from './Response'
import { ValidatorArray, ValidatorNumber, ValidatorObject, ValidatorString } from './Validator'

export interface SyizApplicationOption {
  port?: number;
  sourceDir?: string;
}

export default class Syiz {
  private readonly port: number
  private readonly sourceDir: string
  private readonly requestMap: RequestMethod[]

  public constructor (option: SyizApplicationOption = {}) {
    this.port = option.port ?? 8080
    this.sourceDir = option.sourceDir ?? process.cwd()
    this.requestMap = []
  }

  private async onServerRequest (req: IncomingMessage, res: ServerResponse) {
    let route: RequestMethod | null = null
    let params: Record<string, string> | false = false
    for (let i = 0; i < this.requestMap.length; i++) {
      const r = this.requestMap[i].urlValidator(req.url ?? '')
      if (r) {
        params = r.params as Record<string, string>
        route = this.requestMap[i]
        break
      }
    }
    if (!params || !route) {
      res.writeHead(404)
      res.end('404')
      return
    }
    const result = await route.target(req, params)
    if (result) {
      if (typeof result === 'number') {
        const text = result.toString()
        res.writeHead(200, {
          'Content-Type': 'text/plain',
          'Content-Length': Buffer.byteLength(text)
        })
        res.end(text)
      } else if (typeof result === 'string') {
        res.writeHead(200, {
          'Content-Type': 'text/plain',
          'Content-Length': Buffer.byteLength(result)
        })
        res.end(result)
      } else if (result instanceof ResponseFile) {
        res.writeHead(result.code, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename=${result.name ?? 'unnamed'}`
        })
        result.content.pipe(res)
      } else if (result instanceof BaseResponse) {
        res.writeHead(result.code, {
          'Content-Type': result.type
        })
        res.end(result.content)
      } else {
        const text = JSON.stringify(result)
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(text)
        })
        res.end(text)
      }
    }
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

export const Validator = {
  object: new ValidatorObject(),
  number: new ValidatorNumber(),
  string: new ValidatorString(),
  array: new ValidatorArray()
}
