interface TestImageOptions {
  content?: string
  name?: string
  type?: string
}

export function createTestFile({
  name = 'test.jpg',
  type = 'image/jpeg',
  content = 'fake-image',
}: TestImageOptions = {}) {
  return new File([content], name, { type })
}
