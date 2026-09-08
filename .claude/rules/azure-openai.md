---
paths:
  - "src/azure-openai/**"
  - "src/ai/**"
  - "src/constants/azure-openai.constants.ts"
---

## Two Azure OpenAI resources, one runtime-selectable chat model

`AzureOpenAiProvider`
([azure-openai.provider.ts](../../src/azure-openai/azure-openai.provider.ts))
holds two `createAzure()` clients (regions AUE and SEA — see
`AZURE_CHAT_MODEL_REGION` in `src/constants/azure-openai.constants.ts` for
which `AzureChatModel` lives where); `GenerationService.generateReply` takes
an optional `model` and defaults to
`AppConfigService.azureOpenAi.defaultChatModel` when omitted. Embeddings
only exist in the SEA resource.
