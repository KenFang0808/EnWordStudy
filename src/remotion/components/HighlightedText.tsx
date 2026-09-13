import React from "react";

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const HighlightedText: React.FC<{
  readonly text: string;
  readonly term: string;
  readonly accentColor?: string;
}> = ({ text, term, accentColor = "#22D3EE" }) => {
  if (!term.trim()) {
    return text;
  }

  const pattern = new RegExp(`(${escapeRegExp(term)})`, "gi");
  return (
    <>
      {text.split(pattern).map((part, index) =>
        part.toLowerCase() === term.toLowerCase() ? (
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
