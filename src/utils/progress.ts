export function createProgressBar(
  percentage: number,
  length: number = 10
): string {
  const filledSegments: number = Math.round((percentage / 100) * length);

  let progressBar: string = "";

  for (let i = 0; i < length; i++) {
    if (i < filledSegments) {
      // Full segment
      if (percentage < 25) {
        progressBar += "<:ProgressBarGREEN:1403540474991480893>";
      } else if (percentage < 50) {
        progressBar += "<:ProgressBarYELLOW:1403540492905353286>";
      } else {
        progressBar += "<:ProgressBarRED:1403540505199116549>";
      }
    } else {
      progressBar += "<:ProgressBarEMPTY:1403541333380956375>";
    }
  }

  return `${progressBar} (${percentage.toFixed(1)}%)`;
}
