import { InputHTMLAttributes } from 'react';

const INPUT_CLS =
  'w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function FormInput({ className, ...props }: FormInputProps) {
  return <input className={className ? `${INPUT_CLS} ${className}` : INPUT_CLS} {...props} />;
}
