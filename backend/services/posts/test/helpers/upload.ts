import { api } from '@/http/app'
import { createTestFile } from './create-test-file'

interface UploadOptions {
  contentType?: 'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4'
  context?: 'story' | 'post' | 'highlight_cover'
}

export async function upload(
  token: string,
  { context = 'post', contentType = 'image/jpeg' }: UploadOptions = {}
) {
  const file = createTestFile()

  const { data, error } = await api['presign-url'].post(
    {
      context,
      contentType,
    },
    {
      headers: {
        authorization: `Bearer ${token}`,
      },
    }
  )

  if (error) {
    throw new Error(error.value.message)
  }

  const uploadResponse = await fetch(data.url, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  })

  if (!uploadResponse.ok) {
    throw new Error(uploadResponse.statusText)
  }

  return {
    key: data.key,
    url: data.url,
    response: uploadResponse,
  }
}
