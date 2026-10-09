import { useEffect, useState } from "react";
import { button } from "#/components/ui";
import { KEYS, readFlag, writeFlag } from "#/lib/storage";

/**
 * The install invitation.
 *
 * This is a tool site a person comes back to — "compress this one too" — and
 * an installed app is the strongest form of that: a home screen icon, no
 * address bar, and the service worker already has the shell cached.
 *
 * The awkward part is that the browser only allows the real install dialog to
 * be triggered from a user gesture that it remembers. Once `beforeinstallprompt`
 * has fired we hold the event and fire it on click. If it never fires — iOS
 * Safari has no such event at all — we say how to add it by hand, which is the
 * only thing that works there.
 *
 * Dismissed forever if it is ignored twice. A prompt that has been closed twice
 * is not going to be accepted on the third showing, and it is sitting on top of
 * content the visitor came to read.
 */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);

  useEffect(() => {
    if (readFlag(KEYS.installDismissed)) {
      setDismissed(true);
      return;
    }
    // Already installed: nothing to offer.
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setDismissed(true);
      return;
    }

    let seen = 0;
    function onPrompt(event: Event) {
      // Held rather than shown. Calling prompt() without a gesture throws, and
      // this event fires whenever Chrome decides to, not when we ask.
      event.preventDefault();
      setDeferred(event as InstallPromptEvent);
    }
    function onInstalled() {
      writeFlag(KEYS.installDismissed);
      setDeferred(null);
      setDismissed(true);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      void seen;
    };
  }, []);

  if (dismissed) return null;

  // No native prompt available. Rather than a button that does nothing, offer
  // the manual route — which is the only one that exists on iOS.
  if (!deferred) {
    return (
      <div className="mt-16 rounded-2xl bg-gradient-to-br from-brand-50 to-sky-50 p-6 ring-1 ring-brand-200/70 dark:from-ink-900 dark:to-ink-900 dark:ring-ink-800">
        <h2 className="text-base font-bold text-ink-900 dark:text-white">
          Add this to your home screen
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
          Opens straight to a tool, with the pages already downloaded — useful on a phone, where
          you are compressing between other things.
        </p>
        {hintOpen ? (
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-ink-600 dark:text-ink-400">
            <li>Tap the Share button in your browser.</li>
            <li>Choose “Add to Home Screen”.</li>
            <li>Open it from your home screen next time.</li>
          </ol>
        ) : (
          <button
            type="button"
            onClick={() => setHintOpen(true)}
            className={`${button("secondary", "sm")} mt-4`}
          >
            Show me how
          </button>
        )}
        <Dismiss onDone={() => setDismissed(true)} />
      </div>
    );
  }

  return (
    <div className="mt-16 rounded-2xl bg-gradient-to-br from-brand-50 to-sky-50 p-6 ring-1 ring-brand-200/70 dark:from-ink-900 dark:to-ink-900 dark:ring-ink-800">
      <h2 className="text-base font-bold text-ink-900 dark:text-white">
        Keep this one on your home screen
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
        One tap to compress, merge or convert next time — no typing, no loading.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={button("primary", "sm")}
          onClick={async () => {
            await deferred.prompt();
            // Trust the visitor's answer, not an assumption: if they declined,
            // showing this again would be arguing with them.
            const choice = await deferred.userChoice;
            if (choice.outcome !== "accepted") writeFlag(KEYS.installDismissed);
            setDismissed(true);
          }}
        >
          Install
        </button>
        <Dismiss onDone={() => setDismissed(true)} label="Not now" />
      </div>
    </div>
  );
}

function Dismiss({ onDone, label = "No thanks" }: { onDone: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        writeFlag(KEYS.installDismissed);
        onDone();
      }}
      className="mt-3 block text-xs text-ink-500 underline underline-offset-2 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200"
    >
      {label}
    </button>
  );
}