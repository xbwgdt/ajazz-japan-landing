import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import { buildConfig } from "payload";
import sharp from "sharp";
import { Admins } from "./cms/collections/Admins";
import { AuditEvents } from "./cms/collections/AuditEvents";
import { Media } from "./cms/collections/Media";
import { Products } from "./cms/collections/Products";
import { SiteSettings } from "./cms/globals/SiteSettings";
import { createR2StorageOptions } from "./lib/cms/r2-storage";

export default buildConfig({
  admin: {
    user: "admins",
    components: {
      beforeDashboard: ["/cms/admin/Dashboard#Dashboard"],
      views: {
        orders: {
          Component: "/cms/admin/OrdersView#OrdersView",
          exact: true,
          meta: { title: "注文管理 | AJAZZ JAPAN" },
          path: "/orders",
        },
      },
    },
  },
  collections: [Admins, Media, Products, AuditEvents],
  globals: [SiteSettings],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL ?? process.env.POSTGRES_URL,
    },
    schemaName: "cms",
    push: false,
    migrationDir: "cms/migrations",
  }),
  editor: lexicalEditor(),
  plugins: [
    s3Storage(createR2StorageOptions(process.env)),
  ],
  routes: { admin: "/admin", api: "/api/cms" },
  secret: process.env.PAYLOAD_SECRET ?? "",
  sharp,
  typescript: { outputFile: "payload-types.ts" },
});
