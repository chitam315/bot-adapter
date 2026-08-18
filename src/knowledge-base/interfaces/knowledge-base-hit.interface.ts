export type KnowledgeBaseSourceType = 'document' | 'faq';

/**
 * Internal service -> tool contract. Never returned directly from an HTTP
 * controller, so it's not an API DTO.
 */
export interface KnowledgeBaseHit {
  content: string;
  sourceType: KnowledgeBaseSourceType;
  sourceId: string;
  title: string | null;
  score: number;
}
