export const promptTemplatesPaths = {
  "/api/prompt-templates": {
    get: {
      tags: ["Prompt Templates"],
      summary: "List prompt templates (built-in + user)",
      responses: {
        "200": {
          description: "Template list",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  templates: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/PromptTemplate",
                    },
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
      tags: ["Prompt Templates"],
      summary: "Create a prompt template (max 20 per user)",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "prompt"],
              properties: {
                name: { type: "string" },
                prompt: { type: "string" },
                style: { type: "string" },
                isInstrumental: { type: "boolean" },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Template created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  template: {
                    $ref: "#/components/schemas/PromptTemplate",
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
  "/api/prompt-templates/{id}": {
    delete: {
      tags: ["Prompt Templates"],
      summary: "Delete a user-created template",
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
          description: "Template deleted",
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
        "403": {
          description: "Cannot delete built-in templates",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
} as const;
