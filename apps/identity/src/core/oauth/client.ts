export interface VerifySecretHashFn {
  (secretHash: string, secret: string): boolean | Promise<boolean>
}

interface ClientDB {
  id: string
  name: string
  redirectUris: unknown
  secretHash: string | null
}

export class Client {
  constructor(
    public id: string,
    public name: string,
    private redirectUris: string[], // TODO: should always have at least one uri?
    private secretHash?: string | null,
  ) {
  }

  static parserFromDB({ id, name, redirectUris, secretHash }: ClientDB) {
    // we will not validate data as we trust our db
    return new this(id, name, redirectUris as string[], secretHash)
  }

  get isPublic() {
    return !this.secretHash
  }

  get isConfidential() {
    return !this.isPublic
  }

  async verifySecret(secret: string, verifySecretHashFn: VerifySecretHashFn) {
    if (this.isPublic) {
      throw new Error('Public client cannot hold a secret')
    }

    return await verifySecretHashFn(this.secretHash!, secret)
  }

  verifyRedirectUri(redirectUri: string) {
    return this.redirectUris.includes(redirectUri)
  }

  toDB(): ClientDB {
    return {
      id: this.id,
      name: this.name,
      redirectUris: this.redirectUris,
      secretHash: this.secretHash ?? null,
    }
  }
}
