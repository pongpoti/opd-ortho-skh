"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@chakra-ui/react";

/** Form submit button that shows it is working while LINE sign-in starts. */
export function SubmitButton({ loadingText, ...props }: ButtonProps & { loadingText: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending} loadingText={loadingText} {...props} />;
}
