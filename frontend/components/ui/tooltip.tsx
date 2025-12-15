import React, { useState } from "react";

type Props = {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
};

export function Tooltip({ content, children, side = "top" }: Props) {
  const [visible, setVisible] = useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={`absolute z-50 px-2 py-1 text-xs text-white bg-zinc-900 dark:bg-zinc-900 light:bg-gray-800 rounded shadow-lg whitespace-nowrap pointer-events-none ${positionClasses[side]}`}
          role="tooltip"
        >
          {content}
          <div
            className={`absolute w-2 h-2 bg-zinc-900 dark:bg-zinc-900 light:bg-gray-800 rotate-45 ${
              side === "top"
                ? "bottom-[-4px] left-1/2 -translate-x-1/2"
                : side === "bottom"
                ? "top-[-4px] left-1/2 -translate-x-1/2"
                : side === "left"
                ? "right-[-4px] top-1/2 -translate-y-1/2"
                : "left-[-4px] top-1/2 -translate-y-1/2"
            }`}
          />
        </div>
      )}
    </div>
  );
}
