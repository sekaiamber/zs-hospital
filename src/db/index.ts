import { PrismaClient } from '@prisma/client'

export type IDBClient = typeof DBClient

const DBClient = {
  instance: new PrismaClient(),
}
Object.freeze(DBClient)

export { DBClient }
