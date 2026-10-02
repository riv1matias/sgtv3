import { createHash, randomBytes } from 'node:crypto'
import { createRemoteJWKSet, jwtVerify } from 'jose'

/**
 * Cliente OIDC mínimo (flujo authorization code + PKCE) para el IdP corporativo IDIRA.
 * Pendiente de validar contra el IdP real: issuer, client_id/secret y claims que entrega.
 */
interface Descubrimiento { authorization_endpoint: string; token_endpoint: string; jwks_uri: string; issuer: string; end_session_endpoint?: string }

let cache: { d: Descubrimiento; jwks: ReturnType<typeof createRemoteJWKSet> } | null = null

export function configOidc() {
  const issuer = process.env.OIDC_ISSUER
  const clientId = process.env.OIDC_CLIENT_ID
  const clientSecret = process.env.OIDC_CLIENT_SECRET
  const redirectUri = process.env.OIDC_REDIRECT_URI
  if (!issuer || !clientId || !redirectUri) throw new Error('Falta configurar OIDC_ISSUER, OIDC_CLIENT_ID y OIDC_REDIRECT_URI')
  return { issuer: issuer.replace(/\/$/, ''), clientId, clientSecret, redirectUri }
}

async function descubrir() {
  if (cache) return cache
  const { issuer } = configOidc()
  const r = await fetch(`${issuer}/.well-known/openid-configuration`)
  if (!r.ok) throw new Error(`No se pudo leer la configuración OIDC de ${issuer}`)
  const d = (await r.json()) as Descubrimiento
  cache = { d, jwks: createRemoteJWKSet(new URL(d.jwks_uri)) }
  return cache
}

const b64url = (b: Buffer) => b.toString('base64url')

export async function urlDeIngreso() {
  const { clientId, redirectUri } = configOidc()
  const { d } = await descubrir()
  const state = b64url(randomBytes(24))
  const nonce = b64url(randomBytes(24))
  const verifier = b64url(randomBytes(48))
  const challenge = b64url(createHash('sha256').update(verifier).digest())
  const u = new URL(d.authorization_endpoint)
  u.search = new URLSearchParams({
    response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope: 'openid profile email',
    state, nonce, code_challenge: challenge, code_challenge_method: 'S256',
  }).toString()
  return { url: u.toString(), state, nonce, verifier }
}

export interface Identidad { sub: string; email: string | null; nombre: string | null; apellido: string | null }

export async function canjearCodigo(code: string, verifier: string, nonce: string): Promise<Identidad> {
  const { clientId, clientSecret, redirectUri, issuer } = configOidc()
  const { d, jwks } = await descubrir()
  const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, code_verifier: verifier })
  if (clientSecret) body.set('client_secret', clientSecret)
  const r = await fetch(d.token_endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  if (!r.ok) throw new Error(`El IdP rechazó el código (${r.status})`)
  const tok = (await r.json()) as { id_token?: string }
  if (!tok.id_token) throw new Error('El IdP no devolvió id_token')
  const { payload } = await jwtVerify(tok.id_token, jwks, { issuer: d.issuer ?? issuer, audience: clientId })
  if (payload.nonce !== nonce) throw new Error('Nonce inválido')
  return {
    sub: String(payload.sub),
    email: (payload.email as string | undefined) ?? (payload.preferred_username as string | undefined) ?? null,
    nombre: (payload.given_name as string | undefined) ?? null,
    apellido: (payload.family_name as string | undefined) ?? null,
  }
}
