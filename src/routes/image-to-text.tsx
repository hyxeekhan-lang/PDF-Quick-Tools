import { createFileRoute } from "@tanstack/react-router";
import { ToolShell } from "#/components/ToolShell";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/image-to-text");

export const Route = createFileRoute("/image-to-text")({
  head: () => pageHead({ title: tool.title, description: tool.description, path: tool.href }),
  component: Stub,
});

function Stub() {
  return <ToolShell tool={tool} faq={[]} about={null}>x</ToolShell>;
}
