import { column, defineDb, defineTable, NOW } from 'astro:db'

const Clients = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    name: column.text(),
    isPublic: column.boolean(),
    secretHash: column.text({ optional: true }), // secret is not issued to public clients
    redirectUris: column.json({ default: [] }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
})

// https://astro.build/db/config
export default defineDb({
  tables: {
    Clients,
  },
})
