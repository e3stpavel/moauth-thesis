import type { APIRoute } from 'astro'

export const POST: APIRoute = async () => {
  return Response.json({}, { status: 200 })
}
