import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import { StoreError } from "@/lib/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { issues: { message: string }[] } };

type WriteSchema<T> = {
  safeParse: (data: unknown) => ParseResult<T>;
};

export function storeErrorResponse(error: unknown, fallback: string) {
  if (error instanceof StoreError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: error.status },
    );
  }
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}

export function invalidWriteResponse(
  parsed: Extract<ParseResult<unknown>, { success: false }>,
  fallback: string,
) {
  return NextResponse.json(
    { ok: false, error: parsed.error.issues[0]?.message ?? fallback },
    { status: 400 },
  );
}

export async function handleStoreAction(
  fallbackError: string,
  action: () => Promise<Response>,
) {
  try {
    return await action();
  } catch (error) {
    return storeErrorResponse(error, fallbackError);
  }
}

export async function handleAdminAction(
  fallbackError: string,
  action: () => Promise<Response>,
) {
  const { error } = await requireAdminApi();
  if (error) return error;
  return handleStoreAction(fallbackError, action);
}

export async function parseWriteBody<T>(
  request: Request,
  schema: WriteSchema<T>,
  invalidMessage: string,
): Promise<{ data: T } | { response: NextResponse }> {
  const body: unknown = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { response: invalidWriteResponse(parsed, invalidMessage) };
  }
  return { data: parsed.data };
}

export function createAdminCreateHandler<TInput, TResult>(options: {
  schema: WriteSchema<TInput>;
  invalidMessage: string;
  fallbackError: string;
  create: (data: TInput) => Promise<TResult>;
  toResponse?: (result: TResult) => Record<string, unknown>;
  status?: number;
}) {
  return async function POST(request: Request) {
    return handleAdminAction(options.fallbackError, async () => {
      const parsed = await parseWriteBody(
        request,
        options.schema,
        options.invalidMessage,
      );
      if ("response" in parsed) return parsed.response;
      const result = await options.create(parsed.data);
      const extra = options.toResponse?.(result) ?? { data: result };
      return NextResponse.json(
        { ok: true, ...extra },
        { status: options.status ?? 201 },
      );
    });
  };
}

export function createAdminUpdateHandler<TInput, TResult>(options: {
  schema: WriteSchema<TInput>;
  invalidMessage: string;
  fallbackError: string;
  update: (id: string, data: TInput) => Promise<TResult>;
  toResponse?: (result: TResult) => Record<string, unknown>;
}) {
  return async function PUT(request: Request, context: RouteContext) {
    return handleAdminAction(options.fallbackError, async () => {
      const { id } = await context.params;
      const parsed = await parseWriteBody(
        request,
        options.schema,
        options.invalidMessage,
      );
      if ("response" in parsed) return parsed.response;
      const result = await options.update(id, parsed.data);
      const extra = options.toResponse?.(result) ?? { data: result };
      return NextResponse.json({ ok: true, ...extra });
    });
  };
}

export function createAdminDeleteHandler(options: {
  fallbackError: string;
  remove: (id: string) => Promise<void>;
}) {
  return async function DELETE(_request: Request, context: RouteContext) {
    return handleAdminAction(options.fallbackError, async () => {
      const { id } = await context.params;
      await options.remove(id);
      return NextResponse.json({ ok: true });
    });
  };
}
