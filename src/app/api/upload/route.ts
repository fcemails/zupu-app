import { getSession } from '@/lib/session'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { jsonError, jsonOK, jsonServerError } from '@/lib/apiResponse'
import { requireRole } from '@/lib/permissions'

const MAX_SIZE = 4 * 1024 * 1024 // 4 MB
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return jsonError('UNAUTHORIZED', 'Unauthorized', 401)

  const formData = await req.formData().catch(() => null)
  if (!formData) return jsonError('INVALID_REQUEST', '无效请求', 400)

  const familyId = formData.get('familyId')?.toString()
  if (!familyId) return jsonError('MISSING_PARAM', 'familyId is required', 400)

  try {
    await requireRole(session.userId, familyId, 'editor')
  } catch {
    return jsonError('FORBIDDEN', 'Forbidden', 403)
  }

  const file = formData.get('file') as File | null
  if (!file) return jsonError('MISSING_FILE', '未提供文件', 400)

  if (!ALLOWED.has(file.type)) {
    return jsonError('INVALID_TYPE', '仅支持 JPG、PNG、WebP、GIF 格式', 400)
  }
  if (file.size > MAX_SIZE) {
    return jsonError('TOO_LARGE', '文件不能超过 4 MB', 400)
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const uploadDir = join(process.cwd(), 'public', 'uploads', familyId)

  try {
    await mkdir(uploadDir, { recursive: true })
    await writeFile(join(uploadDir, filename), Buffer.from(await file.arrayBuffer()))
    const relPath = `/uploads/${familyId}/${filename}`
    // Build absolute URL from request origin so client can always fetch it
    const origin = new URL(req.url).origin
    const url = `${origin}${relPath}`
    console.log('Upload saved:', { userId: session.userId, familyId, path: relPath, url })
    return jsonOK({ url, familyId })
  } catch (err) {
    return jsonServerError(err, { familyId })
  }
}
