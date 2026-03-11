import React from "react";
import { ScrollArea } from "components/ui/scroll-area";
import { AnamnesisDocumentDto } from "lib/api/ai-services/anamnesis/dto";

interface AnamnesesSummaryProps {
  insights: AnamnesisDocumentDto["anamnesisInterview"];
}

const AnamnesesSummary: React.FC<AnamnesesSummaryProps> = ({ insights }) => {
  return (
    <ScrollArea className="w-full rounded-md border">
      <dl className="divide-y">
        {Object.keys(insights).map((key) => (
          <div
            key={key}
            className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"
          >
            <dt className="text-sm font-medium text-gray-500">{key}</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
              {insights[key]}
            </dd>
          </div>
        ))}
      </dl>
    </ScrollArea>
  );
};

export default AnamnesesSummary;
