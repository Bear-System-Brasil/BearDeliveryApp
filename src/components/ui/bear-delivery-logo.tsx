"use client";

function BearMascot({ className = "w-6 h-6" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <circle cx="6" cy="5.4" r="2.25" fill="white" />
            <circle cx="18" cy="5.4" r="2.25" fill="white" />

            <circle cx="6" cy="5.4" r="0.9" fill="var(--color-brand-950)" />
            <circle cx="18" cy="5.4" r="0.9" fill="var(--color-brand-950)" />

            <rect
                x="3.7"
                y="4.8"
                width="16.6"
                height="11.1"
                rx="5.55"
                fill="white"
            />

            <circle cx="8.9" cy="10.1" r="1.05" fill="var(--color-brand-950)" />
            <circle cx="15.1" cy="10.1" r="1.05" fill="var(--color-brand-950)" />

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
        </svg>
    );
}

export function BearDeliveryLogo({
    small = false,
    dark = false,
    className = "",
}: {
    small?: boolean;
    dark?: boolean;
    className?: string;
}) {
    return (
        <div
            className={`flex items-center ${small ? "gap-1.5" : "gap-2.5"
                } ${className}`}
        >
            <div
                className={`${small
                        ? "h-7 w-7 rounded-[10px]"
                        : "h-10 w-10 rounded-[12px]"
                    } bg-linear-to-br from-brand-deep to-brand-600 flex items-center justify-center shadow-sm`}
            >
                <BearMascot
                    className={small ? "h-[18px] w-[18px]" : "h-[26px] w-[26px]"}
                />
            </div>

            <div
                className={`leading-none ${dark ? "text-white" : "text-foreground"
                    }`}
            >
                <span
                    className={`font-black ${small ? "text-[13px]" : "text-[17px]"
                        }`}
                >
                    BEAR
                </span>

                <span
                    className={`ml-[3px] font-light ${small ? "text-[11px]" : "text-[14px]"
                        } tracking-[0.14em]`}
                >
                    DELIVERY
                </span>
            </div>
        </div>
    );
}