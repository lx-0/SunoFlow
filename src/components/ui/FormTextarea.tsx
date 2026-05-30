import React from "react";

type FormTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  className?: string;
};

const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className, ...rest }, ref) => (
    <textarea
      ref={ref}
      className={`w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none focus:border-violet-500 transition-colors${className ? ` ${className}` : ""}`}
      {...rest}
    />
  )
);
FormTextarea.displayName = "FormTextarea";

export default FormTextarea;
