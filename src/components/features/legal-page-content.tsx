import React from 'react';

interface LegalPageContentProps {
  title: string;
  children: React.ReactNode;
}

export function LegalPageContent({ title, children }: LegalPageContentProps) {
  return (
    <article className="text-gray-700 leading-relaxed">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 border-b pb-4">
        {title}
      </h1>
      <div className="space-y-6 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-gray-800 [&_h2]:mt-8 [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_strong]:font-semibold [&_strong]:text-gray-800">
        {children}
      </div>
    </article>
  );
}