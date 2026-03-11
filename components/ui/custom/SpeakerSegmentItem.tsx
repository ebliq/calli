import React from "react";
import { Textarea } from "components/ui/textarea";
import { Button } from "components/ui/button";
import { Check, Trash2 } from "lucide-react";
import { TranscriptionSegmentDto } from "lib/api/ai-services/anamnesis/dto";

const getSentenceCount = (text: string) => {
  return text.split(/[.!?]+/).filter(Boolean).length;
};

function getDisplayRole(segment: TranscriptionSegmentDto) {
  if (segment.role) return segment.role?.trim();
  if (segment.speaker) return segment.speaker;
  return "Unbekannt";
}

interface SpeakerSegmentItemProps {
  id: string;
  segment: TranscriptionSegmentDto;
  setSegments?: React.Dispatch<React.SetStateAction<TranscriptionSegmentDto[]>>;
  handleDeleteSegment?: (index: string) => void;
}

const SpeakerSegmentItem: React.FC<SpeakerSegmentItemProps> = ({
  id,
  segment,
  setSegments,
  handleDeleteSegment,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);

  const displayRole = getDisplayRole(segment);

  return (
    <div key={id} className="flex items-start space-x-2 bg-primary-50 mb-2 p-2">
      <div className="pr-2 flex flex-col justify-between w-1/5 overflow-hidden">
        <div className="font-semibold text-sm">{displayRole}</div>
        {handleDeleteSegment && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const k = new Date(segment.timestamp || "").toISOString() || "";
              handleDeleteSegment(k);
            }}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Abschnitt löschen</span>
          </Button>
        )}
      </div>
      <div className="flex-grow w-4/5">
        {isEditing ? (
          <div className="flex items-center space-x-2">
            <Textarea
              className="flex-grow p-2 border border-border rounded resize-none overflow-hidden"
              style={{ height: "auto" }}
              rows={getSentenceCount(segment.text) || 1}
              value={segment.text}
              onChange={(e) => {
                const newVal = e.target.value;
                console.log(newVal, id);
                // State anpassen
                if (setSegments)
                  setSegments((prev) => {
                    const copy = [...prev];
                    const index = copy.findIndex(
                      (x) => new Date(x.timestamp || "").toISOString() === id
                    );
                    copy[index] = {
                      ...copy[index],
                      text: newVal,
                    };
                    return copy;
                  });
              }}
              autoFocus
            />
            <Button
              size="icon"
              onClick={() => {
                setIsEditing((v) => !v);
              }}
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <p
              onClick={() => {
                if (!setSegments) return;
                setIsEditing((v) => !v);
              }}
              className="text-sm text-foreground cursor-pointer"
            >
              {segment.text}
            </p>
            <span className="text-xs text-muted mr-2">
              {new Date(segment.timestamp || "").getHours()}:
              {String(new Date(segment.timestamp || "").getMinutes()).padStart(
                2,
                "0"
              )}
              :
              {String(new Date(segment.timestamp || "").getSeconds()).padStart(
                2,
                "0"
              )}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default SpeakerSegmentItem;
