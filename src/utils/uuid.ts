export class UUID {
  public static async uuidv4(): Promise<string> {
    const hex: string = "0123456789abcdef";
    let uuid: string = "";
    for (let i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) {
        uuid += "-";
      } else if (i === 14) {
        uuid += "4"; // version 4
      } else if (i === 19) {
        // variant: bits 10xx
        const r = Math.floor(Math.random() * 16);
        uuid += ((r & 0x3) | 0x8).toString(16);
      } else {
        uuid += hex[Math.floor(Math.random() * 16)];
      }
    }
    return uuid;
  }
}
