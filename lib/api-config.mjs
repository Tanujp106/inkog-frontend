const localApiBaseUrl = "http://127.0.0.1:3001/api";
const deployedApiBaseUrl = "https://inkog-backend.onrender.com/api";
const localSocketBaseUrl = "http://127.0.0.1:3001";
const deployedSocketBaseUrl = "https://inkog-backend.onrender.com";

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

export function getInkogSocketBaseUrl({
  nodeEnv = process.env.NODE_ENV,
  configuredUrl = process.env.NEXT_PUBLIC_SOCKET_URL,
  configuredApiUrl = process.env.NEXT_PUBLIC_API_URL,
} = {}) {
  const socketBaseUrl = configuredUrl?.trim();

  if (socketBaseUrl) {
    return socketBaseUrl.replace(/\/$/, "");
  }

  const apiBaseUrl = configuredApiUrl?.trim();

  if (apiBaseUrl) {
    return apiBaseUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }

  return nodeEnv === "development" ? localSocketBaseUrl : deployedSocketBaseUrl;
}
