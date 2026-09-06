import { useState, useEffect } from "preact/hooks";

// TODO: use this as general folded block component?

interface FoldingBadgeProps {
    block: HTMLElement;
};

export const CodeFoldingBadge = ({ block }: CodeFoldingBadgeProps) => {
    // Default to expanded
    const [isFolded, setIsFolded] = useState(false);

    // get metadata from host
    const rawText = block.textContent || "";
    const lineCount = rawText.split("\n").length;

    // TODO: Needs the language of the block (or plain text if thats it)
    // Also needs some kind of icon/sticker to make it pretty

    // Then its basically just a span [[icon] -- [language]: [linecount]+" lines"]
    // and we swap them in and out with state change.    
});



/// Example: polymorphic folding badge
//
// import React from 'react';
// // 1. Shared TypeScript Interface
// export interface FoldingBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
//   label: string;
//   isFolded: boolean;
//   onToggle: () => void;
//   children?: React.ReactNode;
// }

// // 2. Private Base Component (Handles shared layout and behavior)
// function BaseFoldingBadge({ 
//   label, 
//   isFolded, 
//   onToggle, 
//   className = '', 
//   children, 
//   ...props 
// }: FoldingBadgeProps & { className?: string }) {
//   return (
//     <div 
//       className={`folding-badge-base ${className}`} 
//       onClick={onToggle}
//       {...props}
//     >
//       <span className="badge-label">{label}</span>
//       {!isFolded && <div className="badge-content">{children}</div>}
//     </div>
//   );
// }

// // 3. Declarative, Public Variants (Sharing the exact same Props interface)

// export function PlainFoldingBadge(props: FoldingBadgeProps) {
//   return <BaseFoldingBadge className="bg-gray-100 border-gray-300 text-gray-800" {...props} />;
// }

// export function CodeFoldingBadge(props: FoldingBadgeProps) {
//   // If "Code" needs unique behavior later (like syntax highlighting or click-to-copy), 
//   // you can easily add it directly here without touching the other variants.
//   return <BaseFoldingBadge className="font-mono bg-amber-50 border-amber-300 text-amber-900" {...props} />;
// }

// export function DiagramFoldingBadge(props: FoldingBadgeProps) {
//   return <BaseFoldingBadge className="bg-blue-50 border-blue-300 text-blue-900 shadow-sm" {...props} />;
// }
