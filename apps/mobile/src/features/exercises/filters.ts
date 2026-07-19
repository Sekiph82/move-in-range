export function paramsFor(search: string, bodyPart: string, equipment: string, target: string, page: number) {
  const params = new URLSearchParams({ page_size: "24", page: String(page), language: "en" });
  if (search.trim()) params.set("q", search.trim());
  if (bodyPart) params.set("body_part", bodyPart);
  if (equipment) params.set("equipment", equipment);
  if (target) params.set("target", target);
  return params.toString();
}
