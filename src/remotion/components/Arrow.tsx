export const Arrow: React.FC<{
  readonly color?: string;
}> = ({ color = "#38BDF8" }) => {
  return (
    <svg
      width="64"
      height="28"
      viewBox="0 0 64 28"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 14H54"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M44 4L58 14L44 24"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
