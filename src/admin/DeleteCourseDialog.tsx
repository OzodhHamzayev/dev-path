import { useEffect, useRef } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

export function DeleteCourseDialog({
  title,
  error,
  deleting,
  onCancel,
  onDelete,
}: {
  title: string;
  error: string;
  deleting: boolean;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="admin-delete-dialog"
      aria-labelledby="delete-title"
      aria-describedby="delete-description"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="admin-dialog-content">
        <button
          className="icon-button admin-dialog-close"
          aria-label="Close delete confirmation"
          onClick={onCancel}
        >
          <X size={20} />
        </button>
        <span className="admin-danger-icon">
          <AlertTriangle size={25} />
        </span>
        <h2 id="delete-title">Delete this course?</h2>
        <p id="delete-description">
          “{title}” will be removed from your catalog and learning dashboard in
          this browser. This action cannot be undone.
        </p>
        {error && (
          <p role="alert" className="admin-error">
            {error}
          </p>
        )}
        <div className="admin-dialog-actions">
          <button
            className="button secondary"
            autoFocus
            onClick={onCancel}
            disabled={deleting}
          >
            Keep course
          </button>
          <button
            className="button admin-danger-button"
            onClick={onDelete}
            disabled={deleting}
          >
            <Trash2 size={16} />
            {deleting ? "Deleting…" : "Delete course"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
