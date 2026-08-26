export function paramsFor(filters: Record<string, string | boolean>, page: number, pageSize = 24, language = "en") {
  const params = new URLSearchParams({ page_size: "24", page: String(page), language: "en" });
  params.set("page_size", String(pageSize));
  params.set("language", language);
  Object.entries(filters).forEach(([key, value]) => {
    if (typeof value === "string" && value.trim()) params.set(key, value.trim());
    if (typeof value === "boolean" && value) params.set(key, "true");
  });
  return params.toString();
}
