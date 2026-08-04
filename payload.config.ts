import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";
import { Admins } from "./cms/collections/Admins";

export default buildConfig({
  admin: { user: "admins" },
  collections: [Admins],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL ?? process.env.POSTGRES_URL,
    },
    schemaName: "cms",
    push: false,
    migrationDir: "cms/migrations",
  }),
  editor: lexicalEditor(),
  routes: { admin: "/cms", api: "/api/cms" },
  secret: process.env.PAYLOAD_SECRET ?? "",
  sharp,
  typescript: { outputFile: "payload-types.ts" },
});
