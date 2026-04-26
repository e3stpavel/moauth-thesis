import type { Client } from './clients'

type Result<T> = [true, T] | [false, undefined]

type GrantType = 'authorization_code' | 'refresh_token' | 'client_credentials'

// right now we ignore scopes, but in future we need to check scopes against client permission etc.
//  basically whether we can grant registered client certain scopes (read write edit delete) for certain resource,
//  then it's up to the resource server to decide whether to perform additional (fine-grained) authorization or not
/** @returns space separated list of granted scopes */
export function validateScope(grantType: GrantType, client: Client, scopes: string[] | undefined): Result<string> {
  //  The authorization server MAY fully or partially ignore the scope requested by the client
  if (!scopes) {
    return [true, '']
  }

  if (!scopes.every(scope => ['offline_access', 'read', 'write', 'edit', 'delete'].includes(scope))) {
    return [false, undefined]
  }

  if (scopes.includes('offline_access') && grantType === 'client_credentials') {
    // you can only request access_token with client_credentials grant
    return [false, undefined]
  }

  return [true, scopes.join(' ')]
}
