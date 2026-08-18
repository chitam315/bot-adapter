import { z } from 'zod';
import { KnowledgeBaseService } from '../../knowledge-base/knowledge-base.service';
import { createKnowledgeBaseTool } from './knowledge-base.tool';

describe('createKnowledgeBaseTool', () => {
  it('validates its input against the query schema', () => {
    const search = jest.fn();
    const tool = createKnowledgeBaseTool({
      search,
    } as unknown as KnowledgeBaseService);
    const inputSchema = tool.inputSchema as z.ZodTypeAny;

    expect(() => inputSchema.parse({})).toThrow();
    expect(inputSchema.parse({ query: 'refund policy' })).toEqual({
      query: 'refund policy',
    });
  });

  it('delegates execution to KnowledgeBaseService.search', async () => {
    const hits = [
      {
        content: 'answer',
        sourceType: 'faq',
        sourceId: 'faq-1',
        title: 'Q',
        score: 0.9,
      },
    ];
    const search = jest.fn().mockResolvedValue(hits);
    const tool = createKnowledgeBaseTool({
      search,
    } as unknown as KnowledgeBaseService);

    const result = await tool.execute!({ query: 'refund policy' }, {} as never);

    expect(search).toHaveBeenCalledWith('refund policy');
    expect(result).toBe(hits);
  });
});
