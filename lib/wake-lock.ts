// A simple utility to manage the Screen Wake Lock API

let wakeLock: WakeLockSentinel | null = null;

export async function enableWakeLock() {
  if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      console.log("Wake Lock is active!");

      wakeLock.addEventListener("release", () => {
        console.log("Wake Lock has been released");
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Wake Lock failed: ${errorMessage}`);
    }
  } else {
    console.warn("Wake Lock API not supported in this browser.");
  }
}

export function releaseWakeLock() {
  if (wakeLock !== null) {
    wakeLock.release()
      .then(() => {
        wakeLock = null;
      })
      .catch((err) => console.error("Error releasing wake lock:", err));
  }
}
