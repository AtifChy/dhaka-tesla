import type { ArgumentsHost } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { ApiExceptionFilter } from "./api-exception.filter";

describe("ApiExceptionFilter", () => {
  it("returns Fastify rate-limit errors as 429 instead of 500", () => {
    const send = vi.fn();
    const status = vi.fn(() => ({ send }));
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ method: "GET", url: "/api/v1/rides/options", id: "test-request" }),
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;
    const error = Object.assign(new Error("Rate limit exceeded, retry in 13 seconds"), {
      statusCode: 429,
    });

    new ApiExceptionFilter().catch(error, host);

    expect(status).toHaveBeenCalledWith(429);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: {
          code: "RATE_LIMITED",
          message: "Rate limit exceeded, retry in 13 seconds",
        },
        requestId: "test-request",
      }),
    );
  });
});
