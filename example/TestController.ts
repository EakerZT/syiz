import { Controller, Get } from '../lib/Controller'

@Controller({})
export default class TestController {
  @Get()
  test () {
    console.log(1)
    return 1
  }
}
