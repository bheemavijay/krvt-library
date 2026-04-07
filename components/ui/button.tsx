import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type BaseButtonProps = {
  className?: string;
  children: React.ReactNode;
};

type ButtonAsButtonProps = BaseButtonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ButtonAsLinkProps = BaseButtonProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

const buttonClasses =
  "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-accent/50 hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50";

export function Button(props: ButtonAsLinkProps): React.JSX.Element;
export function Button(props: ButtonAsButtonProps): React.JSX.Element;
export function Button({ className, children, ...props }: ButtonProps) {
  if ("href" in props && typeof props.href === "string") {
    return (
      <Link className={cn(buttonClasses, className)} {...props}>
        {children}
      </Link>
    );
  }

  const buttonProps = props as ButtonAsButtonProps;

  return (
    <button className={cn(buttonClasses, className)} {...buttonProps}>
      {children}
    </button>
  );
}
