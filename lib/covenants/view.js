'use strict';

const assert = require('assert');
const blake2b = require('bcrypto/lib/blake2b');
const Auction = require('./auction');

class View {
  constructor() {
    this.auctions = new Map();
  }

  async getAuction(db, nameHash) {
    assert(Buffer.isBuffer(nameHash));

    const hash = nameHash.toString('hex');
    const cache = this.auctions.get(hash);

    if (cache)
      return cache;

    const auction = await db.getAuction(nameHash);

    if (!auction)
      return null;

    this.auctions.set(hash, auction);

    return auction;
  }

  async getAuctionByName(db, name) {
    return this.getAuction(db, blake2b.digest(name));
  }

  async getDataFor(db, prevout) {
    const entry = this.getEntry(prevout);

    if (!entry)
      entry = await db.readCoin(prevout);

    if (!entry)
      return null;

    const {output} = entry;
    const {covenant} = output;

    return covenant.items[1];
  }

  async ensureAuction(db, name, height) {
    const nameHash = blake2b.digest(name);
    const hash = nameHash.toString('hex');
    const cache = await this.getAuction(db, nameHash);

    if (cache && !cache.isNull())
      return cache;

    const auction = new Auction();
    auction.name = name;
    auction.nameHash = nameHash;
    auction.height = height;
    auction.renewal = height;
    this.auctions.set(hash, auction);

    return auction;
  }
}

module.exports = View;