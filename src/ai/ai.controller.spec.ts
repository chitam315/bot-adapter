import { BadRequestException } from '@nestjs/common';
import { AiController } from './ai.controller';
import { GenerationService } from './generation.service';

describe('AiController', () => {
  const buildController = (generateReply: jest.Mock) =>
    new AiController({ generateReply } as unknown as GenerationService);

  it('delegates to GenerationService.generateReply and wraps the result', async () => {
    const generateReply = jest.fn().mockResolvedValue('42 is the answer.');
    const controller = buildController(generateReply);

    const result = await controller.generate({
      text: 'What is the answer?',
      history: [{ role: 'user', content: 'Hi' }],
    });

    expect(generateReply).toHaveBeenCalledWith({
      text: 'What is the answer?',
      history: [{ role: 'user', content: 'Hi' }],
      model: undefined,
    });
    expect(result).toEqual({ reply: '42 is the answer.' });
  });

  it('rejects a missing or blank text field', async () => {
    const controller = buildController(jest.fn());

    await expect(controller.generate({ text: '' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(controller.generate({ text: '   ' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
