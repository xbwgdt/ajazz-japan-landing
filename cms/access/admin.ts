import type { Access, PayloadRequest } from "payload";

export const isAdmin = ({ req }: { req: PayloadRequest }): boolean => Boolean(req.user);

export const adminOnly: Access = ({ req }) => isAdmin({ req });
