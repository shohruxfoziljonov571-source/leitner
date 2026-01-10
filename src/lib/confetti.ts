import confetti from 'canvas-confetti';

// Victory confetti burst
export const fireVictoryConfetti = () => {
  const duration = 3000;
  const animationEnd = Date.now() + duration;

  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 50 * (timeLeft / duration);

    // Confetti from left
    confetti({
      particleCount,
      startVelocity: 30,
      spread: 360,
      origin: {
        x: randomInRange(0.1, 0.3),
        y: Math.random() - 0.2,
      },
      colors: ['#FFD700', '#FFA500', '#FF6347', '#9370DB', '#00CED1'],
    });

    // Confetti from right
    confetti({
      particleCount,
      startVelocity: 30,
      spread: 360,
      origin: {
        x: randomInRange(0.7, 0.9),
        y: Math.random() - 0.2,
      },
      colors: ['#FFD700', '#FFA500', '#FF6347', '#9370DB', '#00CED1'],
    });
  }, 250);
};

// Gold medal confetti
export const fireGoldConfetti = () => {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors: ['#FFD700', '#FFC107', '#FFEB3B'],
  });
  fire(0.2, {
    spread: 60,
    colors: ['#FFD700', '#FFC107', '#FFEB3B'],
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    colors: ['#FFD700', '#FFC107', '#FFEB3B'],
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    colors: ['#FFD700', '#FFC107', '#FFEB3B'],
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    colors: ['#FFD700', '#FFC107', '#FFEB3B'],
  });
};

// Silver confetti
export const fireSilverConfetti = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#C0C0C0', '#A9A9A9', '#D3D3D3', '#DCDCDC'],
    zIndex: 9999,
  });
};

// Bronze confetti
export const fireBronzeConfetti = () => {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.6 },
    colors: ['#CD7F32', '#B87333', '#8B4513', '#D2691E'],
    zIndex: 9999,
  });
};

// Celebration stars
export const fireStarConfetti = () => {
  const defaults = {
    spread: 360,
    ticks: 100,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
    shapes: ['star'] as confetti.Shape[],
    colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'],
    zIndex: 9999,
  };

  function shoot() {
    confetti({
      ...defaults,
      particleCount: 40,
      scalar: 1.2,
      origin: { x: 0.5, y: 0.5 },
    });

    confetti({
      ...defaults,
      particleCount: 10,
      scalar: 0.75,
      origin: { x: 0.5, y: 0.5 },
    });
  }

  setTimeout(shoot, 0);
  setTimeout(shoot, 100);
  setTimeout(shoot, 200);
};

// Emoji rain (hearts, stars, etc.)
export const fireEmojiRain = (emoji: string = '🎉') => {
  const scalar = 2;
  const confettiEmoji = confetti.shapeFromText({ text: emoji, scalar });

  const defaults = {
    spread: 360,
    ticks: 60,
    gravity: 0.5,
    decay: 0.96,
    startVelocity: 20,
    shapes: [confettiEmoji],
    scalar,
    zIndex: 9999,
  };

  function shoot() {
    confetti({
      ...defaults,
      particleCount: 30,
      origin: { x: 0.5, y: 0.3 },
    });
  }

  setTimeout(shoot, 0);
  setTimeout(shoot, 250);
};
