interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

interface TranslationResult {
  success: boolean;
  data: { translation: string };
}

export async function simpleAiTranslation(
  _request: TranslationRequest
): Promise<TranslationResult> {
  return { success: false, data: { translation: "" } };
}
