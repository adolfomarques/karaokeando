import React, { useState } from "react";

const TruncatedText = ({
  text,
  maxLength,
  style,
}: {
  text: string;
  maxLength: number;
  style?: React.CSSProperties;
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const needsTruncation = text.length > maxLength;
  const displayText = needsTruncation
    ? text.slice(0, maxLength).trim() + "..."
    : text;

  if (!needsTruncation) {
    return <span style={style}>{text}</span>;
  }

  return (
    <span
      style={{ position: "relative", cursor: "pointer", ...style }}
      onClick={e => {
        e.stopPropagation();
        setShowTooltip(!showTooltip);
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {displayText}
      {showTooltip && (
        <span
          style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            right: 0,
            marginBottom: 8,
            padding: "8px 12px",
            background: "#333",
            border: "1px solid #555",
            borderRadius: 8,
            fontSize: "0.85rem",
            color: "#fff",
            whiteSpace: "normal",
            wordBreak: "break-word",
            zIndex: 100,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            minWidth: 200,
            maxWidth: 280,
          }}
          onClick={e => e.stopPropagation()}
        >
          {text}
        </span>
      )}
    </span>
  );
};

export default TruncatedText;
