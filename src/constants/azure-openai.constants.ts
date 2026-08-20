export enum AzureOpenAiRegion {
  Aue = 'aue',
  Sea = 'sea',
}

// Which chat models exist, and which Azure OpenAI resource each is deployed
// to. Reflects actual resource topology (not every model is available in
// every region) — update alongside AppConfigService.azureOpenAi.chatDeployments
// if a model moves or a new one is added.
export enum AzureChatModel {
  Gpt41 = 'gpt-4.1',
  Gpt5 = 'gpt-5',
  O4Mini = 'o4-mini',
  Gpt41Mini = 'gpt-4.1-mini',
  Gpt51 = 'gpt-5.1',
}

export const AZURE_CHAT_MODEL_REGION: Readonly<
  Record<AzureChatModel, AzureOpenAiRegion>
> = {
  [AzureChatModel.Gpt41]: AzureOpenAiRegion.Aue,
  [AzureChatModel.Gpt5]: AzureOpenAiRegion.Aue,
  [AzureChatModel.O4Mini]: AzureOpenAiRegion.Aue,
  [AzureChatModel.Gpt41Mini]: AzureOpenAiRegion.Sea,
  [AzureChatModel.Gpt51]: AzureOpenAiRegion.Sea,
};

// The only embedding model currently deployed, and the region it lives in.
export const AZURE_EMBEDDING_REGION = AzureOpenAiRegion.Sea;

// Must match the `embeddings.embedding` pgvector column's dimensions
// (schema.ts, introspected from the DB — see docs/ARCHITECTURE.md §6).
// text-embedding-3-large natively outputs 3072 dimensions, so this is passed
// as an explicit truncation request on every embed call, not just documentation.
export const EMBEDDING_DIMENSIONS = 2000;
