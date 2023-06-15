import { Parameter } from '../lib/Router'
import 'reflect-metadata'

class TestClass {
  test (@Parameter('aaa') test: string) {
    console.log(1)
  }
}

console.log(new TestClass())
