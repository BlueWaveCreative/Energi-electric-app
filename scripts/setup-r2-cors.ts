// scripts/setup-r2-cors.ts
import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local without dotenv dependency
const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  let val = trimmed.slice(eqIdx + 1).trim()
  // Strip surrounding quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1)
  }
  if (!process.env[key]) process.env[key] = val
}

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

async function main() {
  await r2Client.send(
    new PutBucketCorsCommand({
      Bucket: process.env.R2_BUCKET ?? 'blue-shores',
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: [
              'https://blue-shores-pm.vercel.app',
              'http://localhost:3000',
            ],
            AllowedMethods: ['PUT', 'GET'],
            AllowedHeaders: ['Content-Type', 'Content-Length'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 86400,
          },
        ],
      },
    })
  )
  console.log('R2 CORS configured successfully')
}

main().catch((err) => {
  console.error('Failed to set CORS:', err)
  process.exit(1)
})
