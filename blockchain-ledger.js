
// سجل بلوك تشين مبسط للبيانات الصحية
class Block {
  constructor(index, data, prevHash = '') {
    this.index = index;
    this.timestamp = new Date();
    this.data = data;
    this.prevHash = prevHash;
    this.hash = this.calculateHash();
  }
  calculateHash() {
    return btoa(this.index + this.timestamp + JSON.stringify(this.data) + this.prevHash);
  }
}

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
  }
  createGenesisBlock() {
    return new Block(0, "Genesis Block", "0");
  }
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }
  addBlock(newBlock) {
    newBlock.prevHash = this.getLatestBlock().hash;
    newBlock.hash = newBlock.calculateHash();
    this.chain.push(newBlock);
  }
}

const healthLedger = new Blockchain();
// مثال إضافة سجل صحي
// healthLedger.addBlock(new Block(1, {student: "1001", temp: 37.2}));
