// Central analytics helper. Non-blocking, no-op if no provider is configured.
// All funnel events pass through this single function.

type AmpModule = typeof import("@amplitude/analytics-browser");

let ampModule: AmpModule | null = null;
let initPromise: Promise<boolean> | null = null;

declare global {
  interface Window {
    amplitude?: {
      track?: (event: string, props?: Record<string, unknown>) => void;
      logEvent?: (event: string, props?: Record<string, unknown>) => void;
    };
    gtag?: (
      command: "event",
      eventName: string,
      params?: Record<string, unknown>,
    ) => void;
  }
}

function init(): Promise<boolean> {
  if (initPromise) return initPromise;

  const key = process.env.NEXT_PUBLIC_AMPLITUDE_KEY;
  if (!key) {
    initPromise = Promise.resolve(false);
    return initPromise;
  }

  initPromise = import("@amplitude/analytics-browser")
    .then((amp) => {
      ampModule = amp;
      return amp.init(key, { defaultTracking: false }).promise;
    })
    .then(() => true)
    .catch(() => false);

  return initPromise;
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  if (process.env.NODE_ENV === "development") {
    console.debug("[track]", event, props ?? "");
  }

  void init()
    .then((ready) => {
      if (ready && ampModule) {
        ampModule.track(event, props);
        return;
      }

      if (window.amplitude?.track) {
        window.amplitude.track(event, props);
        return;
      }

      if (window.amplitude?.logEvent) {
        window.amplitude.logEvent(event, props);
        return;
      }

      if (window.gtag) {
        window.gtag("event", event, props);
      }
    })
    .catch(() => {});
}

export const trackEvent = track;
