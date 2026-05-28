export const playlistsPaths = {
  "/api/playlists": {
    get: {
      tags: ["Playlists"],
      summary: "List playlists with song counts",
      responses: {
        "200": {
          description: "Playlist list",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  playlists: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Playlist" },
                  },
                },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
    post: {
      tags: ["Playlists"],
      summary: "Create a playlist (max 50 per user)",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string", maxLength: 100 },
                description: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Playlist created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  playlist: { $ref: "#/components/schemas/Playlist" },
                },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/playlists/{id}": {
    get: {
      tags: ["Playlists"],
      summary: "Get playlist with songs",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: {
        "200": {
          description: "Playlist with songs",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  playlist: {
                    $ref: "#/components/schemas/PlaylistWithSongs",
                  },
                },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
    patch: {
      tags: ["Playlists"],
      summary: "Update playlist",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string", maxLength: 100 },
                description: { type: "string", nullable: true },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Updated playlist",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  playlist: { $ref: "#/components/schemas/Playlist" },
                },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
    delete: {
      tags: ["Playlists"],
      summary: "Delete a playlist",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: {
        "200": {
          description: "Playlist deleted",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { success: { type: "boolean" } },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/api/playlists/{id}/songs": {
    post: {
      tags: ["Playlists"],
      summary: "Add a song to a playlist (max 500 per playlist)",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["songId"],
              properties: {
                songId: { type: "string", format: "uuid" },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Song added to playlist",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  playlistSong: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      position: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "404": { $ref: "#/components/responses/NotFound" },
        "409": {
          description: "Song already in playlist",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/api/playlists/{id}/songs/{songId}": {
    delete: {
      tags: ["Playlists"],
      summary: "Remove a song from a playlist",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
        {
          name: "songId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: {
        "200": {
          description: "Song removed",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { success: { type: "boolean" } },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/playlists/{id}/reorder": {
    patch: {
      tags: ["Playlists"],
      summary: "Reorder songs in a playlist",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["songIds"],
              properties: {
                songIds: {
                  type: "array",
                  items: { type: "string", format: "uuid" },
                  description:
                    "All song IDs in desired order (must include all songs)",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Reordered",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { success: { type: "boolean" } },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
} as const;
