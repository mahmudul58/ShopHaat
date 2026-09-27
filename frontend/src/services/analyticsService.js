import { apiClient } from "./apiClient";

export async function fetchAnalyticsSummary(period = "daily") {
  const { data } = await apiClient.get("/admin/analytics/summary/", {
    params: { period },
    skipErrorToast: true,
  });
  return data;
}
