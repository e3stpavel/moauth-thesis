interface User {
  id: string
  email: string
}

interface Session {
  id: string
  user: User
}

declare namespace App {
  interface Locals {
    session: Session | null
  }
}
