import React from "react";
import {
  getWordFamilySplitPattern,
  isWordFamilyForm,
} from "../../utils/wordFamily";

export const HighlightedText: React.FC<{
  readonly text: string;
  readonly term: string;
  readonly accentColor?: string;
}> = ({ text, term, accentColor = "#22D3EE" }) => {
  const trimmedTerm = term.trim();
  if (!trimmedTerm) {
    return text;
  }

  return (
    <>
      {text.split(getWordFamilySplitPattern(trimmedTerm)).map((part, index) =>
        isWordFamilyForm(part, trimmedTerm) ? (
          <span
            key={`${part}-${index}`}
            style={{
              color: accentColor,
              fontWeight: 900,
              textShadow: `0 0 20px ${accentColor}66`,
            }}
          >
            {part}
          </span>
        ) : (
          <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
        ),
      )}
    </>
  );
};
