import createClient from "openapi-fetch";
import type { paths } from "../types/openapi";

export function createApiClient(baseUrl: string) {
  return createClient<paths>({ baseUrl });
}

