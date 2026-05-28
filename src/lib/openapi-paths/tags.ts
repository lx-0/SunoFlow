export const tagsPaths = {
  "/api/tags": {
    get: {
      tags: ["Tags"],
      summary: "List all user tags with song counts",
      responses: {
        "200": {
          description: "Tags with counts",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tags: {
                    type: "array",
                    items: { $ref: "#/components/schemas/TagWithCount" },
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
      tags: ["Tags"],
      summary: "Create a tag (max 30 per user)",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string", maxLength: 50 },
                color: {
                  type: "string",
                  default: "#7c3aed",
                  description: "Hex color",
                },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Tag created",
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
          description: "Tag name already exists",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  "/api/tags/{id}": {
    patch: {
      tags: ["Tags"],
      summary: "Update a tag",
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
                name: { type: "string", maxLength: 50 },
                color: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Updated tag",
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
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
    delete: {
      tags: ["Tags"],
      summary: "Delete a tag",
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
          description: "Tag deleted",
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
