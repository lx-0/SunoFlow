export const operationalPaths = {
  "/api/rate-limit": {
    get: {
      tags: ["Rate Limit"],
      summary: "Get rate limit info",
      responses: {
        "200": {
          description: "Rate limit data",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RateLimitStatus" },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/rate-limit/status": {
    get: {
      tags: ["Rate Limit"],
      summary: "Get detailed rate limit status with 7-day history",
      responses: {
        "200": {
          description: "Detailed rate limit status",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RateLimitStatus" },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/dashboard/stats": {
    get: {
      tags: ["Dashboard"],
      summary: "Get dashboard statistics",
      responses: {
        "200": {
          description: "Dashboard stats",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DashboardStats" },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "500": { $ref: "#/components/responses/InternalError" },
      },
    },
  },
  "/api/export": {
    get: {
      tags: ["Export"],
      summary: "Export user data as JSON or CSV",
      parameters: [
        {
          name: "format",
          in: "query",
          schema: {
            type: "string",
            enum: ["json", "csv"],
            default: "json",
          },
        },
        {
          name: "type",
          in: "query",
          schema: {
            type: "string",
            enum: ["songs", "playlists", "all"],
            default: "all",
          },
          description: "CSV only supports songs",
        },
      ],
      responses: {
        "200": {
          description: "File download",
          content: {
            "application/json": {
              schema: { type: "object" },
            },
            "text/csv": {
              schema: { type: "string" },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/onboarding/complete": {
    post: {
      tags: ["Onboarding"],
      summary: "Mark onboarding as complete",
      responses: {
        "200": {
          description: "Onboarding completed",
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
  "/api/onboarding/reset": {
    post: {
      tags: ["Onboarding"],
      summary: "Reset onboarding status",
      responses: {
        "200": {
          description: "Onboarding reset",
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
  "/api/rss/fetch": {
    post: {
      tags: ["RSS"],
      summary: "Fetch RSS feeds (max 10 URLs)",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["urls"],
              properties: {
                urls: {
                  type: "array",
                  items: { type: "string", format: "uri" },
                  maxItems: 10,
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Fetched feeds",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  feeds: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
