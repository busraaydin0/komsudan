import { canCancel, nextStatus } from "@/lib/status";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export { canCancel, nextStatus };
