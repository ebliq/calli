// SpeakerAssignment.tsx
import React from "react";
import { PlusCircleIcon, User } from "lucide-react";
import { Button } from "../button";
import { TranscriptionSegmentDto } from "lib/api/ai-services/anamnesis/dto";

interface SpeakerAssignmentProps {
  speakers: string[];
  speakerMapping: { [speaker: string]: string };
  setSpeakerMapping: React.Dispatch<
    React.SetStateAction<{ [speaker: string]: string }>
  >;
  roleOptions: string[];
  setSegments: React.Dispatch<React.SetStateAction<TranscriptionSegmentDto[]>>;
}

const SpeakerAssignment: React.FC<SpeakerAssignmentProps> = ({
  speakers,
  speakerMapping,
  setSpeakerMapping,
  roleOptions,
  setSegments,
}) => {
  const speakersWithFallBack = Array.from(
    new Set([...speakers, "Guest-1", "Guest-2"])
  );
  return (
    <div className="items-start w-full my-4">
      <div className="flex flex-col gap-2 flex-wrap ">
        {speakersWithFallBack.map((speaker) => (
          <div key={speaker} className="flex items-center gap-4 ">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-5 h-5 text-gray-500" />
              <span className="whitespace-nowrap font-bold">{speaker}</span>
            </div>
            <select
              className="text-sm border py-2 border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background"
              value={speakerMapping[speaker] || ""}
              onChange={(e) => {
                const value = e.target.value;
                setSpeakerMapping((old) => ({
                  ...old,
                  [speaker]: value,
                }));
              }}
            >
              <option value="">-- Zuordnen --</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>

            <Button
              className="text-sm"
              size={"sm"}
              variant={"outline"}
              onClick={() => {
                setSegments((old) => {
                  const newData = [...old];
                  newData.push({
                    role: speakerMapping[speaker],
                    speaker,
                    text: "manuell hinzugefügt, bitte text anpassen",
                    timestamp: new Date().toISOString(),
                  });
                  return newData;
                });
              }}
            >
              <PlusCircleIcon className="w-5 h-5 text-gray-500" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpeakerAssignment;
