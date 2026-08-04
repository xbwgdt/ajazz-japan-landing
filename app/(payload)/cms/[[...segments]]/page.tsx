import configPromise from "@payload-config";
import { generatePageMetadata, RootPage } from "@payloadcms/next/views";
import { importMap } from "../importMap.js";

type PageProps = {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<Record<string, string | string[]>>;
};

export const generateMetadata = ({ params, searchParams }: PageProps) =>
  generatePageMetadata({ config: configPromise, params, searchParams });

export default function Page({ params, searchParams }: PageProps) {
  return RootPage({ config: configPromise, importMap, params, searchParams });
}
