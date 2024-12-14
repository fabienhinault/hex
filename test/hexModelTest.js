import { strict as assert } from 'assert';
import {Game, white, black} from '../src/model/hexModel.js';
import {Evaluator, MemorySequenceValueStorage} from '../src/model/evaluator.js';


describe('Hex', function () {
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
      assert.throws(() => game.play(0, 0), new Error("illegal move"));
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
      ['a1', 'c3',  'b2', 'a3',  'c1', 'b1',  'a2', 'c2'].forEach(s => game.playFromHumanString(s));
      assert.equal(game.toPositionString(), 'wbw/wwb/b1b');
      const reverseSequence = game.getReverseSequence();
      assert.equal(reverseSequence.length, 6);
      assert.equal(reverseSequence[0].toPositionString(), 'wbw/1w1/b1b')
      const winningChain = game.playFromHumanString('b3');
      assert.equal(game.toPositionString(), 'wbw/wwb/bwb');
      assert.equal('A1 C1 A2 B2 B3', winningChain.toString());
    });
  });
  
  describe('Evaluator', function() {
    it('should evaluate a winning game', function() {
      const storage = new MemorySequenceValueStorage();
      const game = new Game(3);
      ['a1', 'c3', 'b2', 'a3', 'c1', 'b1', 'a2', 'c2'].forEach(s => game.playFromHumanString(s, storage));
      const winningChain = game.playFromHumanString('b3', storage);
      assert.equal('A1 C1 A2 B2 B3', winningChain.toString());
      let evaluator = new Evaluator(game, storage, white);
      evaluator.evaluateAllSubsequences();
      assert.equal(storage.getValue('wbw/wwb/bwb'), 12);
      assert.equal(storage.getValue('wbw/wwb/b1b'), 12);
      assert.equal(storage.getValue('wbw/ww1/b1b'), 2);
    });
  });

});

