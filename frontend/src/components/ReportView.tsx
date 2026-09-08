import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ReportViewProps {
  markdown: string;
  generatedAt: string;
  modelUsed: string;
}

export default function ReportView({ markdown, generatedAt, modelUsed }: ReportViewProps) {
  return (
    <div className="report-output">
      <div className="report-output__meta">
        Generated {new Date(generatedAt).toLocaleString()} · model: {modelUsed}
      </div>
      {/* Deliberately no rehype-raw plugin: the AI report is rendered as pure Markdown,
          never as raw HTML, regardless of what the model outputs. */}
      <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
    </div>
  );
}
