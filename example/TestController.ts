import { Controller, Get } from '../lib/Controller'

@Controller({})
export default class TestController {
  @Get({ path: '/api/test' })
  test () {
    console.log(1)
    return 1
  }

  @Get({ path: '/api/test2/:aaa' })
  test2 (ctx:unknown) {
    console.log(ctx)
    return 2
  }
}
