import { postsSchema } from './posts-schema'

export const mediaTypeEnum = postsSchema.enum('media_type', ['image', 'video'])
