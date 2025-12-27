import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export default function Card({ children, className = "", title }: CardProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow-lg p-6 border border-gray-200 ${className}`}
    >
      {title && (
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{title}</h2>
      )}
      {children}
    </div>
  );
}

