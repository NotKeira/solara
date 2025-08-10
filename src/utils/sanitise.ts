export async function sanitise(input: string): Promise<string> {
  // Remove all whitespace for easier processing
  const cleaned = input.replace(/\s/g, "");

  // Only allow numbers, decimal points, and basic math operators
  const allowedPattern = /^[0-9+\-*/().]+$/;

  if (!allowedPattern.test(cleaned)) {
    throw new Error(
      "Invalid characters detected. Only numbers and basic math operators (+, -, *, /, parentheses) are allowed."
    );
  }

  // Additional safety checks
  if (cleaned.length === 0) {
    throw new Error("Input cannot be empty.");
  }

  // Check for potentially dangerous patterns
  const dangerousPatterns: RegExp[] = [
    /function/i,
    /eval/i,
    /constructor/i,
    /prototype/i,
    /__proto__/i,
    /window/i,
    /global/i,
    /process/i,
    /require/i,
    /import/i,
    /export/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(cleaned)) {
      throw new Error("Potentially dangerous content detected.");
    }
  }

  return cleaned;
}
