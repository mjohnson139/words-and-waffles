export const json = (body: unknown, status: number, cache: string): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache },
  });

export const errorResponse = (status: number, message: string): Response =>
  json({ error: message }, status, 'no-store');
