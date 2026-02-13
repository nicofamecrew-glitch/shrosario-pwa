"use client";

type Props = {
  active: boolean;
  size?: number;
};

export default function FavoriteHeart({ active, size = 24 }: Props) {
  return (
    <svg
      viewBox="0 0 100 90"
      width={size}
      height={size}
      fill={active ? "#ee078e" : "none"}
      stroke={active ? "#ee078e" : "white"}
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M50 82
           L14 46
           C-4 28 8 2 32 8
           C42 10 50 20 50 20
           C50 20 58 10 68 8
           C92 2 104 28 86 46
           Z"
      />
    </svg>
  );
}
