const BASE_PATH = './static'
Bun.serve({
  port: 9000,
  async fetch(req) {
    const filePath = BASE_PATH + new URL(req.url).pathname
    const file = Bun.file(filePath)
    return new Response(file)
  },
  error() {
    return new Response(null, { status: 404 })
  },
})
