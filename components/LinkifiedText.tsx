import Linkify from "linkify-react";

const linkOptions = {
  className: "text-primary underline underline-offset-2 hover:text-primary/80",
  rel: "noopener noreferrer",
  target: "_blank",
};

export function LinkifiedText({ children }: { children: string }) {
  return <Linkify options={linkOptions}>{children}</Linkify>;
}