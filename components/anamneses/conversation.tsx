import React from "react";
import { ScrollArea } from "components/ui/scroll-area";
import { TranscriptionSegmentDto } from "lib/api/ai-services/anamnesis/dto";
import SpeakerSegmentItem from "../ui/custom/SpeakerSegmentItem";

interface ConversationProps {
  conversation: TranscriptionSegmentDto[];
}

const Conversation: React.FC<ConversationProps> = ({ conversation }) => {
  return (
    <ScrollArea className=" w-full">
      {conversation.map((segment, id) => {
        const date = new Date(segment.timestamp || "");
        return (
          <SpeakerSegmentItem
            key={date.toISOString()}
            id={date.toISOString()}
            segment={segment}
          />
        );
      })}
    </ScrollArea>
  );
};

export default Conversation;
