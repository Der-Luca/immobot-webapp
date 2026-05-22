export default function CookieConsentNotice({
  onAccept,
  title = "Wir nutzen Cookies",
  text = "Für das volle Immobot-Erlebnis benötigen wir deine Zustimmung.",
  className = "",
  compact = false,
}) {
  return (
    <div
      className={`flex h-full flex-col items-center justify-center rounded-xl bg-blue-50/70 text-center ${
        compact ? "min-h-48 gap-4 p-6" : "min-h-[440px] gap-7 p-8 md:p-12"
      } ${className}`}
    >
      <div
        className={`flex items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-blue-100 ${
          compact ? "h-14 w-14" : "h-20 w-20"
        }`}
      >
        <img
          src="/logo.png"
          alt=""
          className={compact ? "h-9 w-9 object-contain" : "h-12 w-12 object-contain"}
        />
      </div>

      <div>
        <h3
          className={`font-extrabold tracking-tight text-gray-950 ${
            compact ? "text-lg" : "text-2xl md:text-4xl"
          }`}
        >
          {title}
        </h3>
        <p
          className={`mx-auto mt-3 max-w-xl leading-relaxed text-gray-600 ${
            compact ? "text-sm" : "text-base md:text-xl"
          }`}
        >
          {text}
        </p>
        {!compact && (
          <p className="mx-auto mt-4 max-w-lg text-xs leading-relaxed text-gray-500">
            Mehr Informationen findest du in unserer{" "}
            <a
              href="https://immobot.pro/datenschutz"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700"
            >
              Datenschutzerklärung
            </a>
            .
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onAccept}
        className={`rounded-xl bg-blue-600 font-bold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 ${
          compact ? "px-5 py-2.5 text-sm" : "px-8 py-4 text-base md:text-lg"
        }`}
      >
        Cookies akzeptieren
      </button>
    </div>
  );
}
