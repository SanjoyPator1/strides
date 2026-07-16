import net from 'node:net'

/** Asks the OS for a free TCP port by binding to port 0 and reading back what it assigned. */
export async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address && typeof address === 'object') {
        const port = address.port
        server.close(() => resolve(port))
      } else {
        server.close(() => reject(new Error('strides: could not determine a free port')))
      }
    })
  })
}
