import type { Client } from './clients'

type Result<T> = [true, T, undefined] | [false, undefined, string]

// NOTE: The authorization server MAY fully or partially ignore the scope requested by the client
//  right now we ignore scopes, but in future we need to check scopes against client permission etc.
//  basically whether we can grant registered client certain scopes (read write edit delete) for certain resource,
//  then it's up to the resource server to decide whether to perform additional (fine-grained) authorization or not

class ScopeSet extends Set<string> {
  /** @returns list of space-delimited, case-sensitive strings */
  encode() {
    return this.values().toArray().sort().join(' ')
  }
}

export type { ScopeSet }

function parse(scope: string): ScopeSet | null {
  const scopes = scope.split(' ').filter(Boolean)
  if (!scopes.every(scope => ['offline_access', 'read', 'write', 'delete'].includes(scope))) {
    return null
  }

  return new ScopeSet(scopes)
}

/**
 * @param client
 * @param requestScope `scope` parameter from request.
 *  If omitted is treated as equal to the scope originally granted (`grantScope`)
 * @param grantScope `scope` originally granted.
 *  If omitted is treated as equal to supported scope, i.e. `*`
 * @returns `scope` granted
 */
export function validate(
  client: Client,
  requestScope: string | undefined,
  grantScope = 'offline_access read write delete',
): Result<ScopeSet> {
  // `grantScope` and `client.scope` are usually coming either from database or hardcoded inside code,
  //  so it must be always a correct value, otherwise panic
  const grantScopeSet = parse(grantScope)
  if (!grantScopeSet) {
    throw new Error('grant_scope includes unsupported value. This typically means that either incorrect \'scope\' was saved to database or you made a mistake in code.')
  }
  const clientScopeSet = parse(client.scope)
  if (!clientScopeSet) {
    throw new Error(`client_scope (${client.id}) includes unsupported value. This typically means that either incorrect \'scope\' was saved to database or you made a mistake in code.`)
  }

  if (!requestScope) {
    requestScope = grantScope
  }
  const requestScopeSet = parse(requestScope)
  if (!requestScopeSet) {
    return [false, undefined, 'Invalid or unknown scope']
  }

  // TODO: check if requested scope is subset of resource supported scope, needs resource implementation
  if (!requestScopeSet.isSubsetOf(grantScopeSet.intersection(clientScopeSet))) {
    return [false, undefined, 'scope exceeds the scope granted by the resource owner or unsupported for given client or grant_type']
  }

  return [true, requestScopeSet, undefined]
}
