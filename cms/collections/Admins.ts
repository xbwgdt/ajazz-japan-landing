import type { CollectionConfig } from "payload";
import { adminOnly, isAdmin } from "../access/admin";

export const Admins: CollectionConfig = {
  slug: "admins",
  admin: {
    useAsTitle: "email",
  },
  auth: {
    tokenExpiration: 28800,
    maxLoginAttempts: 5,
    lockTime: 900000,
  },
  access: {
    admin: isAdmin,
    create: adminOnly,
    delete: adminOnly,
    read: adminOnly,
    update: adminOnly,
  },
  fields: [
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "administrator",
      options: [
        {
          label: "Administrator",
          value: "administrator",
        },
      ],
    },
  ],
};
