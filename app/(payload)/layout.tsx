import configPromise from "@payload-config";
import { handleServerFunctions, RootLayout } from "@payloadcms/next/layouts";
import type { ReactNode } from "react";
import { importMap } from "./admin/importMap.js";

export default function PayloadLayout({ children }: { children: ReactNode }) {
  return (
    <RootLayout
      config={configPromise}
      importMap={importMap}
      serverFunction={handleServerFunctions}
    >
      {children}
    </RootLayout>
  );
}
