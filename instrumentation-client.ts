import * as Sentry from "@sentry/nextjs";

import { sentryInitOptions } from "@/lib/security/sentry-scrub";

const options = sentryInitOptions(process.env, "client");
if (options) {
  Sentry.init(options);
}
