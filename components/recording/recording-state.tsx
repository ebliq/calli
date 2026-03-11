export enum RecordingState {
  notStarted,
  waitingForRecording,
  Paused,
  Recording,
  Stopped,
  Error,
}

function DisplayRecordingState({
  recordingState,
}: {
  recordingState: RecordingState;
}) {
  return (
    <p className="text-lg font-medium text-foreground min-h-[28px]">
      {recordingState === RecordingState.notStarted &&
        "Klicken Sie zum Starten"}
      {recordingState === RecordingState.waitingForRecording &&
        "Bereite Aufnahme vor..."}
      {recordingState === RecordingState.Paused && "⏸️ Aufnahme pausiert..."}
      {recordingState === RecordingState.Recording && "🎙️ Aufnahme läuft..."}
      {(recordingState === RecordingState.Stopped ||
        recordingState === RecordingState.Error) && "\u00A0"}
    </p>
  );
}

export { DisplayRecordingState };
