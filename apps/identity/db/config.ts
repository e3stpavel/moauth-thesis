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
    userId: column.text({ references: () => User.columns.id }),
    lastVerifiedAt: column.date({ default: NOW }),
    createdAt: column.date({ default: NOW }),
  },
})

const ConsentRequest = defineTable({
  columns: {
    idHash: column.text({ primaryKey: true }),
    clientId: column.text(),
    redirectUri: column.text(),
    scope: column.text(),
    createdAt: column.date({ default: NOW }),
  },
})

// https://astro.build/db/config
export default defineDb({
  tables: {
    User,
    Session,
    ConsentRequest,
  },
})
