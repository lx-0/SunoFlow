import { openApiComponents } from "@/lib/openapi-components";
import { APP_NAME } from "@/lib/branding";
import { openApiPaths } from "@/lib/openapi-paths";

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: `${APP_NAME} API`,
    version: "0.1.0",
    description:
      `${APP_NAME} — AI music generation manager. Manage songs, playlists, tags, templates, and more.`,
  },
  servers: [{ url: "/", description: "Current server" }],
  components: openApiComponents,
  security: [{ session: [] }],
  paths: openApiPaths,
} as const;
