import { useState, useCallback } from "react";
import { RecordingState } from "components/recording/recording-state";

interface UseAzureSpeechOptions {
  selectedLanguage: string;
  enableDiarization: boolean;
  transcribed: (sender: unknown, event: { result: { text: string } }) => void;
}

export default function useAzureSpeechv2(_options: UseAzureSpeechOptions) {
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.notStarted);

  const handleStartRecording = useCallback(() => {
    setRecordingState(RecordingState.Recording);
  }, []);

  const handlePauseResume = useCallback(() => {
    setRecordingState((prev) =>
      prev === RecordingState.Paused ? RecordingState.Recording : RecordingState.Paused
    );
  }, []);

  const handleStop = useCallback(() => {
    setRecordingState(RecordingState.Stopped);
  }, []);

  return {
    handleStartRecording,
    handlePauseResume,
    handleStop,
    recordingState,
    stream: null,
  };
}
