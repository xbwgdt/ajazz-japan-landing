import type { Access, CollectionConfig } from "payload";
import { adminOnly } from "../access/admin";

export const AUDIT_ACTIONS = [
  "login_security",
  "create",
  "edit",
  "publish",
  "unpublish",
  "archive",
  "restore",
  "delete_draft",
  "approve_price",
  "adjust_inventory",
  "retire_media",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

const never: Access = () => false;

export const AuditEvents: CollectionConfig = {
  slug: "audit-events",
  admin: {
    defaultColumns: ["action", "actor", "subjectType", "subjectId", "createdAt"],
    useAsTitle: "action",
  },
  access: {
    create: adminOnly,
    delete: never,
    read: adminOnly,
    update: never,
  },
  fields: [
    {
      name: "action",
      type: "select",
      required: true,
      index: true,
      options: AUDIT_ACTIONS.map((action) => ({ label: action, value: action })),
    },
    { name: "actor", type: "relationship", relationTo: "admins", required: true, index: true },
    { name: "subjectType", type: "text", required: true, index: true },
    { name: "subjectId", type: "text", required: true, index: true },
    { name: "details", type: "json", required: true, defaultValue: {} },
  ],
};
