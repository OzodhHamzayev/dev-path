import { Code2 } from "lucide-react";

export function CourseVisual({
  title,
  tech,
  color,
  compact = false,
}: {
  title: string;
  tech: string;
  color: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`admin-course-visual ${color} ${compact ? "is-compact" : ""}`}
      aria-label={`${title} cover`}
    >
      <span className="admin-visual-grid" />
      <span className="admin-visual-orbit" />
      <Code2 size={compact ? 24 : 64} aria-hidden="true" />
      {!compact && <span>{tech || "Your next chapter"}</span>}
    </div>
  );
}
