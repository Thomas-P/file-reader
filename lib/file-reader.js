"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Create a file read object, that allows to read a file per line.
 * The file will only be read, when a listener is registered. So
 * we only need
 */
const fs_1 = require("fs");
class AsyncFileReader {
    constructor(fileName, bufferSize = 64, _chunkSplit = /\r\n|\n/) {
        this._chunkSplit = _chunkSplit;
        this._isEnded = false;
        this.listener = [];
        this.chunks = [];
        const options = {};
        options['highWaterMark'] = bufferSize > 0 ? bufferSize * 1024 : 64 * 1024;
        this.stream = fs_1.createReadStream(fileName, options);
        this.stream.on('error', (error) => {
            this.errorMessage = error;
        });
        this.stream.on('data', (data) => {
            //
            // extract the last line from the chunks, because this one is not ended yet
            //
            const lastLine = this.chunks.length > 0 ? this.chunks.pop() : '';
            //
            // concat the last line with the new data chunk, then split it to cover
            // new lines, which will be pushed to our existing chunks.
            //
            const newLines = (lastLine + data.toString()).split(_chunkSplit);
            this.chunks.push(...newLines);
            //
            // send all available chunks to all available listeners
            //
            this.sendChunks();
        });
        this.stream.on('end', () => {
            this._isEnded = true;
            this.sendChunks();
            // remove events and the stream
            ['data', 'error', 'end'].forEach(event => this.stream.removeAllListeners(event));
            this.stream = null;
        });
        this.stream.pause();
    }
    static createLineReader(fileName, bufferSize = 64, chunkSplit = '\n') {
        return new AsyncFileReader(fileName, bufferSize, chunkSplit);
    }
    /**
     *
     */
    sendChunks() {
        if (this.errorMessage) {
            return this.sendErrors();
        }
        //
        // if the stream is ended, push all chunks to the listeners
        //
        if (this._isEnded) {
            while (this.listener.length > 0) {
                const listener = this.listener.shift();
                listener[0](this.chunks.shift());
            }
        }
        else {
            //
            // for all listeners or all chunks minus the last send results
            //
            let loops = Math.max(0, Math.min(this.listener.length, this.chunks.length - 1));
            while (loops--) {
                const listener = this.listener.shift();
                listener[0](this.chunks.shift());
            }
            /**
             * resume stream if there are listeners
             */
            if (this.stream.isPaused() && this.listener.length > 0) {
                this.stream.resume();
            }
            else {
            }
            /**
             * pause the stream if we have more lines then listeners on the
             */
            if (this.chunks.length > 1) {
                this.stream.pause();
            }
        }
    }
    sendErrors() {
        let loops = this.listener.length;
        while (loops--) {
            this.listener.shift()[1](this.errorMessage);
        }
    }
    /**
     *
     * @returns {Promise<string>}
     */
    readLine() {
        return new Promise((resolve, reject) => {
            this.listener.push([resolve, reject]);
            this.sendChunks();
        });
    }
}
exports.AsyncFileReader = AsyncFileReader;
//# sourceMappingURL=file-reader.js.map