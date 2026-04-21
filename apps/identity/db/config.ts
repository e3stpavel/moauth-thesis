import { column, defineDb, defineTable, NOW } from 'astro:db'

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
    ConsentRequests,
  },
})
