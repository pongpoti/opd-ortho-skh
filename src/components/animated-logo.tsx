export function AnimatedLogo({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 650 160"
      role="img"
      aria-label="OPD Orthopedic amutsakhon Hospital"
      style={style ?? { width: "100%", maxWidth: "48rem" }}
    >
      <defs>
        <style>{`
          .opd-logo-word {
            font-family: 'Times New Roman', Times, serif;
            font-weight: bold;
            font-size: 52px;
            fill: #1c4b79;
          }
          .dark .opd-logo-word {
            fill: #8ec6f0;
          }
          .opd-logo-heart {
            fill: none;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-dasharray: 500;
            stroke-dashoffset: 0;
          }
          .opd-logo-heart--dark {
            stroke: #2a9d4f;
          }
          .opd-logo-heart--light {
            stroke: #7ec463;
          }

          @media (prefers-reduced-motion: no-preference) {
            .opd-logo-heart {
              animation: opd-logo-draw 3.2s ease-in-out infinite;
            }
            .opd-logo-word {
              animation: opd-logo-pulse 3.6s ease-in-out infinite;
            }
          }

          @keyframes opd-logo-draw {
            0%, 100% { stroke-dashoffset: 500; }
            45%, 55% { stroke-dashoffset: 0; }
          }

          @keyframes opd-logo-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
        `}</style>
      </defs>

      <g transform="translate(15, 15) scale(1.2)">
        <path
          d="M 50 20 C 15 -15 -15 35 15 70 C 35 90 50 110 50 110 C 50 110 80 80 90 100 C 100 120 50 135 15 110"
          className="opd-logo-heart opd-logo-heart--dark"
          strokeWidth={5.5}
          style={{ animationDelay: "0s" }}
        />
        <path
          d="M 50 20 C 85 -15 110 25 85 55 C 65 80 40 70 45 100"
          className="opd-logo-heart opd-logo-heart--dark"
          strokeWidth={5.5}
          style={{ animationDelay: "0.15s" }}
        />
        <path
          d="M 48 22 C 17 -11 -10 36 17 68 C 36 88 48 106 48 106"
          className="opd-logo-heart opd-logo-heart--light"
          strokeWidth={2}
          style={{ animationDelay: "0.3s" }}
        />
        <path
          d="M 48 22 C 81 -11 103 26 80 54 C 61 78 38 69 43 98"
          className="opd-logo-heart opd-logo-heart--light"
          strokeWidth={2}
          style={{ animationDelay: "0.45s" }}
        />
      </g>

      <text x="145" y="72" className="opd-logo-word">
        OPD orthopedic
      </text>
      <text x="135" y="125" className="opd-logo-word" style={{ animationDelay: "0.3s" }}>
        amutsakhon Hospital
      </text>
    </svg>
  );
}
