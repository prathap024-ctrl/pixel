import { Inngest } from "inngest";

// Initialize services
export const inngest = new Inngest({
  id: "pixelpilot",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
