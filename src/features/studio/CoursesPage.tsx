import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/i18n/I18nProvider";
import { createCourse, listCourses } from "./api";

export function CoursesPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");

  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const createMutation = useMutation({
    mutationFn: createCourse,
    onSuccess: () => {
      setTitle("");
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });

  return (
    <section>
      <h1>{t("studio.courses.title")}</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) createMutation.mutate(title.trim());
        }}
      >
        <label>
          {t("studio.courses.titleLabel")}
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <button type="submit" disabled={createMutation.isPending}>
          {t("studio.courses.newCourse")}
        </button>
      </form>

      {coursesQuery.isLoading && <p>{t("common.loading")}</p>}
      {coursesQuery.isError && <p role="alert">{t("common.error")}</p>}

      {coursesQuery.data && coursesQuery.data.length === 0 && <p>{t("studio.courses.empty")}</p>}

      <ul>
        {coursesQuery.data?.map((course) => (
          <li key={course.id}>
            <Link to={`/studio/courses/${course.id}/lessons`}>{course.title}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
