import { useEffect, useState, type FormEvent } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { errorMessage } from "@/lib/errorMessage";
import type { Course } from "@/domain/types";
import { createCourse, listCourses } from "./api";
import type { StudioOutletContext } from "./StudioLayout";

export function CoursesPage() {
  const { userId } = useOutletContext<StudioOutletContext>();
  const { t } = useI18n();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    listCourses()
      .then(setCourses)
      .catch((e) => setError(errorMessage(e)));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const course = await createCourse(userId, name.trim());
      setCourses((prev) => [course, ...(prev ?? [])]);
      setName("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t.studio.coursesTitle}</h1>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.studio.newCourseNamePlaceholder}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
        />
        <button
          type="submit"
          disabled={creating}
          className="bg-gray-900 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50"
        >
          {t.studio.createCourse}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {courses === null ? (
        <p className="text-gray-500">{t.common.loading}</p>
      ) : courses.length === 0 ? (
        <p className="text-gray-500">{t.studio.noCourses}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {courses.map((course) => (
            <li key={course.id}>
              <Link
                to={`/studio/courses/${course.id}`}
                className="block border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-50"
              >
                {course.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
