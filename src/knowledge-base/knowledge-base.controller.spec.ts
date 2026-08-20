import { BadRequestException } from '@nestjs/common';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { KnowledgeBaseService } from './knowledge-base.service';

describe('KnowledgeBaseController', () => {
  const buildController = (search: jest.Mock) =>
    new KnowledgeBaseController({ search } as unknown as KnowledgeBaseService);

  it('delegates to KnowledgeBaseService.search with the query and no limit by default', async () => {
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
    const controller = buildController(search);

    const result = await controller.search('refund policy');

    expect(search).toHaveBeenCalledWith('refund policy', {
      limit: undefined,
    });
    expect(result).toBe(hits);
  });

  it('passes a parsed limit through to the service', async () => {
    const search = jest.fn().mockResolvedValue([]);
    const controller = buildController(search);

    await controller.search('refund policy', '3');

    expect(search).toHaveBeenCalledWith('refund policy', { limit: 3 });
  });

  it('rejects a missing or blank query', async () => {
    const controller = buildController(jest.fn());

    await expect(controller.search('')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(controller.search('   ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a non-positive-integer limit', async () => {
    const controller = buildController(jest.fn());

    await expect(
      controller.search('refund policy', 'not-a-number'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      controller.search('refund policy', '0'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      controller.search('refund policy', '-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
