export const songsPaths = {
  "/api/songs": {
    get: {
      tags: ["Songs"],
      summary: "List songs with filtering and sorting",
      parameters: [
        {
          name: "q",
          in: "query",
          schema: { type: "string" },
          description: "Search by title or prompt",
        },
        {
          name: "status",
          in: "query",
          schema: {
            type: "string",
            enum: ["ready", "pending", "failed"],
          },
          description: "Filter by generation status",
        },
        {
          name: "minRating",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 5 },
          description: "Minimum rating filter",
        },
        {
          name: "sortBy",
          in: "query",
          schema: {
            type: "string",
            enum: ["newest", "oldest", "highest_rated", "title_az"],
            default: "newest",
          },
        },
        {
          name: "sortDir",
          in: "query",
          schema: { type: "string", enum: ["asc", "desc"] },
        },
        {
          name: "dateFrom",
          in: "query",
          schema: { type: "string", format: "date" },
          description: "Start date filter (ISO)",
        },
        {
          name: "dateTo",
          in: "query",
          schema: { type: "string", format: "date" },
          description: "End date filter (ISO)",
        },
        {
          name: "tagId",
          in: "query",
          schema: { type: "string", format: "uuid" },
          description: "Filter by tag ID",
        },
      ],
      responses: {
        "200": {
          description: "Song list",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  songs: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Song" },
                  },
                },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "500": { $ref: "#/components/responses/InternalError" },
      },
    },
  },
  "/api/generate": {
    post: {
      tags: ["Songs"],
      summary: "Generate a new song via Suno API",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["prompt"],
              properties: {
                prompt: { type: "string" },
                title: { type: "string" },
                tags: { type: "string" },
                makeInstrumental: { type: "boolean" },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Song generation started",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  songs: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Song" },
                  },
                  rateLimit: { $ref: "#/components/schemas/RateLimitStatus" },
                },
              },
            },
          },
        },
        "400": { $ref: "#/components/responses/InternalError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "429": {
          description: "Rate limit exceeded",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { error: "Rate limit exceeded" },
            },
          },
        },
      },
    },
  },
  "/api/songs/{id}/status": {
    get: {
      tags: ["Songs"],
      summary: "Get song generation status (polls Suno if pending)",
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
          description: "Song with current status",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  song: { $ref: "#/components/schemas/Song" },
                },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/api/songs/{id}/favorite": {
    patch: {
      tags: ["Songs"],
      summary: "Toggle song favorite status",
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
          description: "Updated favorite status",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { isFavorite: { type: "boolean" } },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/api/songs/{id}/rating": {
    patch: {
      tags: ["Songs"],
      summary: "Set song rating",
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
              required: ["stars"],
              properties: {
                stars: {
                  type: "integer",
                  minimum: 0,
                  maximum: 5,
                  description: "0 clears the rating",
                },
                note: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Updated rating",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  rating: { type: "integer", nullable: true },
                  ratingNote: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/api/songs/{id}/share": {
    patch: {
      tags: ["Songs"],
      summary: "Toggle public sharing",
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
          description: "Updated share status",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  isPublic: { type: "boolean" },
                  publicSlug: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/api/songs/batch": {
    post: {
      tags: ["Songs"],
      summary: "Batch operations on songs (max 50)",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["action", "songIds"],
              properties: {
                action: {
                  type: "string",
                  enum: ["favorite", "unfavorite", "delete"],
                },
                songIds: {
                  type: "array",
                  items: { type: "string", format: "uuid" },
                  maxItems: 50,
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Batch result",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  affected: { type: "integer" },
                  songIds: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
} as const;
