// gzip & zlib
import { inflate as pakoInflate } from 'pako';
// zstd
import { ZSTDDecoder } from 'zstddec';

export class Decoder {
   /**
    * Decodes any compressed/encoded Tiled data and produces the canonical list of Tiled gids
    * @param data 
    * @param options 
    */
   static decode(data: string, compression: string): Promise<number[]> {
      var i: number,
         j: number,
         l: number,
         tmp: number,
         placeHolders: number,
         arr: Uint8Array;

      if (data.length % 4 > 0) {
         throw new Error('Invalid string. Length must be a multiple of 4')
      }

      var PLUS = '+'.charCodeAt(0);
      var SLASH = '/'.charCodeAt(0);
      var NUMBER = '0'.charCodeAt(0);
      var LOWER = 'a'.charCodeAt(0);
      var UPPER = 'A'.charCodeAt(0);
      var PLUS_URL_SAFE = '-'.charCodeAt(0);
      var SLASH_URL_SAFE = '_'.charCodeAt(0);

      function decode(elt: string): number {
         var code = elt.charCodeAt(0)
         if (code === PLUS || code === PLUS_URL_SAFE) return 62 // '+'
         if (code === SLASH || code === SLASH_URL_SAFE) return 63 // '/'
         if (code < NUMBER) return -1 // no match
         if (code < NUMBER + 10) return code - NUMBER + 26 + 26
         if (code < UPPER + 26) return code - UPPER
         if (code < LOWER + 26) return code - LOWER + 26
         throw Error('Could not decode elt');
      }

      // the number of equal signs (place holders)
      // if there are two placeholders, than the two characters before it
      // represent one byte
      // if there is only one, then the three characters before it represent 2 bytes
      // this is just a cheap hack to not do indexOf twice
      var len = data.length
      placeHolders = data.charAt(len - 2) === '=' ? 2 : data.charAt(len - 1) === '=' ? 1 : 0

      // base64 is 4/3 + up to two characters of the original data
      arr = new Uint8Array(data.length * 3 / 4 - placeHolders)

      // if there are placeholders, only get up to the last complete 4 chars
      l = placeHolders > 0 ? data.length - 4 : data.length

      var L = 0

      function push(v: number) {
         arr[L++] = v
      }

      for (i = 0, j = 0; i < l; i += 4, j += 3) {
         tmp = (decode(data.charAt(i)) << 18) | (decode(data.charAt(i + 1)) << 12) | (decode(data.charAt(i + 2)) << 6) | decode(data.charAt(i + 3))
         push((tmp & 0xFF0000) >> 16)
         push((tmp & 0xFF00) >> 8)
         push(tmp & 0xFF)
      }

      if (placeHolders === 2) {
         tmp = (decode(data.charAt(i)) << 2) | (decode(data.charAt(i + 1)) >> 4)
         push(tmp & 0xFF)
      } else if (placeHolders === 1) {
         tmp = (decode(data.charAt(i)) << 10) | (decode(data.charAt(i + 1)) << 4) | (decode(data.charAt(i + 2)) >> 2)
         push((tmp >> 8) & 0xFF)
         push(tmp & 0xFF)
      }

      return new Promise(resolve => {
         const toNumber = function (byteArray: number[] | Uint8Array) {
            var value = 0;

            for (var i = byteArray.length - 1; i >= 0; i--) {
               value = (value * 256) + byteArray[i] * 1;
            }

            return value;
         };

         // Byte array
         // handle compression
         if ("zlib" === compression || "gzip" === compression) {
            arr = pakoInflate( arr );

            var resultLen = arr.length / 4;
            var result = new Array<number>(resultLen);

            for (i = 0; i < resultLen; i++) {
               result[i] = toNumber(arr.slice(i * 4, i * 4 + 4));
            }
            resolve(result);
         }

         if ("zstd" === compression) {
            const decoder = new ZSTDDecoder();
            decoder.init().then(() => {
               arr = decoder.decode(arr);
               var resultLen = arr.length / 4;
               var result = new Array<number>(resultLen);

               for (i = 0; i < resultLen; i++) {
                  result[i] = toNumber(arr.slice(i * 4, i * 4 + 4));
               }
               resolve(result);
            });
         }

         // no compression just base64
         if (!compression) {
            var resultLen = arr.length / 4;
            var result = new Array<number>(resultLen);
            for (i = 0; i < resultLen; i++) {
               result[i] = toNumber(arr.slice(i * 4, i * 4 + 4));
            }
            resolve(result);
         }
      });
   }
}