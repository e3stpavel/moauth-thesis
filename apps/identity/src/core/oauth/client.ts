export interface VerifySecretHashFn {
  (secretHash: string, secret: string): boolean | Promise<boolean>
}

export class Client {
  constructor(
    public id: string,
    private redirectUris: string[],
    private secretHash?: string | null,
  ) {
  }

  get isPublic() {
    return !this.secretHash
  }

  get isConfidential() {
    return !this.isPublic
  }

  async verifySecret(secret: string, verifySecretHashFn: VerifySecretHashFn) {
    if (this.isPublic) {
      throw new Error('Public client cannot have a secret')
    }

    return await verifySecretHashFn(this.secretHash!, secret)
  }

  verifyRedirectUri(redirectUri: string) {
    return this.redirectUris.includes(redirectUri)
  }
}
