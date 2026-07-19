import net from 'node:net'

function tryListen(port: number): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') resolve(null)
      else reject(error)
    })
    server.listen(port, '127.0.0.1', () => {
      const address = server.address()
      const bound = address && typeof address === 'object' ? address.port : null
      server.close(() => resolve(bound))
    })
  })
}

/**
 * Binds to `preferred` if it's free (so the dev URL stays stable across restarts);
 * otherwise asks the OS for whatever free port it has by binding to port 0.
 */
export async function getFreePort(preferred?: number): Promise<number> {
  if (preferred !== undefined) {
    const bound = await tryListen(preferred)
    if (bound !== null) return bound
  }

  const bound = await tryListen(0)
  if (bound === null) throw new Error('strides: could not determine a free port')
  return bound
}
