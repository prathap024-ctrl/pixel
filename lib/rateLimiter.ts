import { CONFIG } from "@/helpers/useChatHelper";

export class RateLimiter {
  private requests: number[] = [];

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(
      (time) => now - time < CONFIG.RATE_LIMIT_WINDOW_MS
    );

    if (this.requests.length >= CONFIG.RATE_LIMIT_REQUESTS) {
      return false;
    }

    this.requests.push(now);
    return true;
  }

  reset(): void {
    this.requests = [];
  }
}
