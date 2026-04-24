import { column, defineDb, defineTable, NOW } from 'astro:db'

const User = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    email: column.text({ unique: true }),
    passwordHash: column.text(),
    createdAt: column.date({ default: NOW }),
  },
})

const Session = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    secretHash: column.text(),
    lastVerifiedAt: column.date({ default: NOW }),
    createdAt: column.date({ default: NOW }),
    // expiredAt: column.date(),
  },
})

const ConsentRequests = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    clientId: column.text(),
    redirectUri: column.text(),
    state: column.text(),
    createdAt: column.date({ default: NOW }),
  },
})

// https://astro.build/db/config
export default defineDb({
  tables: {
    User,
    Session,
    ConsentRequests,
  },
})
