import { authPaths } from "./auth";
import { operationalPaths } from "./operational";
import { playlistsPaths } from "./playlists";
import { profilePaths } from "./profile";
import { promptTemplatesPaths } from "./prompt-templates";
import { songTagsPaths } from "./song-tags";
import { songsPaths } from "./songs";
import { tagsPaths } from "./tags";

export const openApiPaths = {
  ...authPaths,
  ...profilePaths,
  ...songsPaths,
  ...songTagsPaths,
  ...tagsPaths,
  ...playlistsPaths,
  ...promptTemplatesPaths,
  ...operationalPaths,
} as const;
