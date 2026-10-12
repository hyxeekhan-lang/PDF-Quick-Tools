import { useEffect, useState } from "react";

export function OfflineStatus() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-100"
    >
      Offline: cached, browser-based tools may work. AI and online services need internet.
    </div>
  );
}
