import React from "react";

type FormInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
};

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={`w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors${className ? ` ${className}` : ""}`}
      {...rest}
    />
  )
);
FormInput.displayName = "FormInput";

export default FormInput;
