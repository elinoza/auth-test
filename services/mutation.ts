"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

interface RefreshResponseProps {
  token: string;
  refreshToken: string;
}

async function mutation(endpoint: string, requestParams?: RequestInit) {
  const token = cookies().get("token")?.value;
  const refreshToken = cookies().get("refreshToken")?.value;

  if (!refreshToken && !token) {
    redirect("/logout");
  }

  const computedRequestParams: RequestInit = {
    method: "POST",
    ...requestParams,
    headers: {
      Authorization: `Bearer ${token}`,
      ...requestParams?.headers,
    },
  };

  if (requestParams?.body) {
    const data = JSON.stringify(requestParams.body);
    computedRequestParams.body = data;
  }

  const request = await fetch(
    `${process.env.BASE_URL}${endpoint}`,
    computedRequestParams
  );

  if (!request.ok && request.status !== 401) {
    redirect("/logout"); //TODO: error handling
  }

  if (request.status === 401) {
    if (refreshToken) {
      const refreshRequest = await fetch(
        `${process.env.BASE_URL}/auth/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refreshToken: refreshToken, // Optional, if not provided, the server will use the cookie
            expiresInMins: 30, // optional, defaults to 60
          }),
          credentials: "include", // Include cookies (e.g., accessToken) in the request
        }
      );

      if (refreshRequest.ok) {
        const refreshResponse: RefreshResponseProps =
          await refreshRequest.json();
        cookies().set("token", refreshResponse.token);
        cookies().set("refreshToken", refreshResponse.refreshToken);
        return mutation(endpoint, requestParams);
      } else {
        redirect("/logout");
      }
    } else {
      redirect("/logout");
    }
  }

  return await request.json();
}

export default mutation;
