import { Transform } from "node:stream";

/** Hold one bounded source chunk until EOF verification, so Content-Length clients
 * cannot finish and close their socket before the source has been checked. */
export function verifiedTail(verify: () => void): Transform {
  let tail: Buffer | undefined;
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      if (tail) this.push(tail);
      tail = chunk;
      callback();
    },
    flush(callback) {
      try {
        verify();
        if (tail) this.push(tail);
        tail = undefined;
        callback();
      } catch (error) { callback(error as Error); }
    },
    destroy(error, callback) {
      tail = undefined;
      callback(error);
    },
  });
}
