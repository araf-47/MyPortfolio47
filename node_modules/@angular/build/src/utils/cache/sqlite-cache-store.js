"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteCacheStore = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_sqlite_1 = require("node:sqlite");
const node_util_1 = require("node:util");
const node_v8_1 = require("node:v8");
const node_zlib_1 = require("node:zlib");
const cache_1 = require("./cache");
const deflateRawAsync = (0, node_util_1.promisify)(node_zlib_1.deflateRaw);
/**
 * Minimum payload size (in bytes) required to attempt compression.
 * Smaller payloads generally do not achieve meaningful compression ratios, while larger payloads
 * (such as transformed JavaScript modules from node_modules) achieve 70-80% size reduction
 * and drastically reduce SQLite overflow pages.
 */
const COMPRESSION_THRESHOLD = 32 * 1024; // 32 KB
/**
 * Storage format discriminator values for cache table entries.
 */
var CacheFormat;
(function (CacheFormat) {
    CacheFormat[CacheFormat["V8"] = 0] = "V8";
    CacheFormat[CacheFormat["V8Compressed"] = 1] = "V8Compressed";
    CacheFormat[CacheFormat["RawBinary"] = 2] = "RawBinary";
    CacheFormat[CacheFormat["RawBinaryCompressed"] = 3] = "RawBinaryCompressed";
})(CacheFormat || (CacheFormat = {}));
/**
 * Common SQLite primary result codes.
 * @see https://www.sqlite.org/rescode.html
 */
var SqliteResultCode;
(function (SqliteResultCode) {
    SqliteResultCode[SqliteResultCode["Busy"] = 5] = "Busy";
    SqliteResultCode[SqliteResultCode["Locked"] = 6] = "Locked";
})(SqliteResultCode || (SqliteResultCode = {}));
function isSqliteError(error) {
    return (error instanceof Error &&
        ('errcode' in error ||
            ('code' in error && error.code === 'ERR_SQLITE_ERROR')));
}
/**
 * A persistent cache store backed by SQLite.
 *
 * Values are persisted with the V8 structured clone serialization API instead of JSON. Cached
 * values include binary data such as the `Uint8Array` output of the JavaScript transformer and
 * the `contents` of an esbuild load result. A JSON round-trip converts those into plain objects
 * (`{"0":105,"1":109,...}`), which breaks consumers on any build that reads them back from disk.
 */
class SqliteCacheStore {
    cachePath;
    maxPayloadSize;
    ttlDays;
    #db;
    #disabled = false;
    #getStmt;
    #hasStmt;
    #setStmt;
    #updateAccessedStmt;
    #pendingAccessedKeys = new Set();
    #flushTimeout;
    #busyTimeoutMs;
    constructor(cachePath, maxPayloadSize = 1024 * 1024 * 1024, ttlDays = 14, busyTimeoutMs = 5000) {
        this.cachePath = cachePath;
        this.maxPayloadSize = maxPayloadSize;
        this.ttlDays = ttlDays;
        this.#busyTimeoutMs =
            Number.isSafeInteger(busyTimeoutMs) && busyTimeoutMs >= 0 ? busyTimeoutMs : 5000;
    }
    #openDatabase() {
        let db;
        try {
            if (this.cachePath === ':memory:') {
                db = new node_sqlite_1.DatabaseSync(this.cachePath);
            }
            else {
                // Optimistically attempt to open the database file first to avoid directory creation
                // syscalls on warm builds where the parent directory already exists.
                try {
                    db = new node_sqlite_1.DatabaseSync(this.cachePath);
                }
                catch {
                    (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(this.cachePath), { recursive: true });
                    db = new node_sqlite_1.DatabaseSync(this.cachePath);
                }
            }
            // Optimize SQLite for cache usage
            db.exec(`PRAGMA busy_timeout = ${this.#busyTimeoutMs};`);
            db.exec('PRAGMA auto_vacuum = FULL;');
            db.exec('PRAGMA journal_mode = WAL;');
            db.exec('PRAGMA synchronous = NORMAL;');
            db.exec('PRAGMA temp_store = MEMORY;');
            db.exec('PRAGMA mmap_size = 268435456;');
            db.exec('CREATE TABLE IF NOT EXISTS cache (' +
                'key TEXT PRIMARY KEY, ' +
                'value BLOB, ' +
                'format INTEGER NOT NULL DEFAULT 0, ' +
                'last_accessed INTEGER NOT NULL' +
                ') WITHOUT ROWID;');
            try {
                db.exec('ALTER TABLE cache ADD COLUMN format INTEGER NOT NULL DEFAULT 0;');
            }
            catch {
                // Ignore error if format column already exists
            }
            db.exec('CREATE INDEX IF NOT EXISTS idx_cache_accessed ON cache (last_accessed DESC, key DESC);');
            this.#getStmt = db.prepare('SELECT value, format FROM cache WHERE key = ?');
            this.#hasStmt = db.prepare('SELECT 1 FROM cache WHERE key = ?');
            this.#setStmt = db.prepare('INSERT OR REPLACE INTO cache (key, value, format, last_accessed) VALUES (?, ?, ?, unixepoch())');
            this.#updateAccessedStmt = db.prepare('UPDATE cache SET last_accessed = unixepoch() WHERE key = ?');
            this.#db = db;
            return db;
        }
        catch (error) {
            try {
                db?.close();
            }
            catch {
                // Ignore close error on corrupted handle
            }
            this.#getStmt = undefined;
            this.#hasStmt = undefined;
            this.#setStmt = undefined;
            this.#updateAccessedStmt = undefined;
            throw error;
        }
    }
    #ensureDb() {
        if (this.#disabled) {
            return undefined;
        }
        if (!this.#db) {
            try {
                return this.#openDatabase();
            }
            catch (error) {
                // If the database is locked by another active process,
                // do not attempt to delete the database files as that could corrupt the active process's database.
                const isBusy = isSqliteError(error) &&
                    (error.errcode === SqliteResultCode.Busy || error.errcode === SqliteResultCode.Locked);
                // Attempt to recover from database corruption by deleting the corrupted files and recreating
                if (!isBusy && this.cachePath !== ':memory:') {
                    try {
                        (0, node_fs_1.rmSync)(this.cachePath, { force: true });
                        (0, node_fs_1.rmSync)(this.cachePath + '-wal', { force: true });
                        (0, node_fs_1.rmSync)(this.cachePath + '-shm', { force: true });
                        (0, node_fs_1.rmSync)(this.cachePath + '-journal', { force: true });
                        return this.#openDatabase();
                    }
                    catch {
                        // If recovery fails (e.g. read-only filesystem or permission denied), disable caching
                    }
                }
                this.#disabled = true;
                return undefined;
            }
        }
        return this.#db;
    }
    #queueAccessUpdate(key) {
        this.#pendingAccessedKeys.add(key);
        if (!this.#flushTimeout) {
            this.#flushTimeout = setTimeout(() => this.#flushAccessUpdates(), 1000);
            this.#flushTimeout.unref?.();
        }
    }
    #flushAccessUpdates() {
        if (this.#flushTimeout) {
            clearTimeout(this.#flushTimeout);
            this.#flushTimeout = undefined;
        }
        if (this.#pendingAccessedKeys.size === 0) {
            return;
        }
        try {
            if (this.#db && this.#updateAccessedStmt) {
                this.#db.exec('BEGIN IMMEDIATE TRANSACTION;');
                for (const key of this.#pendingAccessedKeys) {
                    this.#updateAccessedStmt.run(key);
                }
                this.#db.exec('COMMIT;');
            }
        }
        catch {
            try {
                this.#db?.exec('ROLLBACK;');
            }
            catch {
                // Ignore rollback errors if transaction was not active
            }
        }
        finally {
            this.#pendingAccessedKeys.clear();
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async get(key) {
        if (!this.#ensureDb()) {
            return undefined;
        }
        try {
            // SQLite column types are dynamic, so the stored value is only known at runtime.
            const row = this.#getStmt?.get(key);
            if (row) {
                this.#queueAccessUpdate(key);
                if (row.value instanceof Uint8Array) {
                    try {
                        switch (row.format) {
                            case CacheFormat.RawBinary:
                                return row.value;
                            case CacheFormat.RawBinaryCompressed: {
                                const decompressed = (0, node_zlib_1.inflateRawSync)(row.value);
                                return new Uint8Array(decompressed.buffer, decompressed.byteOffset, decompressed.byteLength);
                            }
                            case CacheFormat.V8Compressed:
                                return (0, node_v8_1.deserialize)((0, node_zlib_1.inflateRawSync)(row.value));
                            case CacheFormat.V8:
                            default:
                                return (0, node_v8_1.deserialize)(row.value);
                        }
                    }
                    catch {
                        // Treat corrupt or unparseable cached payloads as a cache miss.
                    }
                }
            }
        }
        catch {
            // Treat query errors (e.g. disk read failures) as a cache miss.
        }
        return undefined;
    }
    has(key) {
        if (!this.#ensureDb()) {
            return false;
        }
        try {
            return !!this.#hasStmt?.get(key);
        }
        catch {
            return false;
        }
    }
    async set(key, value) {
        if (!this.#ensureDb()) {
            return this;
        }
        try {
            this.#pendingAccessedKeys.delete(key);
            const isBinary = value instanceof Uint8Array;
            const data = isBinary ? value : (0, node_v8_1.serialize)(value);
            let format = isBinary ? CacheFormat.RawBinary : CacheFormat.V8;
            let payload = data;
            if (data.byteLength >= COMPRESSION_THRESHOLD) {
                const compressed = await deflateRawAsync(data, { level: 1 });
                if (compressed.byteLength < data.byteLength) {
                    payload = compressed;
                    format = isBinary ? CacheFormat.RawBinaryCompressed : CacheFormat.V8Compressed;
                }
            }
            this.#setStmt?.run(key, payload, format);
        }
        catch {
            // Writing to cache is non-fatal and should not fail the build.
        }
        return this;
    }
    createCache(namespace) {
        return new cache_1.Cache(new cache_1.NamespacedCacheStore(this, namespace));
    }
    close() {
        this.#flushAccessUpdates();
        if (this.#db) {
            try {
                this.#db.exec('BEGIN IMMEDIATE TRANSACTION;');
                try {
                    // 1. Delete items older than N days
                    this.#db
                        .prepare("DELETE FROM cache WHERE last_accessed < unixepoch('now', ?);")
                        .run(`-${this.ttlDays} days`);
                    // 2. Prune oldest items if payload exceeds maxPayloadSize
                    // Skip the expensive window aggregate query if total database size is below maxPayloadSize
                    const sizeResult = this.#db
                        .prepare('SELECT (page_count - freelist_count) * page_size AS total_size ' +
                        'FROM pragma_page_count(), pragma_freelist_count(), pragma_page_size();')
                        .get();
                    if ((sizeResult?.total_size ?? 0) > this.maxPayloadSize) {
                        this.#db
                            .prepare(`DELETE FROM cache WHERE key IN (
                  SELECT key FROM (
                    SELECT key,
                           sum(length(key) + length(value)) OVER (ORDER BY last_accessed DESC, key DESC) as running_size
                    FROM cache
                  ) WHERE running_size > ?
                );`)
                            .run(this.maxPayloadSize);
                    }
                    this.#db.exec('COMMIT;');
                }
                catch (error) {
                    try {
                        this.#db.exec('ROLLBACK;');
                    }
                    catch {
                        // Ignore rollback errors if transaction was not active
                    }
                    throw error;
                }
            }
            catch {
                // Pruning errors should not block build success
            }
            finally {
                this.#getStmt = undefined;
                this.#hasStmt = undefined;
                this.#setStmt = undefined;
                this.#updateAccessedStmt = undefined;
                try {
                    this.#db.close();
                }
                catch {
                    // Failure to close should not block build success
                }
                this.#db = undefined;
            }
        }
        this.#disabled = false;
    }
}
exports.SqliteCacheStore = SqliteCacheStore;
//# sourceMappingURL=sqlite-cache-store.js.map