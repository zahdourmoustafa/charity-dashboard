import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    // Verify authentication token
    const authHeader = request.headers.get("authorization");
    const expectedToken = `Bearer ${process.env.API_SECRET_TOKEN}`;

    if (!authHeader || authHeader !== expectedToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    const requiredFields = ["name", "email", "jobTitle", "department", "startDate", "manager", "equipment", "timestamp"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Save to Convex
    const leadId = await convex.mutation(api.leads.upsert, {
      name: body.name,
      email: body.email,
      jobTitle: body.jobTitle,
      department: body.department,
      startDate: body.startDate,
      manager: body.manager,
      equipment: body.equipment,
      status: body.status,
      timestamp: body.timestamp,
    });

    return NextResponse.json(
      { success: true, leadId },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing lead:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
