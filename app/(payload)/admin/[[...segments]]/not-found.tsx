import configPromise from "@payload-config";
import { NotFoundPage } from "@payloadcms/next/views";
import { importMap } from "../importMap.js";

type NotFoundProps = {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<Record<string, string | string[]>>;
};

export default function NotFound({ params, searchParams }: NotFoundProps) {
  return NotFoundPage({ config: configPromise, importMap, params, searchParams });
}
