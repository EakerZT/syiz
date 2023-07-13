import { Controller, Get } from '../lib/Controller'
import fs from 'node:fs'
import path from 'node:path'
import { ResponseFile } from '../lib/Response'

@Controller({})
export default class TestController {
  @Get({ path: '/api/test' })
  test () {
    console.log(1)
    return {
      aaa: 123
    }
  }

  @Get({ path: '/api/test2/:aaa' })
  test2 (ctx:unknown) {
    console.log(ctx)
    return new ResponseFile('1.js', fs.createReadStream(path.join(__dirname, '..', 'package.json')))
  }
}
