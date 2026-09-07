import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.redirect("https://guild.tarragon.be/api/external/v1");
}
