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
  "inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 ease-out hover:-translate-y-0.5 hover:border-accent/50 hover:bg-accent-soft hover:shadow-[0_14px_30px_rgba(0,0,0,0.18)] active:translate-y-0 active:shadow-[0_8px_18px_rgba(0,0,0,0.14)] focus-visible:border-accent/70 focus-visible:bg-accent-soft/70 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]";

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
