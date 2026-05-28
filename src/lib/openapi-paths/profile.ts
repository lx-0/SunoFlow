export const profilePaths = {
  "/api/profile": {
    get: {
      tags: ["Profile"],
      summary: "Get current user profile",
      responses: {
        "200": {
          description: "User profile",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  email: { type: "string" },
                  name: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
    patch: {
      tags: ["Profile"],
      summary: "Update profile",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Updated profile",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  email: { type: "string" },
                  name: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
    delete: {
      tags: ["Profile"],
      summary: "Delete account and all data",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["password", "confirmEmail"],
              properties: {
                password: { type: "string" },
                confirmEmail: { type: "string", format: "email" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Account deleted",
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
  "/api/profile/api-key": {
    get: {
      tags: ["Profile"],
      summary: "Get Suno API key status",
      responses: {
        "200": {
          description: "API key info",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  hasKey: { type: "boolean" },
                  maskedKey: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
    patch: {
      tags: ["Profile"],
      summary: "Update Suno API key",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["sunoApiKey"],
              properties: {
                sunoApiKey: {
                  type: "string",
                  description: "Empty string to remove key",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Updated key info",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  hasKey: { type: "boolean" },
                  maskedKey: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/profile/password": {
    post: {
      tags: ["Profile"],
      summary: "Change password (alias)",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["currentPassword", "newPassword", "confirmPassword"],
              properties: {
                currentPassword: { type: "string" },
                newPassword: { type: "string", minLength: 8 },
                confirmPassword: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Password changed",
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
  "/api/profile/stats": {
    get: {
      tags: ["Profile"],
      summary: "Get user statistics",
      responses: {
        "200": {
          description: "User stats",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ProfileStats" },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
} as const;
