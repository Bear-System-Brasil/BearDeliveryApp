import { cn } from "@/lib/utils";

/** Moto de entrega dos mocks (Lojas/Novidades) - herda a cor do texto. */
export function DeliveryBikeIcon({ className }: { className?: string }) {
  return (
    <svg
      width="17"
      height="13"
      viewBox="0 0 21 16"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <circle
        cx="4.1"
        cy="11.6"
        r="3.1"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle
        cx="16.3"
        cy="11.6"
        r="3.1"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M4.1 11.6 8.9 7.2h4.6l2.8 4.4M13.5 7.2l1.4-2h1.3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9.3" cy="1.3" r="0.8" fill="currentColor" />
      <circle cx="12" cy="1.3" r="0.8" fill="currentColor" />
      <circle cx="10.7" cy="2.8" r="1.8" fill="currentColor" />
      <path
        d="M12.4 2.1h1.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M10.4 4.5 9.3 7.1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M9.3 7.1 10.6 9.2M9.3 7.1 8 8.9"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M10.2 5.1 13.9 5.8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
