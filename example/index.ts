import Syiz from '../lib/Syiz'

const app = new Syiz({
  port: 6543,
  sourceDir: __dirname
})
app.start()
