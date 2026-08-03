const localApiBaseUrl = "http://127.0.0.1:3001/api";
const deployedApiBaseUrl = "https://inkog-backend.onrender.com/api";

export function getInkogApiBaseUrl({
  nodeEnv = process.env.NODE_ENV,
  configuredUrl = process.env.NEXT_PUBLIC_API_URL,
} = {}) {
  const apiBaseUrl = configuredUrl?.trim();

  if (apiBaseUrl) {
    return apiBaseUrl.replace(/\/$/, "");
  }

  return nodeEnv === "development" ? localApiBaseUrl : deployedApiBaseUrl;
}
