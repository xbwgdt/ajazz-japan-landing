import configPromise from "@payload-config";
import { generatePageMetadata, RootPage } from "@payloadcms/next/views";
import { notFound } from "next/navigation";
import { importMap } from "../importMap.js";

type PageProps = {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<Record<string, string | string[]>>;
};

export const generateMetadata = ({ params, searchParams }: PageProps) =>
  generatePageMetadata({ config: configPromise, params, searchParams });

export default async function Page({ params, searchParams }: PageProps) {
  const { segments } = await params;
  if (segments?.length === 1 && segments[0] === "create-first-user") {
    notFound();
  }
  return RootPage({ config: configPromise, importMap, params, searchParams });
}
