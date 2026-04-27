import type { APIRoute } from 'astro'
import { token } from '~/oauth/routes'

export const POST: APIRoute = token
