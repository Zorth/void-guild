import confetti from 'canvas-confetti';

export const fireVoidParticles = (x: number, y: number) => {
  const count = 40;
  const defaults = {
    origin: { x: x / window.innerWidth, y: y / window.innerHeight },
    colors: ['#7E22CE', '#D8B4FE', '#D4AF37', '#FFFFFF'], // Purple, Light Purple, Gold, White
  };

  confetti({
    ...defaults,
    particleCount: count,
    spread: 70,
    scalar: 0.8,
    gravity: 1.2,
    drift: 0,
    ticks: 60,
  });
};

export const fireJoinParticles = (x: number, y: number) => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: x / window.innerWidth, y: y / window.innerHeight },
      colors: ['#7E22CE', '#D8B4FE', '#FFFFFF'],
    });
};

export const fireGoldParticles = (x: number, y: number) => {
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { x: x / window.innerWidth, y: y / window.innerHeight },
      colors: ['#BF953F', '#FCF6BA', '#AA771C', '#D4AF37'], // Various Gold tones
    });
};
