import "dotenv/config";
import { PrismaPg } from '@prisma/adapter-pg'
// @ts-ignore - We need to import this to get the generated type of the prisma client
import { PrismaClient } from '../../generated/prisma/client'
import { env } from "./env";

const connectionString = `${env.DATABASE_URL}`
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

export default prisma;