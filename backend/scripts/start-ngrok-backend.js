/**
 * start-ngrok-backend.js
 * ------------------------------------------------------------
 * Khoi dong backend server va mo ngrok tunnel de SePay goi IPN.
 *
 * Luong:
 *   SePay -> https://xxxx.ngrok-free.app/api/sepay/webhook
 *                        -> localhost:3000/api/sepay/webhook
 *
 * Chay:
 *   npm run ngrok:sepay
 *
 * Luu y:
 *   - Neu tai khoan ngrok yeu cau, them NGROK_AUTHTOKEN vao .env.
 *   - Cap nhat IPN URL trong SePay dashboard bang URL script in ra.
 * ------------------------------------------------------------
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') })

const { spawn } = require('child_process')
const path = require('path')

const BACKEND_PORT = Number(process.env.PORT || 3000)
const WEBHOOK_PATH = '/api/sepay/webhook'
const START_DELAY_MS = Number(process.env.NGROK_START_DELAY_MS || 2000)
const NGROK_API_URL = 'http://127.0.0.1:4040/api/tunnels'
const NGROK_AUTHTOKEN = process.env.NGROK_AUTHTOKEN || process.env.NGROK_API_KEY || ''
const NGROK_DEV_DOMAIN = process.env.NGROK_DEV_DOMAIN || process.env.NGROK_URL || ''

const ngrokBin =
  process.platform === 'win32'
    ? path.resolve(__dirname, '..', 'node_modules', '.bin', 'ngrok.cmd')
    : path.resolve(__dirname, '..', 'node_modules', '.bin', 'ngrok')

let isShuttingDown = false
let ngrokProcess = null
let backendProcess = null

function normalizeNgrokUrl(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function startBackend(envOverrides) {
  backendProcess = spawn('node', [path.resolve(__dirname, '..', 'src', 'server.js')], {
    stdio: 'inherit',
    env: { ...process.env, ...envOverrides },
  })

  backendProcess.on('error', (err) => {
    console.error('Backend process error:', err.message)
  })

  backendProcess.on('close', async (code) => {
    if (isShuttingDown) return
    console.warn(`Backend stopped (exit code ${code}). Closing ngrok...`)
    await shutdown(typeof code === 'number' ? code : 1)
  })
}

async function startNgrok() {
  await new Promise((resolve) => setTimeout(resolve, START_DELAY_MS))

  try {
    const ngrokArgs = ['http', String(BACKEND_PORT), '--log=stdout']
    const normalizedUrl = normalizeNgrokUrl(NGROK_DEV_DOMAIN)

    if (NGROK_AUTHTOKEN) {
      ngrokArgs.push('--authtoken', NGROK_AUTHTOKEN)
    }

    if (normalizedUrl) {
      ngrokArgs.push('--url', normalizedUrl)
    }

    ngrokProcess = spawn(ngrokBin, ngrokArgs, {
      stdio: 'inherit',
      env: { ...process.env },
      shell: process.platform === 'win32',
    })

    ngrokProcess.on('error', (err) => {
      console.error('Cannot start ngrok process:', err.message)
    })

    ngrokProcess.on('close', async (code) => {
      if (isShuttingDown) return
      console.warn(`ngrok stopped (exit code ${code}). Stopping backend...`)
      await shutdown(typeof code === 'number' ? code : 1)
    })

    const tunnelUrl = await waitForNgrokPublicUrl(20, 1000)
    const ipnUrl = `${tunnelUrl}${WEBHOOK_PATH}`

    // Inject current tunnel URL so create-payment always sends correct IPN URL.
    startBackend({
      BACKEND_URL: tunnelUrl,
      IPN_URL: ipnUrl,
    })

    console.log('\n=============================================')
    console.log('SePay IPN tunnel is ready via ngrok')
    console.log(`Backend URL: ${tunnelUrl}`)
    console.log(`SePay IPN URL: ${ipnUrl}`)
    if (normalizedUrl) {
      console.log(`Requested fixed domain: ${normalizedUrl}`)
    }
    console.log('Set this URL in SePay dashboard')
    console.log('IPN_URL is injected into backend runtime automatically')
    console.log('Press Ctrl+C to stop backend + ngrok')
    console.log('=============================================\n')
  } catch (err) {
    console.error('Cannot start ngrok tunnel:', err.message)
    if (!NGROK_AUTHTOKEN) {
      console.error('Missing NGROK_AUTHTOKEN. Add it to backend/.env then run again.')
    }
    console.error('If needed, run: ngrok config add-authtoken <YOUR_TOKEN>')
    await shutdown(1)
  }
}

async function waitForNgrokPublicUrl(maxAttempts, delayMs) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(NGROK_API_URL)
      if (response.ok) {
        const payload = await response.json()
        const httpsTunnel = (payload.tunnels || []).find((t) =>
          String(t.public_url || '').startsWith('https://')
        )

        if (httpsTunnel && httpsTunnel.public_url) {
          return httpsTunnel.public_url
        }
      }
    } catch {
      // ngrok API may not be ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  throw new Error('Timeout waiting for ngrok public URL from local API')
}

async function shutdown(code) {
  if (isShuttingDown) return
  isShuttingDown = true

  if (ngrokProcess && !ngrokProcess.killed) {
    ngrokProcess.kill()
  }

  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill()
  }

  process.exit(code)
}

process.on('SIGINT', async () => {
  console.log('\nStopping backend and ngrok tunnel...')
  await shutdown(0)
})

process.on('SIGTERM', async () => {
  await shutdown(0)
})

startNgrok()
