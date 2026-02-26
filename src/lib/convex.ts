import { ConvexHttpClient } from 'convex/browser'
import { makeFunctionReference } from 'convex/server'

let cachedClient: ConvexHttpClient | null = null

function getConvexUrl(): string {
  const url = process.env.VITE_CONVEX_URL ?? import.meta.env.VITE_CONVEX_URL

  if (!url) {
    throw new Error('Missing Convex URL. Please set VITE_CONVEX_URL in environment variables.')
  }

  return url
}

function getConvexDeployKey(): string {
  const key = process.env.CONVEX_DEPLOY_KEY

  if (!key) {
    throw new Error(
      'Missing Convex deploy key. Please set CONVEX_DEPLOY_KEY in environment variables.',
    )
  }

  return key
}

function getClient(): ConvexHttpClient {
  if (cachedClient) {
    return cachedClient
  }

  const client = new ConvexHttpClient(getConvexUrl())
  ;(client as any).setAdminAuth(getConvexDeployKey())
  ;(client as any).setDebug(false)

  cachedClient = client
  return client
}

export async function convexQuery<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const client = getClient() as any
  return (await client.query(makeFunctionReference(name) as any, (args ?? {}) as any)) as T
}

export async function convexMutation<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const client = getClient() as any
  return (await client.mutation(makeFunctionReference(name) as any, (args ?? {}) as any)) as T
}
