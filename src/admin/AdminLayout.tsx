import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Code2,
  FolderOpen,
  Menu,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useCourseStore } from "../courses/CourseStore";
import "./admin.css";

export function AdminLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { courses } = useCourseStore();
  const location = useLocation();
  const editing = location.pathname.endsWith("/edit");
  const creating = location.pathname.endsWith("/new");
  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${open ? "is-open" : ""}`}>
        <div className="admin-sidebar-brand">
          <span>
            <Code2 size={20} />
          </span>
          <div>
            DevPath <small>STUDIO</small>
          </div>
          <button
            className="icon-button admin-mobile-close"
            aria-label="Close admin navigation"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="admin-nav-label">CONTENT WORKSPACE</div>
        <nav aria-label="Admin navigation" onClick={() => setOpen(false)}>
          <NavLink to="/admin" end>
            <FolderOpen size={18} />
            All courses<span>{courses.length}</span>
          </NavLink>
          <NavLink to="/admin/courses/new">
            <Plus size={18} />
            Create a course
          </NavLink>
          <Link to="/courses">
            <BookOpen size={18} />
            Student catalog
            <ArrowUpRight size={14} />
          </Link>
        </nav>
        <div className="admin-sidebar-note">
          <span>✦</span>
          <h3>Make room for discovery.</h3>
          <p>
            A thoughtful course can be the beginning of someone’s next chapter.
          </p>
        </div>
        <div className="admin-sidebar-bottom">
          <ShieldCheck size={17} />
          <div>
            Course creation API<small>Other changes are browser-only.</small>
          </div>
        </div>
      </aside>
      <div className="admin-main">
        <div className="admin-topbar">
          <button
            className="icon-button admin-menu-toggle"
            aria-label="Toggle admin navigation"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <Menu size={20} />
          </button>
          <span>Workspace</span>
          <ChevronRight size={13} />
          <Link to="/admin">Courses</Link>
          {(editing || creating) && (
            <>
              <ChevronRight size={13} />
              <span>{editing ? "Edit course" : "New course"}</span>
            </>
          )}
          <Link className="admin-back-site" to="/">
            <ArrowLeft size={14} />
            Back to website
          </Link>
        </div>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
