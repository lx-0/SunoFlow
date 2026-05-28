export const songTagsPaths = {
  "/api/songs/{id}/tags": {
    get: {
      tags: ["Song Tags"],
      summary: "List tags on a song",
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
          description: "Tag list",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tags: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Tag" },
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
      tags: ["Song Tags"],
      summary: "Add a tag to a song (max 10 per song, 30 per user)",
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
                name: {
                  type: "string",
                  description: "Create or find tag by name",
                },
                tagId: {
                  type: "string",
                  format: "uuid",
                  description: "Existing tag ID",
                },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Tag added",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tag: { $ref: "#/components/schemas/Tag" },
                },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "409": {
          description: "Tag already on song",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/api/songs/{id}/tags/{tagId}": {
    delete: {
      tags: ["Song Tags"],
      summary: "Remove a tag from a song",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
        {
          name: "tagId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: {
        "200": {
          description: "Tag removed",
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
} as const;
