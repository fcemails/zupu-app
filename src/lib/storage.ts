import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local'
const LOCAL_UPLOAD_DIR = join(process.cwd(), 'public', 'uploads')

export type UploadResult = {
  url: string
  path: string
}

export async function uploadFile(options: {
  familyId: string
  fileName: string
  data: Uint8Array
  contentType: string
}): Promise<UploadResult> {
  const cleanName = sanitizeFileName(options.fileName)
  const key = `${options.familyId}/${randomUUID()}-${cleanName}`

  if (STORAGE_PROVIDER === 's3') {
    return uploadToS3({ key, data: options.data, contentType: options.contentType })
  }

  return uploadToLocal({ key, data: options.data })
}

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/[^a-zA-Z0-9-_\.]/g, '-')
    .replace(/[-]{2,}/g, '-')
    .slice(0, 120)
}

async function uploadToLocal({ key, data }: { key: string; data: Uint8Array }) {
  const targetDir = join(LOCAL_UPLOAD_DIR, key.substring(0, key.lastIndexOf('/')))
  await mkdir(targetDir, { recursive: true })
  const filePath = join(LOCAL_UPLOAD_DIR, key)
  await writeFile(filePath, data)
  return { url: `/uploads/${key}`, path: filePath }
}

async function uploadToS3({ key, data, contentType }: { key: string; data: Uint8Array; contentType: string }) {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
  const bucket = process.env.S3_BUCKET
  const region = process.env.S3_REGION
  if (!bucket || !region) {
    throw new Error('S3_BUCKET and S3_REGION must be configured for S3 storage')
  }

  const client = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    },
    endpoint: process.env.S3_ENDPOINT || undefined,
  })

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: data,
    ContentType: contentType,
    ACL: 'public-read',
  }))

  const url = process.env.S3_ENDPOINT
    ? `${process.env.S3_ENDPOINT.replace(/\/$/, '')}/${bucket}/${key}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${key}`

  return { url, path: key }
}
