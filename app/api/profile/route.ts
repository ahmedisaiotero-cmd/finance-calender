import { handleProfileGet, handleProfilePut } from "@/lib/api/profile-handler";

export async function GET() {
  return handleProfileGet();
}

export async function PUT(request: Request) {
  return handleProfilePut(request);
}
