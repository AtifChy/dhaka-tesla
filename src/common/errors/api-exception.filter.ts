import {
  type ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";

interface ExceptionBody {
  code?: string;
  message?: string | string[];
  errors?: unknown;
}

const statusCodes: Record<number, string> = {
  400: "VALIDATION_ERROR",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "UNPROCESSABLE_ENTITY",
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<FastifyRequest>();
    const reply = context.getResponse<FastifyReply>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const response = exception instanceof HttpException ? exception.getResponse() : undefined;
    const body: ExceptionBody =
      typeof response === "object" && response !== null
        ? (response as ExceptionBody)
        : { message: typeof response === "string" ? response : undefined };

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} failed`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    void reply.status(status).send({
      error: {
        code: body.code ?? statusCodes[status] ?? "INTERNAL_ERROR",
        message: body.message ?? "An unexpected error occurred",
        ...(body.errors === undefined ? {} : { details: body.errors }),
      },
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  }
}
