export type KnowledgeBaseSourceType = 'document' | 'faq';
export interface KnowledgeBaseHit {
    content: string;
    sourceType: KnowledgeBaseSourceType;
    sourceId: string;
    title: string | null;
    score: number;
}
