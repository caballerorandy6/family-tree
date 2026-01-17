import dotenv from 'dotenv';
import { resolve } from 'path';
import { defineConfig } from 'prisma/config';

dotenv.config({ path: resolve(__dirname, '../../.env') });

// Use dummy URL for prisma generate during build (doesn't connect to DB)
const databaseUrl = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});
