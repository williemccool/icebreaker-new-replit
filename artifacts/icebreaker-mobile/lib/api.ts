import { customFetch } from "@workspace/api-client-react";

export async function get<T = any>(path: string): Promise<T> {
  return customFetch<T>(path, { method: "GET" });
}

export async function post<T = any>(path: string, body?: any): Promise<T> {
  return customFetch<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function del<T = any>(path: string, body?: any): Promise<T> {
  return customFetch<T>(path, {
    method: "DELETE",
    body: body ? JSON.stringify(body) : undefined,
  });
}
