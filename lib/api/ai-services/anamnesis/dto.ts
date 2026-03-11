export interface TranscriptionSegmentDto {
  role?: string;
  speaker?: string;
  text: string;
  timestamp?: string;
}

export interface AnamnesisDocumentDto {
  anamnesisInterview: Record<string, string>;
}
