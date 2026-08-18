"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createKnowledgeBaseTool = createKnowledgeBaseTool;
const ai_1 = require("ai");
const zod_1 = require("zod");
const knowledgeBaseToolInputSchema = zod_1.z.object({
    query: zod_1.z
        .string()
        .describe('The user question or topic to search the internal knowledge base for.'),
});
function createKnowledgeBaseTool(knowledgeBaseService) {
    return (0, ai_1.tool)({
        description: "Search the internal FAQ and document knowledge base for information relevant to the user's " +
            'question. Use this whenever the question might be answered by internal company documentation ' +
            'or FAQs, rather than general knowledge.',
        inputSchema: knowledgeBaseToolInputSchema,
        execute: async ({ query }) => knowledgeBaseService.search(query),
    });
}
//# sourceMappingURL=knowledge-base.tool.js.map