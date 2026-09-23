"use client";

/**
 * Identidade visual BearDelivery (mascote V03 refinado).
 * Cores vêm dos tokens brand-* do globals.css - não usar hex aqui.
 */

// Gradiente e sombra quente do ícone, compartilhados por todas as variantes
const ICON_BG = "bg-linear-to-br from-brand-deep to-brand-600";

export function BearMascot({ className = "w-6 h-6" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            {/* Orelhas */}
            <circle cx="6" cy="5.4" r="2.25" fill="white" />
            <circle cx="18" cy="5.4" r="2.25" fill="white" />
            <circle cx="6" cy="5.4" r="0.9" fill="var(--color-brand-950)" />
            <circle cx="18" cy="5.4" r="0.9" fill="var(--color-brand-950)" />

            {/* Cabeça */}
            <rect
                x="3.7"
                y="4.8"
                width="16.6"
                height="11.1"
                rx="5.55"
                fill="white"
            />

            {/* Olhos com brilho */}
            <circle cx="8.9" cy="10.1" r="1.05" fill="var(--color-brand-950)" />
            <circle cx="15.1" cy="10.1" r="1.05" fill="var(--color-brand-950)" />
            <circle cx="9.18" cy="9.78" r="0.28" fill="white" />
            <circle cx="15.38" cy="9.78" r="0.28" fill="white" />

            {/* Focinho, nariz e sorriso */}
            <ellipse
                cx="12"
                cy="12.65"
                rx="2.85"
                ry="1.95"
                fill="var(--color-brand-50)"
            />
            <ellipse
                cx="12"
                cy="11.9"
                rx="0.72"
                ry="0.58"
                fill="var(--color-brand-950)"
            />
            <path
                d="M10.55 13.2 Q12 14.38 13.45 13.2"
                stroke="var(--color-brand-950)"
                strokeWidth="0.55"
                strokeLinecap="round"
                fill="none"
            />

            {/* Caixinha de entrega */}
            <g>
                <rect
                    x="5.1"
                    y="15.05"
                    width="13.8"
                    height="7.35"
                    rx="1.45"
                    fill="white"
                />
                <rect
                    x="5.1"
                    y="15.05"
                    width="13.8"
                    height="2.75"
                    rx="1.45"
                    fill="var(--color-brand-200)"
                />
                <rect
                    x="11.05"
                    y="15.05"
                    width="1.9"
                    height="7.35"
                    fill="var(--color-brand-200)"
                />
                <path
                    d="M5.1 16.9 H18.9"
                    stroke="var(--color-brand-400)"
                    strokeWidth="0.28"
                    opacity="0.55"
                />
            </g>
        </svg>
    );
}

/** Logo horizontal: header, sidebar, footer. */
export function BearDeliveryLogo({
    small = false,
    dark = false,
    className = "",
}: {
    small?: boolean;
    /** Força texto branco (ex.: sobre fundo da marca). Sem ele, segue o tema. */
    dark?: boolean;
    className?: string;
}) {
    return (
        <div
            className={`flex items-center ${small ? "gap-1.5" : "gap-2.5"} ${className}`}
        >
            <div
                className={`${small
                    ? "h-7 w-7 rounded-[10px]"
                    : "h-10 w-10 rounded-[12px]"
                    } ${ICON_BG} flex shrink-0 items-center justify-center shadow-[0_1px_10px_var(--tw-shadow-color)] shadow-brand-900/20`}
            >
                <BearMascot
                    className={small ? "h-[18px] w-[18px]" : "h-[26px] w-[26px]"}
                />
            </div>

            <div
                className={`leading-none tracking-tight ${dark ? "text-white" : "text-foreground"}`}
            >
                <span
                    className={`font-black ${small ? "text-[13px]" : "text-[17px]"}`}
                >
                    BEAR
                </span>
                <span
                    className={`ml-[3px] font-light ${small
                        ? "text-[11px] tracking-[0.12em]"
                        : "text-[14px] tracking-[0.14em]"
                        }`}
                >
                    DELIVERY
                </span>
            </div>
        </div>
    );
}

/** Logo empilhado grande: hero, splash, telas de login/erro. */
export function BearDeliveryLogoStacked({
    dark = false,
    className = "",
}: {
    dark?: boolean;
    className?: string;
}) {
    return (
        <div className={`flex flex-col items-center gap-4 ${className}`}>
            <div
                className={`h-[72px] w-[72px] rounded-[18px] ${ICON_BG} flex items-center justify-center shadow-[0_8px_24px_var(--tw-shadow-color)] shadow-brand-900/25`}
            >
                <BearMascot className="h-[46px] w-[46px]" />
            </div>
            <div
                className={`flex flex-col items-center leading-[0.88] ${dark ? "text-white" : "text-foreground"}`}
            >
                <span className="text-[34px] font-black tracking-[-0.04em]">
                    BEAR
                </span>
                <span className="mt-1 text-[13px] font-light tracking-[0.28em] opacity-70">
                    DELIVERY
                </span>
            </div>
        </div>
    );
}
