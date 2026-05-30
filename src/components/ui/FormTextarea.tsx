import { TextareaHTMLAttributes } from 'react';

const TEXTAREA_CLS =
  'w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none focus:border-violet-500 transition-colors';

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export function FormTextarea({ className, ...props }: FormTextareaProps) {
  return <textarea className={className ? `${TEXTAREA_CLS} ${className}` : TEXTAREA_CLS} {...props} />;
}
