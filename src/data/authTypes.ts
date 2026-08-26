export type AuthUser = {
  id: string // Google sub ID
  email: string
  name: string
  givenName?: string
  familyName?: string
  avatarUrl?: string
  lastLoginAt: string
}

export type AuthStatus =
  | 'unauthenticated'
  | 'authenticating'
  | 'authenticated'
  | 'signing_out'
  | 'authentication_error'

export type AuthErrorCode =
  | 'popup_closed'
  | 'access_denied'
  | 'config_missing'
  | 'network_error'
  | 'script_load_failed'
  | 'unknown'

export type AuthError = {
  code: AuthErrorCode
  message: string
}

export type GoogleJwtPayload = {
  iss?: string
  sub: string
  aud?: string
  azp?: string
  email: string
  email_verified?: boolean
  name: string
  picture?: string
  given_name?: string
  family_name?: string
  iat?: number
  exp?: number
}
