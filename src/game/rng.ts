// Seeded RNG for deterministic shop generation
// Using mulberry32 algorithm for fast, good-quality randomness

export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  // Generate next random number [0, 1)
  nextFloat(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Generate random integer in range [min, max)
  nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min)) + min;
  }

  // Choose random element from array
  choice<T>(array: T[]): T {
    return array[this.nextInt(0, array.length)];
  }

  // Shuffle array (Fisher-Yates)
  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Weighted random choice
  weightedChoice<T>(items: Array<{ item: T; weight: number }>): T {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = this.nextFloat() * totalWeight;
    
    for (const { item, weight } of items) {
      random -= weight;
      if (random <= 0) {
        return item;
      }
    }
    
    return items[items.length - 1].item; // Fallback
  }
}
