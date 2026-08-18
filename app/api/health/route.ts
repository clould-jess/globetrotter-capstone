export async function GET() {
  return Response.json({
    status: "ok",
    project: "cameroon-project",
    phase: 2,
    timestamp: new Date().toISOString(),
  });
}
