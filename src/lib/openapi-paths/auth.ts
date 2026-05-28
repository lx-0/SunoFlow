export const authPaths = {
  "/api/register": {
    post: {
      tags: ["Auth"],
      summary: "Register a new user",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password"],
              properties: {
                name: { type: "string" },
                email: { type: "string", format: "email" },
                password: { type: "string", minLength: 8 },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "User created",
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
        "400": { $ref: "#/components/responses/InternalError" },
        "409": {
          description: "Email already exists",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { error: "Email already registered" },
            },
          },
        },
      },
    },
  },
  "/api/auth/change-password": {
    post: {
      tags: ["Auth"],
      summary: "Change password",
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
        "400": { $ref: "#/components/responses/InternalError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
} as const;
