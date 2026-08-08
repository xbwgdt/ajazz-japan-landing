import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import { buildConfig } from "payload";
import sharp from "sharp";
import { Admins } from "./cms/collections/Admins";
import { AuditEvents } from "./cms/collections/AuditEvents";
import { Media } from "./cms/collections/Media";
import { Products } from "./cms/collections/Products";

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
    s3Storage({
      bucket: process.env.R2_BUCKET ?? "",
      collections: {
        media: {
          disablePayloadAccessControl: true,
          generateFileURL: ({ filename }) => (
            `${(process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "")}/${filename}`
          ),
        },
      },
      config: {
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
        },
        endpoint: process.env.R2_ENDPOINT,
        forcePathStyle: true,
        region: "auto",
      },
      enabled: Boolean(process.env.R2_BUCKET),
    }),
  ],
  routes: { admin: "/admin", api: "/api/cms" },
  secret: process.env.PAYLOAD_SECRET ?? "",
  sharp,
  typescript: { outputFile: "payload-types.ts" },
});
