import "server-only";
import { randomBytes, randomInt, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

// Stored as "scrypt$<salt b64>$<hash b64>".
export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(pw, salt, 32);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string | null | undefined) {
  const [alg, salt, hash] = (stored ?? "").split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const actual = await scrypt(pw, Buffer.from(salt, "base64"), 32);
  const expected = Buffer.from(hash, "base64");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Readable generated passwords, e.g. "cedar-orbit-lantern-river-47".
const WORDS = (
  "amber anchor apple arrow aspen atlas autumn badge bamboo banner basil beacon birch bison blossom breeze bridge brook cactus canyon cedar cherry cinder clover comet copper coral cosmos cotton crane crystal dawn delta desert dune eagle echo ember falcon fern fjord flint forest fossil fox galaxy garden garnet glacier granite harbor hazel heron hollow honey horizon iris island ivory jade jasmine juniper kettle kite lagoon lantern lark laurel lemon lichen lotus lunar maple marble meadow mesa meteor mint mist moss nebula nectar north oak oasis ocean olive onyx orbit orchid otter owl panda pebble pepper pine planet plum polar prairie quartz quill raven reef ridge river robin saffron sage salt sierra silver sparrow spruce storm summit sunset tide timber topaz tulip tundra valley velvet violet willow winter zephyr"
).split(" ");

export function generatePassword() {
  const words = Array.from({ length: 4 }, () => WORDS[randomInt(WORDS.length)]);
  return `${words.join("-")}-${randomInt(10, 100)}`;
}

export const MIN_PASSWORD = 10;
