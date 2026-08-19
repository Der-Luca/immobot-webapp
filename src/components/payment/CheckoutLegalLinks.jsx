const linkClassName =
  "font-medium text-sky-700 underline underline-offset-2 hover:text-sky-900";

export default function CheckoutLegalLinks() {
  return (
    <p className="mb-4 text-center text-xs leading-5 text-slate-500">
      Im Stripe-Checkout akzeptierst du unsere{" "}
      <a
        href="https://immobot.pro/nutzungsbedingungen/"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
      >
        Nutzungsbedingungen
      </a>{" "}
      und bestätigst, die{" "}
      <a
        href="https://immobot.pro/datenschutz/"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
      >
        Datenschutzerklärung
      </a>{" "}
      sowie die{" "}
      <a
        href="https://immobot.pro/widerruf/"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
      >
        Widerrufsbelehrung
      </a>{" "}
      zur Kenntnis genommen zu haben.
    </p>
  );
}
