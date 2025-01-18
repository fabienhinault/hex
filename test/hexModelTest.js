import { strict as assert } from 'assert';
import {Game, white, black, reversePositionString} from '../src/model/hexModel.js';
import {Evaluator, MemorySequenceValueStorage} from '../src/model/evaluator.js';


describe('Hex', function () {
  describe('Position String', function () {
    it('should reverse a position string with 2 digit numbers', function () {
      assert.equal(reversePositionString('10/10/10/10/10/10/10/10/10/1w2b5'), '5b2w1/10/10/10/10/10/10/10/10/10');
    });
  });

  describe('Game', function () {
    it('should construct a Game', function () {
      assert.doesNotThrow(() => new Game(1));
    });

    it('should get 1 as size of a Game constructed with 1', function () {
      const game = new Game(1);
      assert.equal(game.toPositionString(), '1');
      assert.equal(1, game.size);
      assert.equal(1, game.board.length);
      assert.equal(game.board[0].length, 1);
      assert.equal(game.board[0][0].iRow, 0);
      assert.equal(game.board[0][0].iCol, 0);
      assert.equal(game.board[0][0].getColumnLetter(), 'A');
    });

    it('should play on a Game constructed with 1', function () {
      const game = new Game(1);
      const isWinning = game.play(0, 0);
      assert.equal(game.toPositionString(), 'w');
      assert(isWinning);
      assert.equal(game.chains.get(white).size, 1);
      assert(game.chains.get(white).values().next().value.isWinning());
    });

    it('should throw an error when playing on a colored hex', function () {
      const game = new Game(1);
      game.play(0, 0);
      assert.throws(() => game.play(0, 0), new Error('The game is over'));
    });

    it('should throw an error when playing outside the board', function () {
      const game = new Game(1);
      assert.throws(() => game.play(-1, 0), new Error("out of board -1 0"));
    });

    it('should play on a Game constructed with 2', function () {
      const game = new Game(2);
      assert.equal(game.toPositionString(), '2/2');
      let isWinning = game.play(0, 0);
      assert.equal(game.toPositionString(), 'w1/2');
      assert(!isWinning);
      assert.equal(game.chains.get(white).size, 1);
      assert(!game.chains.get(white).values().next().value.isWinning());

      isWinning = game.play(1, 1);
      assert.equal(game.toPositionString(), 'w1/1b');
      assert(!isWinning);
      assert.equal(game.chains.get(black).size, 1);
      assert(!game.chains.get(black).values().next().value.isWinning());

      isWinning = game.play(1, 0);
      assert.equal(game.toPositionString(), 'w1/wb');
      assert(isWinning);
      assert.equal(game.chains.get(white).size, 1);
      assert(game.chains.get(white).values().next().value.isWinning());
    });

    it('should play on a Game constructed with 2', function () {
      const game = new Game(2);
      let isWinning = game.play(0, 0);
      assert(!isWinning);
      assert.equal(game.chains.get(white).size, 1);
      assert(!game.chains.get(white).values().next().value.isWinning());

      isWinning = game.play(1, 1);
      assert(!isWinning);
      assert.equal(game.chains.get(black).size, 1);
      assert(!game.chains.get(black).values().next().value.isWinning());

      isWinning = game.play(0, 1);
      assert.equal(game.toPositionString(), 'ww/1b');
      assert(!isWinning);
      assert.equal(game.chains.get(white).size, 1);
      assert(!game.chains.get(white).values().next().value.isWinning());

      isWinning = game.play(1, 0);
      assert.equal(game.toPositionString(), 'ww/bb');
      assert(isWinning);
      assert.equal(game.chains.get(black).size, 1);
      assert(game.chains.get(black).values().next().value.isWinning());
    });

    it('should play on a Game constructed with 3', function () {
      const game = new Game(3);
      assert.equal(game.getRawValue(), 0);
      ['a1', 'c3',  'b2', 'a3',  'c1', 'b1',  'a2', 'c2'].forEach(s => game.playFromHumanString(s));
      assert.equal(game.toPositionString(), 'wbw/wwb/b1b');
      const reverseSequence = game.getReverseSequence();
      assert.equal(reverseSequence.length, 6);
      assert.equal(reverseSequence[0].toPositionString(), 'wbw/1w1/b1b')
      const winningChain = game.playFromHumanString('b3');
      assert.equal(game.toPositionString(), 'wbw/wwb/bwb');
      assert.equal('A1 C1 A2 B2 B3', winningChain.toString());
    });

    it('should evaluate a winning game', function() {
      const game = new Game(3);
      ['c3', 'c2', 'a1', 'b1', 'c1', 'a2', 'b2', 'a3'].forEach(s => game.playFromHumanString(s));
      const winningChain = game.playFromHumanString('b3');
      assert.equal('C1 B2 B3 C3', winningChain.toString());
      assert.equal(game.getRawValue(), 12);
    });
  });
  
  describe('Evaluator', function() {
    it('should evaluate a winning game', function() {
      const game = new Game(3);
      const storage = new MemorySequenceValueStorage(3);
      ['a1', 'c3', 'b2', 'a3', 'c1', 'b1', 'a2', 'c2'].forEach(s => game.playFromHumanString(s, storage));
      const winningChain = game.playFromHumanString('b3', storage);
      assert.equal('A1 C1 A2 B2 B3', winningChain.toString());
      let evaluator = new Evaluator(game, storage, white);
      evaluator.evaluateAllSubsequences();
      assert.equal(storage.getValue('wbw/wwb/bwb'), 12);
      assert.equal(storage.getValue('wbw/wwb/b1b'), 12);
      assert.equal(storage.getValue('wbw/ww1/b1b'), -11.9);
      assert.equal(storage.getValue('wbw/1w1/b1b'), 11.9);
      assert.equal(storage.getValue('w1w/1w1/b1b'), -11.9);
    });
      
    it('should avoid obvious loss', function() {
      const game = new Game(3);
      const storage = new MemorySequenceValueStorage(3);
      ['c3', 'a1', 'c2'].forEach(s => game.playFromHumanString(s, storage));
      let evaluator = new Evaluator(game, storage, black);
      evaluator.evaluateNextsSync(evaluator, game.clock.getTime() + 900);
      const nextHex = evaluator.chooseNext();
      assert.equal(nextHex.iCol, 2);
      assert.equal(nextHex.iRow, 0);
    });

    it('should avoid other obvious loss', function() {
      const game = new Game(3);
      const storage = new MemorySequenceValueStorage(3);
      ['b3', 'b1', 'b2'].forEach(s => game.playFromHumanString(s, storage));
      let evaluator = new Evaluator(game, storage, black);
      evaluator.evaluateNextsSync(evaluator, game.clock.getTime() + 900);
      const nextHex = evaluator.chooseNext();
      assert.equal(nextHex.iCol, 2);
      assert.equal(nextHex.iRow, 0);
    });

    it('should evaluate a 3x3', function() {
      this.timeout(60_000);
      const game = new Game(3);
      const storage = new MemorySequenceValueStorage(3);
      let evaluator = new Evaluator(game, storage, white);
      evaluator.evaluateNextsSync(evaluator); //game.clock.getTime() + 900);
      const nexts = new Map();
      game.getPossibleNexts().map(
        move => {return {move, value:evaluator.getMoveValue(move)};}
      ).forEach(
        mv => nexts.set(mv.move.toString(), mv.value)
      );
      assert.equal(nexts.get('A1'), -11.9);
      assert.equal(nexts.get('A2'), 11.9);
      assert.equal(nexts.get('A3'), 11.9);
      assert.equal(nexts.get('B1'), -11.9);
      assert.equal(nexts.get('B2'), 11.9);
      assert.equal(nexts.get('B3'), -11.9);
      assert.equal(nexts.get('C1'), 11.9);
      assert.equal(nexts.get('C2'), 11.9);
      assert.equal(nexts.get('C3'), -11.9);
    });


    it('should evaluate a 3x3 in 1s', function() {
      const game = new Game(3);
      const storage = new MemorySequenceValueStorage(3);
      let evaluator = new Evaluator(game, storage, white);
      evaluator.evaluateNextsSync(evaluator, game.clock.getTime() + 900);
      const nexts = new Map();
      game.getPossibleNexts().map(
        move => {return {move, value:evaluator.getMoveValue(move)};}
      ).forEach(
        mv => nexts.set(mv.move.toString(), mv.value)
      );
      assert.equal(nexts.get('A1'), 0);
      assert.equal(nexts.get('A2'), 0);
      assert.equal(nexts.get('A3'), 0);
      assert.equal(nexts.get('B1'), 0);
      assert.equal(nexts.get('B2'), 0);
      assert.equal(nexts.get('B3'), 0);
      assert.equal(nexts.get('C1'), 0);
      assert.equal(nexts.get('C2'), 0);
      assert.equal(nexts.get('C3'), 0);
    });

    it('eval black', function() {
      const game = new Game(3);
      const storage = new MemorySequenceValueStorage(3);
      ['c3', 'c2', 'b2', 'b1', 'a1',]
      .forEach(s => game.playFromHumanString(s, storage));
      let evaluator = new Evaluator(game, storage, black);
      evaluator.evaluateNextsSync(evaluator);
      const nexts = new Map();
      game.getPossibleNexts().map(
        move => {return {move, value:evaluator.getMoveValue(move)};}
      ).forEach(
        mv => nexts.set(mv.move.toString(), mv.value)
      );
      assert.equal(nexts.get('A2'), 11.9);
      assert.equal(nexts.get('A3'), 11.9);
      assert.equal(nexts.get('B3'), 11.9);
      assert.equal(nexts.get('C1'), 11.9);
    });
  });
});

