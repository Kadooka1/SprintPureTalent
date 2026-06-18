import './PasswordStrengthBar.css';

function getStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score++;
  if (password.length >= 12) score++;
  return score;
}

const labels = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];
const colors = ['', '#d32f2f', '#e65100', '#f9a825', '#2e7d32'];

export default function PasswordStrengthBar({ password }) {
  const strength = getStrength(password);
  if (!password) return null;

  return (
    <div className="strength-bar-wrapper">
      <div className="strength-segments">
        {[1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className="strength-segment"
            style={{ background: strength >= level ? colors[strength] : 'var(--light-border)' }}
          />
        ))}
      </div>
      <span className="strength-label" style={{ color: colors[strength] }}>
        {labels[strength]}
      </span>
    </div>
  );
}
