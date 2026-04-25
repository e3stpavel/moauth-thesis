import { defineMiddleware } from 'astro:middleware'

export const formatServerErrors = defineMiddleware(async (context, next) => {
  if (!context.url.pathname.startsWith('/oauth')) {
    return next()
  }

  try {
    const response = await next()
    return response
  }
  catch (e) {
    console.error(e)
    return Response.json({ 'error': 'server_error' }, { status: 500 })
  }
})
